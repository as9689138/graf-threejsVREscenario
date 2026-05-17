import * as THREE from "three";

export function createVRPlayerRig({
  camera,
  scene
}) {
  const rig = new THREE.Group();

  rig.position.set(0, 0, 0);

  rig.add(camera);

  scene.add(rig);

  return {
    rig
  };
}