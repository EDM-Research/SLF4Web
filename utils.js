import * as THREE from 'https://cdn.skypack.dev/three@0.131.3'


export function buildPerspProjMat(width, height, fx, fy, cx, cy, znear, zfar){
    let m = createXIdentityMatrix(4);
    m[0][0] = 2 * fx / width;
    m[0][1] = 0;
    m[0][2] = 1- (2 * cx / width);
    m[0][3] = 0;

    m[1][0] = 0;
    m[1][1] = 2 * fy / height;
    m[1][2] = -1 + (2 * cy / height);
    m[1][3] = 0;

    m[2][0] = 0;
    m[2][1] = 0;
    m[2][2] = (zfar + znear) / (znear - zfar);
    m[2][3] = 2 * zfar * znear / (znear - zfar);

    m[3][0] = 0;
    m[3][1] = 0;
    m[3][2] = -1;
    m[3][3] = 0;

    return m;

}

export function OpenCVtoOpenGL(pose){
    let transfer = createXIdentityMatrix(4);
    transfer[1][1] = -1;
    transfer[2][2] = -1;

    return multiplyMatrices(transfer, pose);
}

function createXIdentityMatrix(dimension){
    let matrix = [];
    for(let i=0; i < dimension; ++i){
        matrix[i] = new Array(dimension);
        for(let k=0; k< dimension; ++k){
            matrix[i][k] = 0;
        }
        matrix[i][i] = 1;
    }
    return matrix;
}

function multiplyMatrices(m1, m2) {
    
    let result = [];
    for (let  i = 0; i < m1.length; i++) {
        result[i] = [];
        for (let  j = 0; j < m2[0].length; j++) {
            let  sum = 0;
            for (let  k = 0; k < m1[0].length; k++) {
                sum += m1[i][k] * m2[k][j];
            }
            result[i][j] = sum;
        }
    }
    
    return result;
}

export function createLookAtMatrix(eye, target, up){
    // console.table(eye);
    // console.table(target);
    // console.table(up);

    let zaxis = new THREE.Vector3().subVectors(eye, target).normalize();
    let xaxis = new THREE.Vector3().crossVectors(up, zaxis).normalize();
    let yaxis = new THREE.Vector3().crossVectors(zaxis, xaxis);

    let dotXAxisEye = xaxis.dot(eye);
    let dotYAxisEye = yaxis.dot(eye);
    let dotZAxisEye = zaxis.dot(eye);

    let result = new THREE.Matrix4();

    result.set( xaxis.x, yaxis.x, zaxis.x, 0, 
                xaxis.y, yaxis.y, zaxis.y, 0,
                xaxis.z, yaxis.z, zaxis.z, 0,
                -dotXAxisEye, -dotYAxisEye, -dotZAxisEye, 1);

    return result;
}


export function calcWorldPos(pose){
    let t = new THREE.Matrix3();
    let temp = pose.elements;
    t.set(temp[12],0,0, temp[13],0,0, temp[14],0,0);

    let R = new THREE.Matrix3().setFromMatrix4(pose).multiplyScalar(-1.0); 
    

    let worldPos = R.transpose().multiply(t);
    return worldPos;
}

export function findClosestPos(pos, dict, lfsCenter){
    
    let currentClosest = 0;
    let currentClosestAngle;

    let x = pos[0];
    let y = pos[1];
    let z = pos[2];

    let currPos = new THREE.Vector3(x,y,z);

    for(let i = 0; i < dict.length; ++i){
        
        let angle = currPos.angleTo(new THREE.Vector3(dict[i][0] - lfsCenter[0], dict[i][1] - lfsCenter[1], dict[i][2] - lfsCenter[2]));
        
        if(i == 0){
            currentClosestAngle = angle;
        } else{
            if (angle < currentClosestAngle){
                
                currentClosestAngle = angle;
                currentClosest = i;
            }
        }
    }
    
    return currentClosest;
}


// A lot of improvement possible.
// export function find9ClosestSegments(dictIndex, dict){
//     let currPos = new THREE.Vector3(dict[dictIndex][0], dict[dictIndex][1], dict[dictIndex][2])

//     let result = {};
    
//     for(let i = 0; i < dict.length; i += videoConfig.MAX_FRAME){
//         let angle = currPos.angleTo(new THREE.Vector3(dict[i][0], dict[i][1], dict[i][2]));
        
//         if(Object.keys(result).length < 9){
//             result[i] = angle;
//         } else{
//             let largestInDict;
            
//             for(let j of Object.keys(result)){
//                 if (!largestInDict){
//                     largestInDict = j;
//                 }
//             }
//             if(angle < result[largestInDict]){
//                 delete result[largestInDict];
//                 result[i] = angle;
//             }

//         }
//     }
    
//     let toReturn = Object.keys(result);
//     for(let i = 0; i < toReturn.length; ++i){
//         toReturn[i] = Math.floor( parseInt(toReturn[i]) / videoConfig.MAX_FRAME) + 1;
//     }
//     return toReturn;




// }





