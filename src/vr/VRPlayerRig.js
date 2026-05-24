import * as THREE from "three";

export function createVRPlayerRig({ camera, scene }) {
  const rig = new THREE.Group();

  rig.position.set(0, 40, 220);

  scene.add(rig);

  function enterVRPose() {

    // Meter cámara al rig VR SOLO en VR
    rig.add(camera);

    camera.position.set(0, 1.6, 0);
    camera.rotation.set(0, 0, 0);
  }

  function exitVRPose() {

    // Sacar cámara del rig VR
    scene.add(camera);

    camera.position.set(0, 350, 500);

    camera.rotation.set(0, 0, 0);
    camera.quaternion.identity();

    camera.updateMatrixWorld(true);
  }

  return {
    rig,
    enterVRPose,
    exitVRPose
  };
}