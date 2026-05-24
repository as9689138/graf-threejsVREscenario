import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// REGLA DE ORO: OrbitControls.enabled = false SOLO desactiva el INPUT.
// controls.update() SIEMPRE reposiciona la cámara, ignorando "enabled".
// Por eso en modo 1 y en cinemáticas NUNCA llamamos controls.update().
// Solo lo llamamos en modo 2 (órbita libre), donde ES lo que queremos.
// ─────────────────────────────────────────────────────────────────────────────

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

  // ═══════════════════════════════════════════════════════════════════════════
  // CÁMARA 1 — Anclaje rígido a la espalda del jugador con LÍMITES FÍSICOS
  // ═══════════════════════════════════════════════════════════════════════════
  if (cameraMode === 1) {

    if (controls) controls.enabled = false;

    const dx = enemy.model.position.x - player.model.position.x;
    const dz = enemy.model.position.z - player.model.position.z;
    const dir = new THREE.Vector3(dx, 0, dz).normalize();

    const midPoint = new THREE.Vector3()
      .addVectors(player.model.position, enemy.model.position)
      .multiplyScalar(0.5);

    // Calculamos la posición ideal
    idealPos
      .copy(player.model.position)
      .addScaledVector(dir, -camDistMode1)
      .add(new THREE.Vector3(0, cameraConfig.camHeightMode1, 0));

    // 🛡️ NUEVO: MUROS INVISIBLES PARA NO ATRAVESAR LA ESTRUCTURA 🛡️
    
    // 1. Evitar que suba y atraviese las luces/techo (Ajusta este 200 si necesitas que baje más)
    idealPos.y = Math.min(idealPos.y, 250); 

    // 2. Evitar que se haga muy hacia atrás y atraviese postes o gradas
    // Sabiendo que el ring llega aprox a +/- 250, limitamos la cámara a 320
    idealPos.x = THREE.MathUtils.clamp(idealPos.x, -320, 320);
    idealPos.z = THREE.MathUtils.clamp(idealPos.z, -320, 320);

    // Asignación rígida
    camera.position.copy(idealPos);

    // LookAt rígido
    idealLookAt.copy(midPoint).add(new THREE.Vector3(0, 40, 0));
    currentLookAt.copy(idealLookAt);
    camera.lookAt(currentLookAt);

    if (controls) {
      controls.target.copy(currentLookAt);

      // SINCRONIZAR ORBITCONTROLS COMPLETAMENTE
      controls.object.position.copy(camera.position);

      controls.update();
    }

  // ═══════════════════════════════════════════════════════════════════════════
  // CÁMARA 2 — Órbita libre con OrbitControls
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (cameraMode === 2) {

    if (controls) controls.enabled = true;

    const midPoint = new THREE.Vector3()
      .addVectors(player.model.position, enemy.model.position)
      .multiplyScalar(0.5);

    midPoint.y = 90;

    controls.target.lerp(midPoint, 0.1);
    controls.update();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ZOOM (solo activo en modo 1)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// CÁMARA CINEMÁTICA DE ENTRADA ÉPICA
// ─────────────────────────────────────────────────────────────────────────────
export function updateCinematicCamera({camera, controls, timeElapsed, phase, player, enemy}) {
  if (!player.model || !enemy.model) return;

  if (phase === 1) {
    const radius = 550;
    const speed = 0.3;
    camera.position.set(
      Math.cos(timeElapsed * speed) * radius,
      280,
      Math.sin(timeElapsed * speed) * radius
    );
    camera.lookAt(0, 80, 0);

    if (controls) {
      controls.target.set(0, 80, 0);

      controls.object.position.copy(camera.position);

      controls.update();
    }

  } else if (phase === 2) {
    const clampedY = Math.min(80 + timeElapsed * 20, 150);
    camera.position.set(-150, clampedY, -150);
    camera.lookAt(-250, clampedY + 10, -250);
    if (controls) {
      controls.target.set(-250, clampedY + 10, -250);

      controls.object.position.copy(camera.position);

      controls.update();
    }

  } else if (phase === 3) {
    const clampedY = Math.min(80 + timeElapsed * 20, 150);
    camera.position.set(150, clampedY, 150);
    camera.lookAt(250, clampedY + 10, 250);
    if (controls) {
      controls.target.set(250, clampedY + 10, 250);

      controls.object.position.copy(camera.position);

      controls.update();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁMARA DRON DE VICTORIA
// ─────────────────────────────────────────────────────────────────────────────
export function updateVictoryCamera({camera, controls, timeElapsed, winner}) {
  if (!winner || !winner.model) return;

  const radius = 250;
  const speed  = 0.4;

  const wx = winner.model.position.x;
  const wy = winner.model.position.y; 
  const wz = winner.model.position.z;

  const faceY = wy + 110;

  camera.position.set(
    wx + Math.cos(timeElapsed * speed) * radius,
    faceY + 20,   
    wz + Math.sin(timeElapsed * speed) * radius
  );

  camera.lookAt(wx, faceY, wz);
  if (controls) {
    controls.target.set(wx, faceY, wz);

    controls.object.position.copy(camera.position);

    controls.update();
  }
}