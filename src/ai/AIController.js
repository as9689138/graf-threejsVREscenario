export function updateAI({
  player,
  enemy,
  playBoxAction,
  startStepMovement,
  startEnemyCombo,
  enemyPunches,
  playNextComboAction,
  playFightIdle
}) {
  if (!enemy.model || !player.model) return;
  if (!enemy.actions.fightIdle) return;
  if (enemy.activeAction === enemy.actions.readyIdle) return;
  if (enemy.activeAction === enemy.actions.standingToFight) return;
  if (enemy.isMoving || enemy.isComboing || enemy.isHit || player.isHit) return;

  const distance = player.model.position.distanceTo(enemy.model.position);
  const idealDistance = 150;

  const now = performance.now();

  if (distance > idealDistance + 35) {
    playBoxAction(
      enemy,
      "mediumForward",
      startStepMovement
    );
  } else if (distance < idealDistance - 35) {
    playBoxAction(
      enemy,
      "shortBackward",
      startStepMovement
    );
  } else {
    if (now > enemy.nextAttackTime) {
      startEnemyCombo(
        enemy,
        enemyPunches,
        playNextComboAction,
        playFightIdle
      );

      enemy.nextAttackTime = now + 1600 + Math.random() * 1400;
    } else {
      playFightIdle(enemy);
    }
  }
}