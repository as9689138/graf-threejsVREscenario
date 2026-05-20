let flashTimer = 0;

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

     console.log("FLASH OK");

    if (flashTimer <= 0) {
      flashParticles.material.opacity = 1.0;

      flashTimer = Math.random() * 1.5;
    }

    flashParticles.material.opacity *= 0.92;
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
