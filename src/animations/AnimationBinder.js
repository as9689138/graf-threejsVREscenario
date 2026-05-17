import * as THREE from "three";

export function bindAnimations({
  character,
  allClips,
  isPlayer,
  keysPressed,
  playFightIdle,
  playNextComboAction,
  checkAndPlayMovement,
  playBoxAction,
  startStepMovement
}) {
  for (const name in allClips) {
    const action = character.mixer.clipAction(allClips[name]);

    if (name === "readyIdle" || name === "fightIdle") {
      action.setLoop(THREE.LoopRepeat);
    } else {
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
    }

    action.enabled = true;
    character.actions[name] = action;
  }

  character.mixer.addEventListener("finished", function (event) {
    if (event.action === character.actions.readyIdle) return;
    if (event.action === character.actions.fightIdle) return;

    character.currentPunch = null;
    character.hasHit = false;
    character.moveData = null;

    if (character.isHit) {
      character.isHit = false;
      playFightIdle(character);
      return;
    }

    if (character.isComboing) {
      playNextComboAction(character, playFightIdle);
      return;
    }

    character.isMoving = false;

    if (isPlayer) {
      checkAndPlayMovement({
        player: character,
        keysPressed,
        playBoxAction,
        playFightIdle,
        startStepMovement
      });
    } else {
      playFightIdle(character);
    }
  });
}