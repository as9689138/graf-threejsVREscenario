import * as THREE from "three";

let flashTimer = Math.random() * 2.5;
let flashIntensity = 0;

export function updateGameLoop({
  clock,
  player,
  enemy,
  gameStarted,
  renderer,
  scene,
  camera,
  stats,

  // ── Pausa ──────────────────────────────────────────
  isPaused      = false,   // true → congelar toda la lógica
  onPauseUpdate = null,    // (delta) => void  — actualizar VRInput de pausa
  // ───────────────────────────────────────────────────

  // Ambiente / postprocesado
  flashParticles,
  composer,

  // VR
  vrPlayerRig,
  playerHeadBone,
  syncVRRigToPlayerHead,
  vrButtonMapper,
  updateVRLocomotion,
  playVRMovementAnimation,

  // Configuración
  ringConfig,
  punchTypes,
  audioManager,

  // Sistemas
  updateFacing,
  updateStepMovement,
  resolveBodyCollisions,
  checkHits,
  triggerHitReaction,
  switchAction,
  updateAI,
  updateCamera,

  // Acciones
  playBoxAction,
  startCharacterStepMovement,
  startEnemyCombo,
  enemyPunches,
  playNextComboAction,
  playFightIdle,

  // Cámara
  controls,
  cameraMode,
  camDistMode1,
  cameraConfig,
  idealLookAt,
  idealPos,
  currentLookAt,

  // Estado del juego
  gameState,

  // KO
  onKnockout,

  updateCinematicCamera,
  cinematicState,
  updateVictoryCamera,
  victoryState
}) {
  const delta = clock.getDelta();

  // ══════════════════════════════════════════════════════════════════════════
  // PAUSA — actualizar siempre el controlador VR (detecta botón de pausa),
  //         luego congelar toda la lógica del juego y sólo renderizar.
  // ══════════════════════════════════════════════════════════════════════════
  if (onPauseUpdate) onPauseUpdate(delta);

  if (isPaused) {
    renderFrame({ renderer, scene, camera, composer });
    stats.update();
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FLASHES / AMBIENTE
  // ══════════════════════════════════════════════════════════════════════════
  if (flashParticles) {
    flashTimer -= delta;
    flashParticles.material.uniforms.time.value += 0.02;

    const baseOpacity = Math.sin(performance.now() * 0.002) * 0.5 + 0.5;

    if (flashTimer <= 0) {
      flashIntensity = 0.6 + Math.random() * 0.8;
      flashTimer = 0.5 + Math.random() * 0.2;
    }

    flashIntensity *= 0.96;

    let finalOpacity = Math.min(baseOpacity + flashIntensity, 1.5);
    flashParticles.material.uniforms.uOpacity.value = finalOpacity;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MIXERS DE ANIMACIÓN
  // ══════════════════════════════════════════════════════════════════════════
  if (player.mixer) player.mixer.update(delta);
  if (enemy.mixer)  enemy.mixer.update(delta);

  // =================================================
  // LIMITAR PERSONAJES DENTRO DEL RING DURANTE KO
  // =================================================
  const ringLimit = 304;

  [player, enemy].forEach((fighter) => {
    if (!fighter.model) return;

    fighter.model.position.x = THREE.MathUtils.clamp(
      fighter.model.position.x,
      -ringLimit,
      ringLimit
    );

    fighter.model.position.z = THREE.MathUtils.clamp(
      fighter.model.position.z,
      -ringLimit,
      ringLimit
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // INPUT Y LOCOMOCIÓN VR
  // ══════════════════════════════════════════════════════════════════════════
  if (gameState === "FIGHTING") {
    if (renderer.xr.isPresenting && vrButtonMapper) {
      vrButtonMapper.update();
    }

    if (renderer.xr.isPresenting && updateVRLocomotion) {
      updateVRLocomotion({
        renderer,
        player,
        delta,
        ringConfig,
        playVRMovementAnimation,
        playFightIdle
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ESTADO: CINEMATIC (entrada épica)
  // ══════════════════════════════════════════════════════════════════════════
  if (gameState === "CINEMATIC") {
    cinematicState.time += delta;
    updateFacing(player, enemy);

    if (renderer.xr.isPresenting) {
      // — Poses VR por fase —
      if (cinematicState.phase === 1) {
        const currentMove = Math.min(cinematicState.time * 25, 240);
        vrPlayerRig.rig.position.set(0, 60 + currentMove, 20 + currentMove);

      } else if (cinematicState.phase === 2) {
        const currentY = Math.min(50 + cinematicState.time * 25, 155);
        vrPlayerRig.rig.position.set(-180, currentY, -180);

      } else if (cinematicState.phase === 3) {
        const currentY = Math.min(50 + cinematicState.time * 25, 155);
        vrPlayerRig.rig.position.set(180, currentY, 180);

      } else if (cinematicState.phase === 4) {
        syncVRRigToPlayerHead({ vrPlayerRig, headBone: playerHeadBone, player, camera });
      }

    } else {
      // — Cámara PC —
      if (cinematicState.phase === 4) {
        // En fase 4 volvemos a la cámara de combate normal
        updateCamera({
          player, enemy, camera, controls, cameraMode,
          camDistMode1, cameraConfig, idealLookAt, idealPos, currentLookAt
        });
      } else {
        // Fases 1-3: cinemáticas manuales 
        updateCinematicCamera({
          camera,
          controls,
          timeElapsed: cinematicState.time,
          phase: cinematicState.phase,
          player,
          enemy
        });
      }
    }

    renderFrame({ renderer, scene, camera, composer });
    stats.update();
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ESTADO: VICTORY_CINEMATIC (Victoria VR y PC)
  // ══════════════════════════════════════════════════════════════════════════
  if (gameState === "VICTORY_CINEMATIC") {
    victoryState.time += delta;

    if (renderer.xr.isPresenting) {
      const wPos = victoryState.winner.model.position;
      const lPos = victoryState.loser.model.position;

      // ───────────────────────────────────────────────────────────────────────
      // RECORRIDO VR FLUIDO E INVERSO (SIEMPRE MIRA HACIA EL RING)
      // ───────────────────────────────────────────────────────────────────────
      if (victoryState.phase === 1) {
        // Recorrido 1: Misma toma grúa inicial (Alejamiento panorámico)
        const startY = 60;
        const startZ = 20;
        const moveSpeed = victoryState.time * 25;
        const currentMove = Math.min(moveSpeed, 240);
        vrPlayerRig.rig.position.set(0, startY + currentMove, startZ + currentMove);
        vrPlayerRig.rig.lookAt(0, 40, 0);
        vrPlayerRig.rig.rotateY(Math.PI);

      } else if (victoryState.phase === 2) {
        // Recorrido 2: De pies a cabeza del perdedor (Desde el exterior apuntando al Ring)
        const moveProgress = Math.min(victoryState.time * 0.4, 1.0); 
        
        // Calculamos la dirección radial desde el centro (0,0) hacia el perdedor
        const lDir = new THREE.Vector3(lPos.x, 0, lPos.z).normalize();

        // Posicionamos el rig AFUERA del ring (addScaledVector positivo) para mirar hacia adentro
        const startPos = new THREE.Vector3().copy(lPos).addScaledVector(lDir, -130);
        startPos.y = 55; // Nivel de pies
        const endPos = new THREE.Vector3().copy(lPos).addScaledVector(lDir, -85);
        endPos.y = 75; // Nivel de cabeza
        
        vrPlayerRig.rig.position.lerpVectors(startPos, endPos, moveProgress);
        // Clavamos el lookAt en el cuerpo; el fondo será todo el ring interior
        vrPlayerRig.rig.lookAt(lPos.x, 45, lPos.z);
        vrPlayerRig.rig.rotateY(Math.PI);

      } else if (victoryState.phase >= 3) {
        // Recorrido 3: De abajo a arriba del Ganador y MANTENERSE ARRIBA
        let upProgress = 0;
        if (victoryState.phase === 3) {
          upProgress = victoryState.time * 25;
        } else {
          upProgress = 1000; 
        }
        
         // Dirección REAL hacia donde mira el ganador
        const forward = new THREE.Vector3();
        victoryState.winner.model.getWorldDirection(forward);
        
        const currentY = Math.min(55 + upProgress, 145);
        // Colocamos la cámara ENFRENTE del ganador
        const rigPos = new THREE.Vector3().copy(wPos).addScaledVector(forward, 100);
        rigPos.y = currentY;
        
        vrPlayerRig.rig.position.copy(rigPos);
        // Encuadre épico de frente al ganador con la lona y las luces de fondo
        vrPlayerRig.rig.lookAt(wPos.x, 135, wPos.z);
        vrPlayerRig.rig.rotateY(Math.PI);
      }

    } else {
      // — Cámara PC —
      victoryState.totalTime += delta;

      if (controls) {
        controls.enabled = false;
        controls.minDistance = 0;
        controls.maxDistance = Infinity;
      }

      updateVictoryCamera({
        camera,
        controls,
        timeElapsed: victoryState.totalTime,
        winner: victoryState.winner
      });
    }

    renderFrame({ renderer, scene, camera, composer });
    stats.update();
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ORIENTACIÓN Y CÁMARA (estado FIGHTING / ANNOUNCING / etc.)
  // ══════════════════════════════════════════════════════════════════════════
  updateFacing(player, enemy);

  if (renderer.xr.isPresenting) {
    syncVRRigToPlayerHead({
      vrPlayerRig,
      headBone: playerHeadBone,
      player,
      camera
    });
  } else {
    updateCamera({
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
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Si no estamos peleando, solo renderizar
  // ══════════════════════════════════════════════════════════════════════════
  if (gameState !== "FIGHTING") {
    renderFrame({ renderer, scene, camera, composer });
    stats.update();
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LÓGICA DE COMBATE
  // ══════════════════════════════════════════════════════════════════════════
  updateStepMovement(player, delta, ringConfig);
  updateStepMovement(enemy, delta, ringConfig);

  resolveBodyCollisions(player, enemy);

  const isVR = renderer.xr.isPresenting;

  checkHits({
    gameStarted,
    player,
    enemy,
    punchTypes,
    audioManager,
    isVR,
    onKnockout,
    triggerHitReaction: (character, type) => {
      triggerHitReaction(character, type, switchAction);
    }
  });

  updateAI({
    player,
    enemy,
    playBoxAction,
    startStepMovement: startCharacterStepMovement,
    startEnemyCombo,
    enemyPunches,
    playNextComboAction,
    playFightIdle,
    isVR
  });

  renderFrame({ renderer, scene, camera, composer });
  stats.update();
}

function renderFrame({ renderer, scene, camera, composer }) {
  if (renderer.xr.isPresenting || !composer) {
    renderer.render(scene, camera);
  } else {
    composer.render();
  }
}