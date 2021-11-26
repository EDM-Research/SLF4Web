import * as THREE from 'https://cdn.skypack.dev/three@0.131.3'
import { parseFile as parsePosesFile } from "./poses_parser.js";
import { buildPerspProjMat, createLookAtMatrix, calcWorldPos } from './utils.js'
import { MP4Decoder } from "./decoder.js";
import { config } from './config.js';
import FormatterUrlDataset from './formatter_url_dataset.js';


import { AdvancedSegmentStrategy } from './segment_strategies/AdvancedSegmentStrategy.js';

const vertexShader = `
  varying vec2 vertexUV;
  varying vec3 worldPos;

  uniform mat4 modelMatrixPlane;

  void main() {
    vertexUV = uv;
    worldPos = (modelMatrixPlane * vec4(position, 1)).xyz;
    gl_Position = projectionMatrix * viewMatrix * modelMatrixPlane * vec4(position, 1);
  }
`
const fragmentShader = `
  uniform sampler2D planeTexture;
  uniform sampler2D maskTexture;
  uniform mat4 modelMatrixPlane;
  
  varying vec3 worldPos;
  varying vec2 vertexUV;

  uniform mat4 sourceMVP;

  void main() {

    vec4 projection = sourceMVP * vec4(worldPos.xyz, 1);

    projection /= projection.w;

    projection.x = (projection.x + 1.0) * 0.5;
    projection.y = (projection.y + 1.0) * 0.5; 
    
    if (projection.x < 0.0 || projection.x > 1.0 ||projection.y < 0.0 || projection.y > 1.0 ){
		gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
    else{
        float alpha = texture2D(maskTexture, vec2(projection.x, 1.0 - projection.y)).r;
        gl_FragColor =  vec4(texture2D(planeTexture, vec2(projection.x, 1.0 - projection.y)).xyz, alpha); 
    }
  }
`



const colors = {};
colors[1] = new THREE.Color(0x00ff00)
colors[2] = new THREE.Color(0xaaff00)
colors[3] = new THREE.Color(0xffff00)
colors[4] = new THREE.Color(0xff7700)
colors[5] = new THREE.Color(0xff0000)
const inCache = new THREE.Color(0x800080);

export class SLObject extends THREE.Group {
    constructor(position, dbName) {
        super();

        let geometry = new THREE.PlaneBufferGeometry(10, 10);
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext('2d')
        ctx.font = '20pt Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText("TEXTURE LOADING", canvas.width, canvas.height)

        let canvasMask = document.createElement("canvas");
        let ctxMask = canvasMask.getContext("2d");
        ctxMask.fillStyle = "white";
        ctxMask.fillRect(0, 0, canvasMask.width, canvasMask.height);


        let texture = new THREE.CanvasTexture(canvas);
        let maskTexture = new THREE.CanvasTexture(canvasMask);

        let material = new THREE.ShaderMaterial({
            uniforms: {
                planeTexture: {
                    value: texture
                },
                maskTexture: {
                    value: maskTexture
                },
                modelMatrixPlane: {
                    value: new THREE.Matrix4()
                },
                sourceMVP: {
                    value: new THREE.Matrix4()
                }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader
        });

        material.side = THREE.DoubleSide; // TODO : Why does this need to be DoubleSide?

        material.blending = THREE.CustomBlending;
        material.blendEquation = THREE.AddEquation;
        material.blendDst = THREE.OneMinusSrcAlphaFactor;
        material.blendSrc = THREE.SrcAlphaFactor;




        this.plane = new THREE.Mesh(geometry, material);
        this.plane.frustumCulled = false;
        this.plane.onBeforeRender = (renderer, scene, cameraIn, geometry, materialIn, group) => {
            let camX = cameraIn.position.x
            let camY = cameraIn.position.y
            let camZ = cameraIn.position.z
            if (renderer.xr.isPresenting) {
                camX += cameraIn.matrix.elements[12];
                camY += cameraIn.matrix.elements[13];
                camZ += cameraIn.matrix.elements[14];
            }
            let cameraPosition = new THREE.Vector3(camX, camY, camZ);
            this.handlePlaneRendering(cameraPosition, materialIn);
        };
        this.add(this.plane);

        this.segmentStrategy;
        this.mp4decoder = new MP4Decoder(dbName);

        this.physicalCameraCors = [];
        this.projectionMatrix = new THREE.Matrix4();

        this.debuggingSphereFlag = false;

        this.materialPlane = material;
        this.geometryPlane = geometry;
        this.texturePlane = texture;
        this.textureMask = maskTexture;

        this.lfsCenterArray = position;
        this.lfsCenter = new THREE.Vector3(position[0], position[1], position[2]);
        this.lfsOffset;
        this.lfsOffsetArray;

        this.yellowSphere;
        this.blueSphere;
        this.debugSpheres = {};


        this.prevClosestPos;
        this.closestPos;
        this.textFile;
        this.datasetName = dbName;


        // Manifest Data
        this.maxFrame;
        this.segmentAmount;
        this.totalFrames;

        Promise.all([
            fetch(FormatterUrlDataset.getUrlManifestJson(dbName)).then(
                respManifest => respManifest.json()
            ),
            fetch(FormatterUrlDataset.getUrlDashMpd(dbName)).then(
                respMpd => respMpd.text()
            ),
            fetch(FormatterUrlDataset.getUrlPosesFile(dbName)).then(
                respPoses => respPoses.text()
            )
        ])
        .then(([jsonManifest, strMpd, strPoses]) => {
            // Process manifest.json metadata
            this.fillInFromManifest(jsonManifest);
            this.mp4decoder.setMaxFrames(jsonManifest.frameRate * jsonManifest.segmentLength);
            this.createProjectionMatrix(jsonManifest);

            // Process poses.txt metadata
            // FIXME: TODO: Introduce more descriptive name for this.textFile
            this.textFile = parsePosesFile(strPoses, this.lfsCenterArray);
            this.setPhysCameraCors();
            
            // FIXME: TODO: Needs to be made configurable?
            this.segmentStrategy = new AdvancedSegmentStrategy(
                this.physicalCameraCors, 
                jsonManifest, 
                this.mp4decoder, 
                strMpd, 
                dbName
            );
            this.segmentStrategy.getSegmentsIdle();

            if (config.ENABLE_DEBUGGING_SPHERES) {
                this.setDebug()
            }
        })
        .catch((err) => {
            console.log(err);
        });
    }

    fillInFromManifest(manifestJSON) {
        this.maxFrame = manifestJSON.frameRate * manifestJSON.segmentLength;
        this.segmentAmount = manifestJSON.segmentAmount;
        this.sphereRotation = manifestJSON.rotation;
        this.totalFrames = manifestJSON.totalFrames;

        this.lfsOffsetArray = manifestJSON.lfs;
        this.lfsOffset = new THREE.Vector3(this.lfsOffsetArray[0], this.lfsOffsetArray[1], this.lfsOffsetArray[2]);


    }

    createProjectionMatrix(json) {
        let perspectiveMatrix = buildPerspProjMat(window.innerWidth, window.innerHeight,
            json.perspective[0],
            json.perspective[1],
            json.perspective[2],
            json.perspective[3],
            0.001, 10000);
        this.projectionMatrix = new THREE.Matrix4();
        let flattenedPerspectiveMatrix = [...perspectiveMatrix[0], ...perspectiveMatrix[1], ...perspectiveMatrix[2], ...perspectiveMatrix[3]]
        this.projectionMatrix.set(
            flattenedPerspectiveMatrix[0], flattenedPerspectiveMatrix[1], flattenedPerspectiveMatrix[2], flattenedPerspectiveMatrix[3],
            flattenedPerspectiveMatrix[4], flattenedPerspectiveMatrix[5], flattenedPerspectiveMatrix[6], flattenedPerspectiveMatrix[7],
            flattenedPerspectiveMatrix[8], flattenedPerspectiveMatrix[9], flattenedPerspectiveMatrix[10], flattenedPerspectiveMatrix[11],
            flattenedPerspectiveMatrix[12], flattenedPerspectiveMatrix[13], flattenedPerspectiveMatrix[14], flattenedPerspectiveMatrix[15]);
    }

    setPhysCameraCors() {

        let LFS = this.lfsCenter.add(this.lfsOffset);

        for (let i = 0; i < this.textFile.length; ++i) {


            let rotX = new THREE.Matrix4().makeRotationX(this.sphereRotation[0]);
            let rotY = new THREE.Matrix4().makeRotationY(this.sphereRotation[1]);
            let rotZ = new THREE.Matrix4().makeRotationZ(this.sphereRotation[2]);

            this.textFile[i].multiply(rotX);
            this.textFile[i].multiply(rotY);
            this.textFile[i].multiply(rotZ);

            let trans = new THREE.Matrix4().makeTranslation(-this.lfsCenterArray[0], -this.lfsCenterArray[1], -this.lfsCenterArray[2]);
            this.textFile[i].multiply(trans);

            let cameraWorldPos = calcWorldPos(this.textFile[i]);

            let cameraVector3 = new THREE.Vector3().fromArray([cameraWorldPos.elements[0], cameraWorldPos.elements[1], cameraWorldPos.elements[2]]);

            let distanceLFS2Camera = LFS.distanceTo(cameraVector3);

            let normalizedCameraVector3 = new THREE.Vector3().lerpVectors(LFS, cameraVector3, config.NORMALIZE_DISTANCE / distanceLFS2Camera)

            let newArray = normalizedCameraVector3.toArray();

            this.physicalCameraCors.push(newArray);

        }
    }


    handlePlaneRendering(cameraPosition, material) {

        let ogPosition = cameraPosition.clone();
        cameraPosition.x -= this.lfsCenter.x;
        cameraPosition.y -= this.lfsCenter.y;
        cameraPosition.z -= this.lfsCenter.z;

        let lookAtMatrixPlane = createLookAtMatrix(new THREE.Vector3(0, 0, 0), cameraPosition, new THREE.Vector3(0, 1, 0));
        let translationMatrix = new THREE.Matrix4().makeTranslation(this.lfsCenter.x, this.lfsCenter.y, this.lfsCenter.z);
        lookAtMatrixPlane.premultiply(translationMatrix);

        if (this.segmentStrategy) {
            let lfsCenter = [...this.lfsCenterArray];
            lfsCenter[0] += this.lfsOffsetArray[0];
            lfsCenter[1] += this.lfsOffsetArray[1];
            lfsCenter[2] += this.lfsOffsetArray[2];

            this.closestPos = this.segmentStrategy.getSegment([cameraPosition.x, cameraPosition.y, cameraPosition.z],
                lfsCenter, this.datasetName);

            if (this.closestPos.toString() in this.mp4decoder.getDecodedFrames() && this.closestPos != this.prevClosestPos) {
                this.setTexture(this.mp4decoder.getDecodedFrames()[this.closestPos.toString()]);
                material.uniforms.planeTexture.value = this.texturePlane;
                material.uniforms.planeTexture.value.needsUpdate = true;

                if ((this.closestPos + this.totalFrames).toString() in this.mp4decoder.getDecodedFrames()) {
                    this.setMask(this.mp4decoder.getDecodedFrames()[(this.closestPos + this.totalFrames).toString()]);
                    material.uniforms.maskTexture.value = this.textureMask;
                    material.uniforms.maskTexture.value.needsUpdate = true;
                }

            }


            this.prevClosestPos = this.closestPos;
            material.uniforms.sourceMVP.value = new THREE.Matrix4().multiplyMatrices(this.projectionMatrix, this.textFile[this.closestPos]); // transformat
            material.uniforms.sourceMVP.value.needsUpdate = true;
        }

        material.uniforms.modelMatrixPlane.value = lookAtMatrixPlane;
        material.uniforms.modelMatrixPlane.value.needsUpdate = true;

        if (config.ENABLE_DEBUGGING_SPHERES) {
            this.updateDebugSpheres(ogPosition, this.closestPos);
        }
    }

    updateDebugSpheres(cameraPosition, closestPos) {
        this.remove(this.yellowSphere);
        this.remove(this.blueSphere);

        let geometryCamera2CenterSphere = new THREE.SphereBufferGeometry(0.006, 2, 2);
        let materialYellow = new THREE.MeshBasicMaterial({ color: 0xffff00 });

        let geometryPhysicalCameraSphere = new THREE.SphereBufferGeometry(0.006, 2, 2);
        let materialBlue = new THREE.MeshBasicMaterial({ color: 0x116CAB });

        this.yellowSphere = new THREE.Mesh(geometryCamera2CenterSphere, materialYellow);
        this.blueSphere = new THREE.Mesh(geometryPhysicalCameraSphere, materialBlue);

        this.add(this.yellowSphere);
        this.add(this.blueSphere);


        this.blueSphere.position.set(this.physicalCameraCors[closestPos][0], this.physicalCameraCors[closestPos][1], this.physicalCameraCors[closestPos][2]);

        let center = new THREE.Vector3().fromArray(this.lfsCenterArray);
        let offset = new THREE.Vector3().fromArray(this.lfsOffsetArray);

        let newVector = new THREE.Vector3().addVectors(center, offset);
        let distanceCenter2Camera = newVector.distanceTo(cameraPosition);

        let newPoint = new THREE.Vector3().lerpVectors(newVector, cameraPosition, config.NORMALIZE_DISTANCE / distanceCenter2Camera)

        this.yellowSphere.position.set(newPoint.x, newPoint.y, newPoint.z); // 0.08622, -0.0716863, 0.0103883
        // Cache spheres

        let decodedFrames = this.segmentStrategy.getCurrentlyInBuffer();

        let validSpheres = []

        for (let segment of decodedFrames) {
            for (let i = (segment * this.maxFrame) - this.maxFrame; i < segment * this.maxFrame; ++i) {
                if (!(i > this.totalFrames)) {
                    validSpheres.push(i);
                }
            }
        }
    
        for (let index of Object.keys(this.debugSpheres)) {
            if (validSpheres.includes(parseInt(index))) {
                this.debugSpheres[index].material.color = inCache;
                this.debugSpheres[index].material.needsUpdate = true;
            } else {
                this.debugSpheres[index].material.color = new THREE.Color(0x808080);
                this.debugSpheres[index].material.needsUpdate = true;
            }
        }
    }

    setTexture(bitmap) {
        this.texturePlane.dispose();
        this.texturePlane = new THREE.CanvasTexture(bitmap);


        this.texturePlane.wrapS = THREE.ClampToEdgeWrapping;
        //this.texturePlane.minFilter = THREE.LinearMipmapLinearFilter; // LinearFilter;
    }

    setMask(bitmap) {
        this.textureMask.dispose();
        this.textureMask = new THREE.CanvasTexture(bitmap);


        this.textureMask.wrapS = THREE.ClampToEdgeWrapping;
        //this.textureMask.minFilter = THREE.LinearMipmapLinearFilter; // LinearFilter;
    }


    setDebuggingSpheres() {

        for (let index = 0; index < this.physicalCameraCors.length; ++index) {

            let geometrySphere = new THREE.SphereBufferGeometry(0.006, 2, 2);
            let materialSphere = new THREE.MeshBasicMaterial({ color: 0x808080 });
            let sphere = new THREE.Mesh(geometrySphere, materialSphere);
            sphere.position.set(this.physicalCameraCors[index][0], this.physicalCameraCors[index][1], this.physicalCameraCors[index][2]);

            this.add(sphere);
            this.debugSpheres[index] = sphere;
        }
    }

    handleSphereInBuffer(indexIn, value) {

        if (indexIn[1] == 0) {
            return;
        }

        let validSpheres = []
        for (let i = (indexIn[1] * this.maxFrame) - this.maxFrame; i < indexIn[1] * this.maxFrame; ++i) {
            if (!(i > this.totalFrames)) {
                validSpheres.push(i);
            }
        }

        for (let index of validSpheres) {
            this.debugSpheres[index].material.color = colors[value];
            this.debugSpheres[index].material.needsUpdate = true;
        }
    }

    setDebug() {
        this.setDebuggingSpheres();
        // this.segmentStrategy.setDexieCallback((key, value) => this.handleSphereInBuffer(key, value));
        this.segmentStrategy.setFetchCallback((key, value) => this.handleSphereFetch(key, value))
    }
    unsetDebug() {
        for (let index of Object.keys(this.debugSpheres)) {
            this.remove(this.debugSpheres[index]);
            delete this.debugSpheres[index];
        }
        
        this.remove(this.yellowSphere);
        this.remove(this.blueSphere);
        // this.segmentStrategy.removeCache();
        this.segmentStrategy.setDexieCallback((key, value) => { });
    }

    handleSphereFetch(segment, qualityId){
        if (segment == 0) {
            return;
        }

        let validSpheres = []
        for (let i = (segment * this.maxFrame) - this.maxFrame; i < segment * this.maxFrame; ++i) {
            if (!(i > this.totalFrames)) {
                validSpheres.push(i);
            }
        }

        for (let index of validSpheres) {
            this.debugSpheres[index].material.color = colors[qualityId];
            this.debugSpheres[index].material.needsUpdate = true;
        }
    }

}

