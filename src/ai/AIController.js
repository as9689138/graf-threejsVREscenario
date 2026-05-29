// ─────────────────────────────────────────────────────────────────────────────
// AIController — IA de boxeo con comportamiento adaptativo
// ─────────────────────────────────────────────────────────────────────────────

const OPTIMAL_RANGE = 100;   // rango ideal de combate
const ATTACK_RANGE  = 125;   // distancia máxima para atacar
const TOO_CLOSE     = 72;    // demasiado cerca → retroceder
const FAR_RANGE     = 210;   // muy lejos → avanzar rápido

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
  if (enemy.activeAction === enemy.actions.readyIdle)        return;
  if (enemy.activeAction === enemy.actions.standingToFight)  return;
  if (enemy.isMoving || enemy.isComboing || enemy.isHit || player.isHit) return;

  const distance      = player.model.position.distanceTo(enemy.model.position);
  const now           = performance.now();
  const healthRatio   = enemy.health   / (enemy.maxHealth   || 100);
  const playerRatio   = player.health  / (player.maxHealth  || 100);
  const isWinning     = healthRatio > playerRatio + 0.15;
  const isDesperate   = healthRatio < 0.25;
  const canAttack     = now >= enemy.nextAttackTime;

  // ── 1. EVASIÓN (prioridad máxima) ─────────────────────────────────────────
  if (enemy.needsToEvade) {
    // Si está desesperado, huye más lejos; si está bien, solo retrocede un poco
    const escapeMoves = isDesperate
      ? ["mediumBackward", "mediumLeft", "mediumRight"]
      : ["shortBackward", "mediumBackward", "shortLeft", "shortRight"];

    const move = escapeMoves[Math.floor(Math.random() * escapeMoves.length)];
    playBoxAction(enemy, move, startStepMovement);

    enemy.needsToEvade    = false;
    enemy.nextAttackTime  = now + (isDesperate ? 1800 : 1200);

    // I-frames de evasión
    enemy.isEvading = true;
    setTimeout(() => { enemy.isEvading = false; }, isDesperate ? 1000 : 700);
    return;
  }

  // ── 2. GESTIÓN DE DISTANCIA ───────────────────────────────────────────────

  // Demasiado cerca: crear espacio
  if (distance < TOO_CLOSE) {
    const rand = Math.random();
    if (rand < 0.5) {
      playBoxAction(enemy, "shortBackward", startStepMovement);
    } else if (rand < 0.75) {
      playBoxAction(enemy, "shortLeft",  startStepMovement);
    } else {
      playBoxAction(enemy, "shortRight", startStepMovement);
    }
    return;
  }

  // Muy lejos: avanzar
  if (distance > FAR_RANGE) {
    playBoxAction(enemy, "mediumForward", startStepMovement);
    return;
  }

  // Lejos pero no tanto: avanzar con paso corto o largo dependiendo de estado
  if (distance > ATTACK_RANGE) {
    const advance = (isWinning || isDesperate) ? "mediumForward" : "shortForward";
    playBoxAction(enemy, advance, startStepMovement);
    return;
  }

  // ── 3. RANGO DE COMBATE ───────────────────────────────────────────────────
  if (canAttack) {
    // Probabilidad de atacar vs maniobrar (más agresivo si va ganando)
    const aggression = isWinning ? 0.88 : isDesperate ? 0.60 : 0.75;

    if (Math.random() < aggression) {
      startEnemyCombo(enemy, enemyPunches, playNextComboAction, playFightIdle);

      // Cooldown adaptativo:
      //   ganando → más rápido (presiona)
      //   desesperado → más lento (conserva)
      const baseCooldown = isWinning ? 550 : isDesperate ? 1100 : 800;
      const variance     = Math.random() * 900;
      enemy.nextAttackTime = now + baseCooldown + variance;

    } else {
      // Footwork táctico mientras recarga
      _doFootwork(enemy, distance, playBoxAction, startStepMovement, playFightIdle);
    }

  } else {
    // Recargando: footwork o espera
    if (Math.random() > 0.55) {
      _doFootwork(enemy, distance, playBoxAction, startStepMovement, playFightIdle);
    } else {
      playFightIdle(enemy);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Footwork táctico: rodear, ajustar distancia
// ─────────────────────────────────────────────────────────────────────────────
function _doFootwork(enemy, distance, playBoxAction, startStepMovement, playFightIdle) {
  const rand = Math.random();

  if (rand < 0.40) {
    // Movimiento lateral (rodear al jugador)
    playBoxAction(
      enemy,
      Math.random() > 0.5 ? "shortLeft" : "shortRight",
      startStepMovement
    );
  } else if (rand < 0.65) {
    // Ajuste de profundidad
    if (distance > OPTIMAL_RANGE) {
      playBoxAction(enemy, "shortForward",  startStepMovement);
    } else {
      playBoxAction(enemy, "shortBackward", startStepMovement);
    }
  } else {
    // Guardia activa
    playFightIdle(enemy);
  }
}
