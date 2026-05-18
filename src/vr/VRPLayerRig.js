import * as THREE from "three";

export function createVRPlayerRig({ camera, scene }) {
  const rig = new THREE.Group();

  rig.position.set(0, 40, 220);

  rig.add(camera);
  scene.add(rig);

  function enterVRPose() {
    camera.position.set(0, 1.6, 0);
    camera.rotation.set(0, 0, 0);
  }

  function exitVRPose() {
    camera.position.set(0, 350, 500);
    camera.rotation.set(0, 0, 0);
  }

  return {
    rig,
    enterVRPose,
    exitVRPose
  };
}