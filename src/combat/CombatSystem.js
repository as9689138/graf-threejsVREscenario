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
  triggerHitReaction,
  isVR // Recibimos la variable
}) {
  if (!gameStarted || !player.model || !enemy.model) return;

  // Se la inyectamos a los evaluadores de golpe
  evaluateHit({ attacker: player, defender: enemy, punchTypes, audioManager, triggerHitReaction, isVR });
  evaluateHit({ attacker: enemy, defender: player, punchTypes, audioManager, triggerHitReaction, isVR });
}

export function evaluateHit({ attacker, defender, punchTypes, audioManager, triggerHitReaction, isVR }) {
  // 1. Verificamos que el atacante esté golpeando y que el defensor no esté evadiendo (I-Frames)
  if (!attacker.currentPunch || attacker.hasHit || attacker.isHit || defender.isHit || defender.isEvading) {
    return;
  }

  const action = attacker.actions[attacker.currentPunch];
  if (!action) return;

  const progress = action.time / action.getClip().duration;
  
  // Rango de tiempo de la animación donde el golpe es válido (en VR damos un poquito más de margen)
  const maxProgress = isVR ? 0.6 : 0.5; 

  if (progress > 0.3 && progress < maxProgress) {
    const dist = attacker.model.position.distanceTo(defender.model.position);
    
    // Distancia física a la que el golpe conecta
    const hitRange = isVR ? 125 : 140; 

    if (dist < hitRange) {
      // ¡EL GOLPE CONECTÓ!
      attacker.hasHit = true;
      audioManager.playPunch();

      // === A. PUSHBACK (Empujar al rival hacia atrás) ===
      const pushDirection = new THREE.Vector3()
        .subVectors(defender.model.position, attacker.model.position)
        .normalize();
      pushDirection.y = 0; // Evitamos que salga volando hacia arriba
      defender.model.position.addScaledVector(pushDirection, 22);

      // === B. RECIBIR DAÑO (Sistema de Vida) ===
      // Restamos 10 puntos de vida al que recibió el golpe
      defender.health -= 10;
      
      // Verificamos si la vida llegó a cero (K.O.)
      if (defender.health <= 0) {
          defender.health = 0;
          defender.isDead = true;
      }

      // === C. REACCIÓN DE DOLOR (Animación) ===
      triggerHitReaction(defender, punchTypes[attacker.currentPunch] || "head");
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