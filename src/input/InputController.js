export function handleKeyDown({
  event,
  player,
  keysPressed,
  controls,
  setCameraMode,
  playBoxAction,
  playPunchAction,
  startStepMovement
}) {
  if (event.key === "1") {
    setCameraMode(1);
    controls.enabled = false;
    return;
  }

  if (event.key === "2") {
    setCameraMode(2);
    controls.enabled = true;
    return;
  }

  keysPressed[event.key] = true;

  if (event.key === "Shift") {
    keysPressed.Shift = true;
  }

  if (!player || !player.actions.fightIdle) return;
  if (player.isMoving || player.isHit) return;

  const shift = event.shiftKey;

  switch (event.code) {
    //=================================================
    // GOLPES
    //=================================================
    case "KeyA":
      event.preventDefault();
      playPunchAction(player, shift ? "leadJabShift" : "leadJab");
      break;

    case "KeyW":
      event.preventDefault();
      playPunchAction(player, shift ? "uppercut" : "jabCross");
      break;

    case "KeyS":
      event.preventDefault();
      playPunchAction(player, shift ? "hookShift" : "hook");
      break;

    case "KeyD":
      event.preventDefault();
      playPunchAction(player, shift ? "bodyJabCrossShift" : "bodyJabCross");
      break;

    //=================================================
    // MOVIMIENTO
    //=================================================
    case "ArrowUp":
      event.preventDefault();
      playBoxAction(
        player,
        shift ? "mediumForward" : "shortForward",
        startStepMovement
      );
      break;

    case "ArrowDown":
      event.preventDefault();
      playBoxAction(
        player,
        shift ? "mediumBackward" : "shortBackward",
        startStepMovement
      );
      break;

    case "ArrowLeft":
      event.preventDefault();
      playBoxAction(
        player,
        shift ? "mediumLeft" : "shortLeft",
        startStepMovement
      );
      break;

    case "ArrowRight":
      event.preventDefault();
      playBoxAction(
        player,
        shift ? "mediumRight" : "shortRight",
        startStepMovement
      );
      break;
  }
}

export function handleKeyUp({ event, keysPressed }) {
  keysPressed[event.key] = false;

  if (event.key === "Shift") {
    keysPressed.Shift = false;
  }
}

export function checkAndPlayMovement({
  player,
  keysPressed,
  playBoxAction,
  playFightIdle,
  startStepMovement
}) {
  const medium = keysPressed.Shift;

  if (keysPressed.ArrowUp) {
    playBoxAction(
      player,
      medium ? "mediumForward" : "shortForward",
      startStepMovement
    );
  } else if (keysPressed.ArrowDown) {
    playBoxAction(
      player,
      medium ? "mediumBackward" : "shortBackward",
      startStepMovement
    );
  } else if (keysPressed.ArrowLeft) {
    playBoxAction(
      player,
      medium ? "mediumLeft" : "shortLeft",
      startStepMovement
    );
  } else if (keysPressed.ArrowRight) {
    playBoxAction(
      player,
      medium ? "mediumRight" : "shortRight",
      startStepMovement
    );
  } else {
    playFightIdle(player);
  }
}

export function checkAndPlayPunch({
  player,
  keysPressed,
  playPunchAction
}) {
  const shift = keysPressed.Shift;

  if (keysPressed.a || keysPressed.A) {
    playPunchAction(player, shift ? "leadJabShift" : "leadJab");
    return;
  }

  if (keysPressed.w || keysPressed.W) {
    playPunchAction(player, shift ? "uppercut" : "jabCross");
    return;
  }

  if (keysPressed.s || keysPressed.S) {
    playPunchAction(player, shift ? "hookShift" : "hook");
    return;
  }

  if (keysPressed.d || keysPressed.D) {
    playPunchAction(player, shift ? "bodyJabCrossShift" : "bodyJabCross");
  }
}