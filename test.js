import * as THREE from 'https://cdn.skypack.dev/three@0.131.3'
import { FlyControls } from 'https://cdn.skypack.dev/three@0.131.3/examples/jsm/controls/FlyControls.js';
import { VRButton } from 'https://cdn.skypack.dev/three@0.131.3/examples/jsm/webxr/VRButton';
import { SLObject } from './SLObject.js';
import { config } from './config.js';

(function () { var script = document.createElement('script'); script.onload = function () { var stats = new Stats(); stats.showPanel(0); document.body.appendChild(stats.dom); requestAnimationFrame(function loop() { stats.update(); requestAnimationFrame(loop) }); }; script.src = '//mrdoob.github.io/stats.js/build/stats.min.js'; document.head.appendChild(script); })()


const scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0.7, 1.6, -1.6);
camera.lookAt(0.7, 1.6, -2);


const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff); // background color
document.getElementById('threejs').appendChild(renderer.domElement);

document.body.appendChild(VRButton.createButton(renderer))
renderer.xr.enabled = true;


let controls = new FlyControls(camera, renderer.domElement);
controls.movementSpeed = 2.0;
controls.rollSpeed = 1.0;
controls.autoForward = false;
controls.dragToLook = true;

const clock = new THREE.Clock();


let currentSelectedObject = new SLObject([0.7, 1.6, -2], 'debug2D');;
scene.add(currentSelectedObject);

//

document.getElementById('datasets').addEventListener('change', function () {
    scene.remove(currentSelectedObject);
    currentSelectedObject = new SLObject([0.7, 1.6, -2], this.value);
    scene.add(currentSelectedObject);
    config.ENABLE_DEBUGGING_SPHERES = false;
    document.getElementById('debugtoggle').innerHTML = 'Set ' + true.toString();


});

document.getElementById('debugtoggle').addEventListener('click', function () {
    config.ENABLE_DEBUGGING_SPHERES = !config.ENABLE_DEBUGGING_SPHERES;
    document.getElementById('debugtoggle').innerHTML = 'Set ' + (!config.ENABLE_DEBUGGING_SPHERES).toString();
    if (config.ENABLE_DEBUGGING_SPHERES) {
        currentSelectedObject.setDebug();


    } else {
        currentSelectedObject.unsetDebug();
    }

});


// Make the WebGL rendering canvas responsive (i.e., always show full-screen, 
// also when the Web browser window is resized)
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();
});


function animate() {
    const delta = clock.getDelta();
    controls.update( delta );

    renderer.render(scene, camera);

    // OPTIONAL: Visualize camera movement path
    /* let sphere = new THREE.SphereBufferGeometry(0.01, 1, 1);
    let sphereMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    let sphereMesh = new THREE.Mesh(sphere, sphereMat);
    sphereMesh.position.set(camera.position.x, camera.position.y, camera.position.z); // 0.08622, -0.0716863, 0.0103883
    scene.add(sphereMesh); */
};

renderer.setAnimationLoop(animate);
