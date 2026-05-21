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
  flashParticles,
  composer,

  // VR
  vrPlayerRig,
  playerHeadBone,
  syncVRRigToPlayerHead,

  vrButtonMapper,

  updateVRLocomotion,

  playVRMovementAnimation,

  ringConfig,
  punchTypes,
  audioManager,

  updateFacing,
  updateStepMovement,
  resolveBodyCollisions,
  checkHits,
  triggerHitReaction,
  switchAction,
  updateAI,
  updateCamera,

  playBoxAction,
  startCharacterStepMovement,
  startEnemyCombo,
  enemyPunches,
  playNextComboAction,
  playFightIdle,

  controls,
  cameraMode,
  camDistMode1,
  cameraConfig,
  idealLookAt,
  idealPos,
  currentLookAt,
}) {
  const delta = clock.getDelta();

  // ==========================================
  // FLASHES
  // ==========================================

  flashTimer -= delta;

  if (flashParticles) {

    const delta = clock.getDelta();

    flashTimer -= delta;

    flashParticles.material.uniforms.time.value += 0.02;

    // 1. BASE (dinámico cada frame)
    let baseOpacity =
      Math.sin(performance.now() * 0.002) * 0.5 + 0.5;

    // 2. EVENTO FLASH
    if (flashTimer <= 0) {
      flashIntensity = 0.6 + Math.random() * 0.8;
      flashTimer = 0.5 + Math.random() * 0.2;
    }

    // 3. DECAY
    flashIntensity *= 0.96;

    // 4. COMBINACIÓN FINAL (dinámica)
    let flash = flashIntensity;

    let finalOpacity = baseOpacity + flash;
    finalOpacity = Math.min(finalOpacity, 1.5);

    flashParticles.material.uniforms.uOpacity.value = finalOpacity;
  }

  // ==========================================

  if (player.mixer) player.mixer.update(delta);
  if (enemy.mixer) enemy.mixer.update(delta);

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

  // Mantener orientación incluso antes de iniciar pelea
  updateFacing(player, enemy);

  if (renderer.xr.isPresenting) {
    syncVRRigToPlayerHead({
      vrPlayerRig,
      headBone: playerHeadBone,
      player,
      camera,
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
      currentLookAt,
    });
  }

  if (!gameStarted) {
    if (renderer.xr.isPresenting) {
      renderer.render(scene, camera);
    } else {
      composer.render();
    }   
    stats.update();
    return;
  }

  updateStepMovement(player, delta, ringConfig);
  updateStepMovement(enemy, delta, ringConfig);

  resolveBodyCollisions(player, enemy);

  checkHits({
    gameStarted,
    player,
    enemy,
    punchTypes,
    audioManager,
    triggerHitReaction: (character, type) => {
      triggerHitReaction(character, type, switchAction);
    },
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
  });

  if (renderer.xr.isPresenting) {
    renderer.render(scene, camera);
  } else {
    composer.render();
  }
  stats.update();
}
