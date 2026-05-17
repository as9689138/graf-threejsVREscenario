export function updateFacing(player, enemy) {
  if (!player.model || !enemy.model) return;

  const dx = enemy.model.position.x - player.model.position.x;
  const dz = enemy.model.position.z - player.model.position.z;

  const anglePlayerToEnemy = Math.atan2(dx, dz);
  const angleEnemyToPlayer = Math.atan2(-dx, -dz);

  player.model.rotation.y = anglePlayerToEnemy;
  enemy.model.rotation.y = angleEnemyToPlayer;
}