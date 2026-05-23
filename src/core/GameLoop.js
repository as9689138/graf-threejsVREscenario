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
  gameState
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

  // ==========================================
  // ORIENTACIÓN Y CÁMARA
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