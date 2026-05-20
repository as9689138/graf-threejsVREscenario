import * as THREE from "three";

export function resolveBodyCollisions(player, enemy) {
  if (!player.model || !enemy.model) return;

  const dist = player.model.position.distanceTo(enemy.model.position);
  // AUMENTAMOS la distancia mínima de 65 a 85 para que los brazos/pechos no se traspasen
  const minDist = 85; 

  if (dist < minDist) {
    const overlap = minDist - dist;

    const dir = new THREE.Vector3()
      .subVectors(player.model.position, enemy.model.position)
      .normalize();

    // Efecto repulsión natural, los mantiene separados físicamente
    player.model.position.addScaledVector(dir, overlap * 0.5);
    enemy.model.position.addScaledVector(dir, -overlap * 0.5);
  }
}

export function checkHits({
  gameStarted,
  player,
  enemy,
  punchTypes,
  audioManager,
  triggerHitReaction
}) {
  if (!gameStarted || !player.model || !enemy.model) return;

  evaluateHit({ attacker: player, defender: enemy, punchTypes, audioManager, triggerHitReaction });
  evaluateHit({ attacker: enemy, defender: player, punchTypes, audioManager, triggerHitReaction });
}

export function evaluateHit({
  attacker,
  defender,
  punchTypes,
  audioManager,
  triggerHitReaction
}) {
  // NUEVO: Verificamos defender.isEvading. Si está evadiendo, el golpe no le afecta.
  if (!attacker.currentPunch || attacker.hasHit || attacker.isHit || defender.isHit || defender.isEvading) {
    return;
  }

  const action = attacker.actions[attacker.currentPunch];
  if (!action) return;

  const progress = action.time / action.getClip().duration;

  if (progress > 0.3 && progress < 0.6) { 
    const dist = attacker.model.position.distanceTo(defender.model.position);
    const hitRange = 125; 

    if (dist < hitRange) {
      attacker.hasHit = true;
      audioManager.playPunch(); 

      // === NUEVO: PUSHBACK (Empuje por el impacto) ===
      // Calculamos la dirección del golpe y empujamos al defensor 22 unidades hacia atrás
      const pushDirection = new THREE.Vector3()
        .subVectors(defender.model.position, attacker.model.position)
        .normalize();
      pushDirection.y = 0; // Evitamos que salga volando hacia arriba
      
      defender.model.position.addScaledVector(pushDirection, 22);

      triggerHitReaction(
        defender,
        punchTypes[attacker.currentPunch] || "head"
      );
    }
  }
}

export function triggerHitReaction(character, type, switchAction) {
  character.isHit = true;
  character.isMoving = false;
  character.isComboing = false;
  character.comboQueue = [];
  character.currentPunch = null;
  character.moveData = null;

  const now = performance.now();
  // Aumentamos el margen a 3000ms para asegurar que cuente los combos rápidos
  if (now - (character.lastHitTime || 0) > 3000) {
    character.consecutiveHitsReceived = 1;
  } else {
    character.consecutiveHitsReceived = (character.consecutiveHitsReceived || 0) + 1;
  }
  character.lastHitTime = now;

  // Si recibe 2 golpes, guardamos la orden directa de huir
  if (character.consecutiveHitsReceived >= 2) {
    character.needsToEvade = true; // ¡LA CLAVE ESTÁ AQUÍ!
    character.consecutiveHitsReceived = 0; 
  }

  const animName = type === "body" ? "hitBody" : "hitHead";
  const action = character.actions[animName];

  if (action) {
    switchAction(character, action, 0.1);
  }
}