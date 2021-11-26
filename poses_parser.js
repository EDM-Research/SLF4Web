import * as THREE from 'https://cdn.skypack.dev/three@0.131.3'



function parseFile(textFile, lfs){
    let posesMatrix4Array = []
    textFile = textFile.replace(/\r?\n|\r/g, "\n");
    
    let newTextFile = textFile.split('\n')
   
    for(let i = 1; i < newTextFile.length - 1; i+=4){
        let elements = newTextFile[i] + ' ' + newTextFile[i+1] + ' ' + newTextFile[i+2]  + ' ' + newTextFile[i+3];
        
        elements = elements.replace(/\s+/g, ' ');
        elements = elements.trim();
        let pv = elements.split(' ');
        
        for(let j = 0; j < pv.length; ++j){
            pv[j] = parseFloat(pv[j])
        }

        let poseMatrix4 = new THREE.Matrix4()
        
        poseMatrix4.set(pv[0], pv[1], pv[2], pv[3], pv[4], pv[5], pv[6], pv[7], pv[8], pv[9], pv[10], pv[11], pv[12], pv[13], pv[14], pv[15]);
        
        // OpenCV to WebGL
        let identityMatrix = new THREE.Matrix4();
        // identityMatrix.elements[5] = -1;
        // identityMatrix.elements[10] = -1;

        let resultMatrix = new THREE.Matrix4().multiplyMatrices(identityMatrix, poseMatrix4);
   
        // post mvm rot trans 3d;

        let axis = new THREE.Vector3(1, 0, 0);
        let angle = Math.PI / 2;
        
        let rot = new THREE.Matrix4().makeRotationAxis(axis, angle);
        
       
        
        // console.log(resultMatrix);
        // resultMatrix.multiply(rot);
       

        posesMatrix4Array.push(resultMatrix);
    }

    
    return posesMatrix4Array;
}

export { parseFile };


  



