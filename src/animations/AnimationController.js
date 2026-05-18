import * as THREE from "three";

export function switchAction(character, nextAction, fadeDuration = 0.35) {
  if (!nextAction) return;

  const previousAction = character.activeAction;

  if (previousAction === nextAction) {
    nextAction.reset().play();
  } else {
    nextAction.reset().fadeIn(fadeDuration).play();

    if (previousAction) {
      previousAction.crossFadeTo(nextAction, fadeDuration, false);
    }
  }

  character.activeAction = nextAction;
}

export function playReadyIdle(character, playIntroToFight) {
  const idle = character.actions.readyIdle;

  if (!idle) return;

  switchAction(character, idle, 0.4);

  setTimeout(function () {
    if (character.activeAction === idle) {
      playIntroToFight(character);
    }
  }, 1200);
}

export function playIntroToFight(character) {
  const intro = character.actions.standingToFight;

  if (!intro) return;

  switchAction(character, intro, 0.55);
}

export function playFightIdle(character) {
  const idle = character.actions.fightIdle;

  if (!idle || character.activeAction === idle) return;

  character.currentVRMove = null;

  switchAction(character, idle, 0.45);

  character.isMoving = false;
  character.moveData = null;
}

export function playBoxAction(
  character,
  name,
  startStepMovement
) {
  if (character.isMoving || character.isHit) return;
  if (!character.actions[name]) return;

  character.isMoving = true;

  const action = character.actions[name];

  switchAction(character, action, 0.2);

  startStepMovement(character, name, action);
}

export function playPunchAction(character, name) {
  if (character.isMoving || character.isHit) return;
  if (!character.actions[name]) return;

  character.isMoving = true;
  character.currentPunch = name;
  character.hasHit = false;

  const action = character.actions[name];

  switchAction(character, action, 0.15);
}

export function playNextComboAction(character, playFightIdle) {
  if (character.comboQueue.length === 0) {
    character.isComboing = false;
    character.isMoving = false;

    playFightIdle(character);

    return;
  }

  const actionName = character.comboQueue.shift();
  const action = character.actions[actionName];

  if (!action) {
    playNextComboAction(character, playFightIdle);
    return;
  }

  character.isMoving = true;
  character.currentPunch = actionName;
  character.hasHit = false;

  switchAction(character, action, 0.12);
}

export function startEnemyCombo(
  enemy,
  enemyPunches,
  playNextComboAction,
  playFightIdle
) {
  if (enemy.isMoving || enemy.isComboing || enemy.isHit) return;

  const comboLength = THREE.MathUtils.randInt(1, 4);

  enemy.comboQueue = [];

  for (let i = 0; i < comboLength; i++) {
    const randomPunch =
      enemyPunches[Math.floor(Math.random() * enemyPunches.length)];

    enemy.comboQueue.push(randomPunch);
  }

  enemy.isComboing = true;

  playNextComboAction(enemy, playFightIdle);
}

//VR
export function playVRMovementAnimation(character, name) {
  if (!character || !character.actions) return;
  if (character.isHit || character.currentPunch) return;
  if (!character.actions[name]) return;

  const action = character.actions[name];

  // Evita reiniciar la misma animación, pero permite cambiar short ↔ medium
  if (
    character.activeAction === action &&
    character.currentVRMove === name
  ) {
    return;
  }

  character.currentVRMove = name;
  character.isMoving = false;
  character.moveData = null;

  switchAction(character, action, 0.12);
}