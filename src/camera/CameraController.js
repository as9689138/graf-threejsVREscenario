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

export function updateCinematicCamera({ camera, timeElapsed, phase, player, enemy }) {
  if (!player.model || !enemy.model) return;

  if (phase === 1) {
    // Vista Dron: Gira alrededor del centro de forma majestuosa
    const radius = 550;
    const speed = 0.3; 
    camera.position.set(Math.cos(timeElapsed * speed) * radius, 280, Math.sin(timeElapsed * speed) * radius);
    camera.lookAt(0, 40, 0); 

  } else if (phase === 2) {
    // Paneo Jugador (Esquina Azul: -250, -250)
    const startY = 10;
    const currentY = startY + (timeElapsed * 20); // Sube la mirada poco a poco
    const clampedY = Math.min(currentY, 150); 
    camera.position.set(-140, clampedY - 10, -140);
    camera.lookAt(-250, clampedY, -250);

  } else if (phase === 3) {
    // Paneo Enemigo (Esquina Roja: 250, 250)
    const startY = 10;
    const currentY = startY + (timeElapsed * 20);
    const clampedY = Math.min(currentY, 150);
    camera.position.set(140, clampedY - 10, 140);
    camera.lookAt(250, clampedY, 250);
  }
  // (La Fase 4 usa la cámara de combate normal para hacer la transición suave hacia la espalda del jugador)
}