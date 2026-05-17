import * as THREE from "three";

export function updateCamera({
  player,
  enemy,
  camera,
  controls,
  cameraMode,
  camDistMode1,
  cameraConfig,
  idealLookAt,
  idealPos,
  currentLookAt
}) {
  if (!player.model || !enemy.model) return;

  if (cameraMode === 1) {
    const dx = enemy.model.position.x - player.model.position.x;
    const dz = enemy.model.position.z - player.model.position.z;
    const dir = new THREE.Vector3(dx, 0, dz).normalize();

    const midPoint = new THREE.Vector3()
      .addVectors(player.model.position, enemy.model.position)
      .multiplyScalar(0.5);

    idealPos
      .copy(player.model.position)
      .addScaledVector(dir, -camDistMode1)
      .add(new THREE.Vector3(0, cameraConfig.camHeightMode1, 0));

    camera.position.lerp(idealPos, 0.1);

    idealLookAt.copy(midPoint).add(new THREE.Vector3(0, 40, 0));
    currentLookAt.lerp(idealLookAt, 0.1);
    camera.lookAt(currentLookAt);

  } else if (cameraMode === 2) {
    const midPoint = new THREE.Vector3()
      .addVectors(player.model.position, enemy.model.position)
      .multiplyScalar(0.5);

    midPoint.y = 90;

    controls.target.lerp(midPoint, 0.1);
    controls.update();
  }
}

export function handleCameraZoom({
  event,
  cameraMode,
  camDistMode1,
  cameraConfig
}) {
  if (cameraMode !== 1) return camDistMode1;

  const nextDistance = camDistMode1 + event.deltaY * 0.1;

  return THREE.MathUtils.clamp(
    nextDistance,
    cameraConfig.minCamDist1,
    cameraConfig.maxCamDist1
  );
}