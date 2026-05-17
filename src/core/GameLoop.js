export function updateGameLoop({
  clock,
  player,
  enemy,
  gameStarted,
  renderer,
  scene,
  camera,
  stats,

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
  currentLookAt
}) {
  const delta = clock.getDelta();

  if (player.mixer) player.mixer.update(delta);
  if (enemy.mixer) enemy.mixer.update(delta);

  if (!gameStarted) {
    renderer.render(scene, camera);
    stats.update();
    return;
  }

  updateFacing(player, enemy);

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
    playFightIdle
  });

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

  renderer.render(scene, camera);
  stats.update();
}