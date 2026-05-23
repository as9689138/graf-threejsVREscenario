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
  cinematicState
}) {
  const delta = clock.getDelta();

  // ==========================================
  // FLASHES / AMBIENTE
  // ==========================================
  if (flashParticles) {
    flashTimer -= delta;

    flashParticles.material.uniforms.time.value += 0.02;

    const baseOpacity =
      Math.sin(performance.now() * 0.002) * 0.5 + 0.5;

    if (flashTimer <= 0) {
      flashIntensity = 0.6 + Math.random() * 0.8;
      flashTimer = 0.5 + Math.random() * 0.2;
    }

    flashIntensity *= 0.96;

    let finalOpacity = baseOpacity + flashIntensity;
    finalOpacity = Math.min(finalOpacity, 1.5);

    flashParticles.material.uniforms.uOpacity.value = finalOpacity;
  }

  // ==========================================
  // MIXERS DE ANIMACIÓN
  // ==========================================
  if (player.mixer) player.mixer.update(delta);
  if (enemy.mixer) enemy.mixer.update(delta);

  // ==========================================
  // INPUT Y LOCOMOCIÓN VR
  // ==========================================
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

  // ==========================================
  // SI ESTÁ EN CINEMÁTICA (ENTRADA ÉPICA)
  // ==========================================
  if (gameState === "CINEMATIC") {
    cinematicState.time += delta;
    updateFacing(player, enemy); // Para que se miren fijo

    if (renderer.xr.isPresenting) {
      // --- CINEMÁTICA VR CORREGIDA ---
      if (cinematicState.phase === 1) {
        // Fase 1: Efecto Grúa con LÍMITE DE ALTURA
        const startY = 60; // Un poco arriba de la lona
        const startZ = 20; // Ligero desfase
        const moveSpeed = cinematicState.time * 25; // Velocidad de alejamiento
        
        // LIMITAMOS EL MOVIMIENTO: Máximo 240 unidades de recorrido.
        // Esto significa que la altura máxima será 300 (60 + 240), 
        // manteniéndote a salvo por debajo del armazón de luces que está en 400.
        const currentMove = Math.min(moveSpeed, 240);
        
        vrPlayerRig.rig.position.set(0, startY + currentMove, startZ + currentMove);

      } else if (cinematicState.phase === 2) {
        // Fase 2: Dolly-Up del jugador (INICIA ARRIBA DE LA LONA)
        const startY = 50; 
        const upSpeed = cinematicState.time * 25;
        const currentY = Math.min(startY + upSpeed, 155); 
        vrPlayerRig.rig.position.set(-180, currentY, -180);

      } else if (cinematicState.phase === 3) {
        // Fase 3: Dolly-Up del oponente (INICIA ARRIBA DE LA LONA)
        const startY = 50; 
        const upSpeed = cinematicState.time * 25;
        const currentY = Math.min(startY + upSpeed, 155); 
        vrPlayerRig.rig.position.set(180, currentY, 180);

      } else if (cinematicState.phase === 4) {
        // Fase 4: Entrando a la cabeza para pelear
        syncVRRigToPlayerHead({ vrPlayerRig, headBone: playerHeadBone, player, camera });
      }
    } else {
      // --- CINEMÁTICA 3D (DRON) ---
      if (cinematicState.phase === 4) {
        updateCamera({ player, enemy, camera, controls, cameraMode, camDistMode1, cameraConfig, idealLookAt, idealPos, currentLookAt });
      } else {
        updateCinematicCamera({ camera, timeElapsed: cinematicState.time, phase: cinematicState.phase, player, enemy });
      }
    }

    renderFrame({ renderer, scene, camera, composer });
    stats.update();
    return; // Evita que se ejecute el resto de cámaras
  }

  // ==========================================
  // ORIENTACIÓN Y CÁMARA (NORMAL)
  // ==========================================
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

  // ==========================================
  // SI NO ESTÁ PELEANDO, SOLO RENDERIZA
  // ==========================================
  if (gameState !== "FIGHTING") {
    renderFrame({
      renderer,
      scene,
      camera,
      composer
    });

    stats.update();
    return;
  }

  // ==========================================
  // ACCIONES DE COMBATE
  // ==========================================
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

  renderFrame({
    renderer,
    scene,
    camera,
    composer
  });

  stats.update();
}

function renderFrame({
  renderer,
  scene,
  camera,
  composer
}) {
  if (renderer.xr.isPresenting || !composer) {
    renderer.render(scene, camera);
  } else {
    composer.render();
  }
}