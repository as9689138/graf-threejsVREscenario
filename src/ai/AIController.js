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

  // Si la IA está a mitad de movimiento o recibiendo un golpe, esperamos
  if (enemy.isMoving || enemy.isComboing || enemy.isHit || player.isHit) return;

  const distance = player.model.position.distanceTo(enemy.model.position);
  const now = performance.now();
  const attackRange = 115; 

  // 1. MODO EVASIÓN (Tiene la orden directa de huir tras recibir 2 golpes)
  if (enemy.needsToEvade) {
    // Forzamos a que solo use movimientos hacia atrás
    const escapeMoves = ["mediumBackward", "shortBackward"];
    const move = escapeMoves[Math.floor(Math.random() * escapeMoves.length)];
    playBoxAction(enemy, move, startStepMovement);
    
    enemy.needsToEvade = false; 
    enemy.nextAttackTime = now + 1500; 

    // === NUEVO: ACTIVAR INVENCIBILIDAD (I-FRAMES) ===
    // La IA se vuelve intocable por 800ms para asegurar que escape del spam de golpes
    enemy.isEvading = true;
    setTimeout(() => {
      enemy.isEvading = false;
    }, 800);

    return;
  }

  const canAttack = now >= enemy.nextAttackTime;

  // 2. SEGUIR AL JUGADOR
  if (distance > attackRange) {
    if (distance > 200) {
      playBoxAction(enemy, "mediumForward", startStepMovement);
    } else {
      playBoxAction(enemy, "shortForward", startStepMovement);
    }
    return;
  }

  // 3. ATACAR O RODEAR (Cara a cara)
  if (canAttack) {
    startEnemyCombo(
      enemy,
      enemyPunches,
      playNextComboAction,
      playFightIdle
    );
    enemy.nextAttackTime = now + 800 + Math.random() * 1200;
  } else {
    // Está recargando: rodea o espera
    if (Math.random() > 0.8) {
      const sideMoves = ["shortLeft", "shortRight"];
      playBoxAction(enemy, sideMoves[Math.floor(Math.random() * sideMoves.length)], startStepMovement);
    } else {
      playFightIdle(enemy);
    }
  }
}