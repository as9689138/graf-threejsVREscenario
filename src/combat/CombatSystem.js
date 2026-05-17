import * as THREE from "three";

export function resolveBodyCollisions(player, enemy) {
  if (!player.model || !enemy.model) return;

  const dist = player.model.position.distanceTo(enemy.model.position);
  const minDist = 65;

  if (dist < minDist) {
    const overlap = minDist - dist;

    const dir = new THREE.Vector3()
      .subVectors(player.model.position, enemy.model.position)
      .normalize();

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

  evaluateHit({
    attacker: player,
    defender: enemy,
    punchTypes,
    audioManager,
    triggerHitReaction
  });

  evaluateHit({
    attacker: enemy,
    defender: player,
    punchTypes,
    audioManager,
    triggerHitReaction
  });
}

export function evaluateHit({
  attacker,
  defender,
  punchTypes,
  audioManager,
  triggerHitReaction
}) {
  if (
    !attacker.currentPunch ||
    attacker.hasHit ||
    attacker.isHit ||
    defender.isHit
  ) {
    return;
  }

  const action = attacker.actions[attacker.currentPunch];
  if (!action) return;

  const progress = action.time / action.getClip().duration;

  if (progress > 0.3 && progress < 0.5) {
    const dist = attacker.model.position.distanceTo(defender.model.position);
    const hitRange = 140;

    if (dist < hitRange) {
      attacker.hasHit = true;

      audioManager.playPunch();

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

  const animName = type === "body" ? "hitBody" : "hitHead";
  const action = character.actions[animName];

  if (action) {
    switchAction(character, action, 0.1);
  }
}