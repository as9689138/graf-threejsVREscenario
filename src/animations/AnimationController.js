import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// Velocidades de animación por categoría
// ─────────────────────────────────────────────────────────────────────────────
const ANIM_SPEED = {
  punch:     1.50,   // Golpes del jugador: 50% más rápido → menos lockout
  punchEnemy:1.15,   // Golpes de la IA: levemente más lentos que el jugador
  movement:  1.10,   // Pasos: un poco más rápidos para sensación más ágil
  vrMove:    1.15,   // Movimiento VR: ciclos más fluidos
};

// ─────────────────────────────────────────────────────────────────────────────
// switchAction — base de todo el sistema de blending
// ─────────────────────────────────────────────────────────────────────────────
export function switchAction(character, nextAction, fadeDuration = 0.25) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Cinemáticas / intro
// ─────────────────────────────────────────────────────────────────────────────
export function playReadyIdle(character, playIntroToFight) {
  const idle = character.actions.readyIdle;
  if (!idle) return;
  switchAction(character, idle, 0.4);
  setTimeout(function () {
    if (character.activeAction === idle) playIntroToFight(character);
  }, 1200);
}

export function playIntroToFight(character) {
  const intro = character.actions.standingToFight;
  if (!intro) return;
  switchAction(character, intro, 0.55);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fight idle — recuperación tras acción
// ─────────────────────────────────────────────────────────────────────────────
export function playFightIdle(character) {
  const idle = character.actions.fightIdle;
  if (!idle || character.activeAction === idle) return;

  character.currentVRMove = null;
  switchAction(character, idle, 0.22);   // 0.45 → 0.22: regresa más rápido a guardia
  character.isMoving = false;
  character.moveData = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Movimiento de paso (PC, flechas)
// ─────────────────────────────────────────────────────────────────────────────
export function playBoxAction(character, name, startStepMovement) {
  if (character.isMoving || character.isHit) return;
  if (!character.actions[name]) return;

  character.isMoving = true;

  const action = character.actions[name];
  action.setEffectiveTimeScale(ANIM_SPEED.movement);   // pasos más ágiles

  switchAction(character, action, 0.10);   // 0.20 → 0.10: transición más nítida
  startStepMovement(character, name, action);
}

// ─────────────────────────────────────────────────────────────────────────────
// Golpe del JUGADOR
// ─────────────────────────────────────────────────────────────────────────────
export function playPunchAction(character, name) {
  if (character.isMoving || character.isHit) return;
  if (!character.actions[name]) return;

  character.isMoving    = true;
  character.currentPunch = name;
  character.hasHit       = false;

  const action = character.actions[name];
  action.setEffectiveTimeScale(ANIM_SPEED.punch);  // 50% más rápido

  switchAction(character, action, 0.07);   // 0.15 → 0.07: entrada casi instantánea
}

// ─────────────────────────────────────────────────────────────────────────────
// Siguiente golpe en un combo
// ─────────────────────────────────────────────────────────────────────────────
export function playNextComboAction(character, playFightIdle) {
  if (character.comboQueue.length === 0) {
    character.isComboing = false;
    character.isMoving   = false;
    playFightIdle(character);
    return;
  }

  const actionName = character.comboQueue.shift();
  const action     = character.actions[actionName];

  if (!action) {
    playNextComboAction(character, playFightIdle);
    return;
  }

  character.isMoving     = true;
  character.currentPunch = actionName;
  character.hasHit       = false;

  // IA usa velocidad propia (un poco más lenta que el jugador)
  action.setEffectiveTimeScale(ANIM_SPEED.punchEnemy);
  switchAction(character, action, 0.08);   // 0.12 → 0.08
}

// ─────────────────────────────────────────────────────────────────────────────
// Iniciar combo de la IA
// ─────────────────────────────────────────────────────────────────────────────
export function startEnemyCombo(enemy, enemyPunches, playNextComboAction, playFightIdle) {
  if (enemy.isMoving || enemy.isComboing || enemy.isHit) return;

  const comboLength = THREE.MathUtils.randInt(1, 3);   // max 3 en vez de 4
  enemy.comboQueue  = [];

  for (let i = 0; i < comboLength; i++) {
    enemy.comboQueue.push(
      enemyPunches[Math.floor(Math.random() * enemyPunches.length)]
    );
  }

  enemy.isComboing = true;
  playNextComboAction(enemy, playFightIdle);
}

// ─────────────────────────────────────────────────────────────────────────────
// Movimiento VR — se llama CADA FRAME mientras el stick está empujado
// La clave: reiniciar suavemente si la animación ya terminó (clamp)
// ─────────────────────────────────────────────────────────────────────────────
export function playVRMovementAnimation(character, name) {
  if (!character || !character.actions) return;
  if (character.isHit || character.currentPunch)  return;
  if (!character.actions[name]) return;

  const action = character.actions[name];

  // Misma animación ya activa
  if (character.activeAction === action && character.currentVRMove === name) {
    // Si llegó al final y quedó clamped → reiniciarla para que el ciclo sea fluido
    if (action.paused || action.time >= action.getClip().duration * 0.92) {
      action.timeScale = ANIM_SPEED.vrMove;
      action.reset().play();
    }
    return;
  }

  // Cambio de animación
  character.currentVRMove = name;
  character.isMoving  = false;
  character.moveData  = null;

  action.setEffectiveTimeScale(ANIM_SPEED.vrMove);
  switchAction(character, action, 0.06);   // blending casi imperceptible
}

// ─────────────────────────────────────────────────────────────────────────────
// Victoria y K.O. — sin cambios en lógica, solo limpias
// ─────────────────────────────────────────────────────────────────────────────
export function playVictoryAnimation(character) {
  if (!character || !character.actions) return;

  const action = character.actions.victory;
  if (!action) {
    console.warn("No existe la animación victory en actions");
    return;
  }

  character.isCelebrating = true;
  character.isKnockedOut  = false;
  character.isMoving      = true;
  character.isComboing    = false;
  character.comboQueue    = [];
  character.currentPunch  = null;
  character.hasHit        = false;
  character.moveData      = null;
  character.isHit         = false;

  character.mixer.stopAllAction();
  action.reset();
  action.enabled = true;
  action.paused  = false;
  action.time    = 0;
  action.setEffectiveWeight(1);
  action.setEffectiveTimeScale(1);
  action.setLoop(THREE.LoopRepeat);
  action.play();

  character.activeAction = action;
}

export function playKnockoutAnimation(character) {
  if (!character || !character.actions) return;

  const action = character.actions.knockedOut;
  if (!action) {
    console.warn("No existe la animación knockedOut en actions");
    return;
  }

  character.isKnockedOut  = true;
  character.isCelebrating = false;
  character.isDead        = true;
  character.isMoving      = true;
  character.isComboing    = false;
  character.comboQueue    = [];
  character.currentPunch  = null;
  character.hasHit        = false;
  character.moveData      = null;
  character.isHit         = false;

  character.mixer.stopAllAction();
  action.reset();
  action.enabled = true;
  action.paused  = false;
  action.time    = 0;
  action.setEffectiveWeight(1);
  action.setEffectiveTimeScale(1);
  action.setLoop(THREE.LoopOnce);
  action.clampWhenFinished = true;
  action.play();

  character.activeAction = action;
}
