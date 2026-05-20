export function updateGameLoop({
  clock, player, enemy, gameStarted, renderer, scene, camera, stats,
  vrPlayerRig, playerHeadBone, syncVRRigToPlayerHead, vrButtonMapper, updateVRLocomotion,
  playVRMovementAnimation, ringConfig, punchTypes, audioManager, updateFacing, updateStepMovement,
  resolveBodyCollisions, checkHits, triggerHitReaction, switchAction, updateAI, updateCamera,
  playBoxAction, startCharacterStepMovement, startEnemyCombo, enemyPunches, playNextComboAction, playFightIdle,
  controls, cameraMode, camDistMode1, cameraConfig, idealLookAt, idealPos, currentLookAt,
  gameState // <--- Recibe el estado desde main.js
}) {
  const delta = clock.getDelta();

  if (player.mixer) player.mixer.update(delta);
  if (enemy.mixer) enemy.mixer.update(delta);

  if (renderer.xr.isPresenting && vrButtonMapper) {
    vrButtonMapper.update();
  }

  if (renderer.xr.isPresenting && updateVRLocomotion) {
    updateVRLocomotion({
      renderer, player, delta, ringConfig, playVRMovementAnimation, playFightIdle
    });
  }

  // Mantener orientación incluso antes de iniciar pelea
  updateFacing(player, enemy);

  if (renderer.xr.isPresenting) {
    syncVRRigToPlayerHead({ vrPlayerRig, headBone: playerHeadBone, player, camera });
  } else {
    updateCamera({ player, enemy, camera, controls, cameraMode, camDistMode1, cameraConfig, idealLookAt, idealPos, currentLookAt });
  }

  // Si no están peleando (Menú, Anuncio de Round o K.O.), solo dibujamos y congelamos la IA
  if (gameState !== 'FIGHTING') {
      renderer.render(scene, camera);
      stats.update();
      return; 
  }

  // ==============================
  // ACCIONES DE COMBATE (FIGHTING)
  // ==============================
  updateStepMovement(player, delta, ringConfig);
  updateStepMovement(enemy, delta, ringConfig);

  resolveBodyCollisions(player, enemy);

  const isVR = renderer.xr.isPresenting; // Detectamos si estamos en el visor

  checkHits({
    gameStarted, player, enemy, punchTypes, audioManager, isVR, // Pasamos isVR aquí
    triggerHitReaction: (character, type) => { triggerHitReaction(character, type, switchAction); },
  });

  updateAI({
    player, enemy, playBoxAction, startStepMovement: startCharacterStepMovement,
    startEnemyCombo, enemyPunches, playNextComboAction, playFightIdle, isVR // Y pasamos isVR aquí
  });

  renderer.render(scene, camera);
  stats.update();
}