import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES DE COLISIÓN
// ─────────────────────────────────────────────────────────────────────────────
const BODY_MIN_DIST   = 90;    // distancia mínima entre modelos
const BOUNCE_DAMPING  = 0.68;  // cuánto se amortiza el rebote por frame
const BOUNCE_IMPULSE  = 0.40;  // fuerza del impulso al colisionar
const BOUNCE_CUTOFF   = 0.08;  // velocidad mínima para seguir aplicando bounce

// ─────────────────────────────────────────────────────────────────────────────
// COLISIONES CORPORALES CON REBOTE
// ─────────────────────────────────────────────────────────────────────────────
export function resolveBodyCollisions(player, enemy) {
  if (!player.model || !enemy.model) return;

  const dist = player.model.position.distanceTo(enemy.model.position);

  if (dist < BODY_MIN_DIST && dist > 0) {
    const overlap = BODY_MIN_DIST - dist;

    const dir = new THREE.Vector3()
      .subVectors(player.model.position, enemy.model.position)
      .normalize();

    // Separación completa en un solo frame (evita penetración acumulada)
    player.model.position.addScaledVector(dir,  overlap * 0.55);
    enemy.model.position.addScaledVector(dir,  -overlap * 0.55);

    // Añadir impulso de rebote a la velocidad de cada personaje
    _addBounceVelocity(player, dir,  overlap * BOUNCE_IMPULSE);
    _addBounceVelocity(enemy,  dir, -overlap * BOUNCE_IMPULSE);
  }

  // Aplicar y amortiguar velocidades de rebote
  _applyVelocity(player);
  _applyVelocity(enemy);
}

function _addBounceVelocity(character, dir, strength) {
  if (!character.bounceVel) character.bounceVel = new THREE.Vector3();
  character.bounceVel.addScaledVector(dir, strength);
}

function _applyVelocity(character) {
  if (!character.bounceVel) return;
  if (character.bounceVel.lengthSq() < BOUNCE_CUTOFF * BOUNCE_CUTOFF) {
    character.bounceVel.set(0, 0, 0);
    return;
  }
  // Solo X/Z, nunca empuja hacia arriba
  character.bounceVel.y = 0;
  character.model.position.add(character.bounceVel);
  character.bounceVel.multiplyScalar(BOUNCE_DAMPING);
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECCIÓN DE GOLPES
// ─────────────────────────────────────────────────────────────────────────────
export function checkHits({
  gameStarted,
  player,
  enemy,
  punchTypes,
  audioManager,
  triggerHitReaction,
  isVR,
  onKnockout
}) {
  if (!gameStarted || !player.model || !enemy.model) return;

  evaluateHit({ attacker: player, defender: enemy, punchTypes, audioManager, triggerHitReaction, isVR, onKnockout });
  evaluateHit({ attacker: enemy, defender: player, punchTypes, audioManager, triggerHitReaction, isVR, onKnockout });
}

export function evaluateHit({
  attacker,
  defender,
  punchTypes,
  audioManager,
  triggerHitReaction,
  isVR,
  onKnockout
}) {
  if (!attacker.currentPunch || attacker.hasHit || attacker.isHit || defender.isHit || defender.isEvading) return;

  const action = attacker.actions[attacker.currentPunch];
  if (!action) return;

  const clipDur = action.getClip().duration;
  const progress = action.time / clipDur;

  // Ventana de impacto: 25%–55% de la animación
  // En VR ampliamos un poco para compensar el lag del tracking
  const hitStart = 0.22;
  const hitEnd   = isVR ? 0.62 : 0.52;

  if (progress < hitStart || progress > hitEnd) return;

  const dist     = attacker.model.position.distanceTo(defender.model.position);
  const hitRange = isVR ? 128 : 145;

  if (dist >= hitRange) return;

  // ── ¡GOLPE CONECTADO! ─────────────────────────────────────────────────────
  attacker.hasHit = true;
  audioManager.playPunch();

  // Dirección del empujón (plano XZ únicamente)
  const pushDir = new THREE.Vector3()
    .subVectors(defender.model.position, attacker.model.position)
    .setY(0)
    .normalize();

  // Empujón inmediato
  defender.model.position.addScaledVector(pushDir, 18);

  // Impulso de rebote con velocidad acumulada
  _addBounceVelocity(defender, pushDir, 14);

  // ── Daño ──────────────────────────────────────────────────────────────────
  defender.health -= 10;

  if (defender.health <= 0) {
    defender.health   = 0;
    defender.isDead   = true;
    attacker.isWinner = true;
    if (onKnockout) onKnockout({ winner: attacker, loser: defender });
    return;
  }

  // ── Reacción de dolor ─────────────────────────────────────────────────────
  triggerHitReaction(defender, punchTypes[attacker.currentPunch] || "head");
}

// ─────────────────────────────────────────────────────────────────────────────
// REACCIÓN DE IMPACTO
// ─────────────────────────────────────────────────────────────────────────────
export function triggerHitReaction(character, type, switchAction) {
  character.isHit       = true;
  character.isMoving    = false;
  character.isComboing  = false;
  character.comboQueue  = [];
  character.currentPunch = null;
  character.moveData    = null;

  // Cancelar también la velocidad de rebote actual para que no interfiera
  if (character.bounceVel) character.bounceVel.set(0, 0, 0);

  const now = performance.now();
  const timeSinceLast = now - (character.lastHitTime || 0);

  if (timeSinceLast > 2800) {
    character.consecutiveHitsReceived = 1;
  } else {
    character.consecutiveHitsReceived = (character.consecutiveHitsReceived || 0) + 1;
  }
  character.lastHitTime = now;

  if (character.consecutiveHitsReceived >= 2) {
    character.needsToEvade = true;
    character.consecutiveHitsReceived = 0;
  }

  const animName = type === "body" ? "hitBody" : "hitHead";
  const action   = character.actions[animName];
  if (action) switchAction(character, action, 0.08);
}
