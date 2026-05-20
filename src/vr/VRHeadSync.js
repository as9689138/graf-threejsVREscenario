import * as THREE from "three";

const headWorldPosition = new THREE.Vector3();
const cameraWorldPosition = new THREE.Vector3();
const desiredEyePosition = new THREE.Vector3();
const correction = new THREE.Vector3();
const forwardOffset = new THREE.Vector3();

export function findHeadBone(model) {
  let headBone = null;

  model.traverse((child) => {
    if (child.isBone && child.name.toLowerCase().includes("head")) {
      headBone = child;
    }
  });

  return headBone;
}

export function syncVRRigToPlayerHead({
  vrPlayerRig,
  headBone,
  player,
  camera
}) {
  if (!vrPlayerRig || !vrPlayerRig.rig || !headBone || !player.model || !camera) return;

  // Posición real del hueso de la cabeza
  headBone.getWorldPosition(headWorldPosition);

  // Posición real actual de la cámara XR
  camera.getWorldPosition(cameraWorldPosition);

  // Ajuste hacia la zona de ojos.
  // IMPORTANTE: tus modelos usan unidades grandes, no metros.
  forwardOffset.set(0, 0, 1).applyQuaternion(player.model.quaternion);

  desiredEyePosition
    .copy(headWorldPosition)
    .addScaledVector(forwardOffset, 2) // adelante de la cabeza
    .add(new THREE.Vector3(0, -30, 0)); // bajar hacia los ojos

  // Diferencia entre donde está la cámara y donde queremos que esté
  correction.subVectors(desiredEyePosition, cameraWorldPosition);

  // Movemos el rig por esa diferencia
  vrPlayerRig.rig.position.add(correction);

  // Igualar orientación horizontal del rig al jugador
  vrPlayerRig.rig.rotation.y = player.model.rotation.y + Math.PI;
}