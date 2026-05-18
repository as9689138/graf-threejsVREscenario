import * as THREE from "three";

const moveDirection = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

export function updateVRLocomotion({
  renderer,
  player,
  delta,
  ringConfig,
  playVRMovementAnimation,
  playFightIdle,
  moveSpeed = 65,
  turnSpeed = 2.4,
}) {
  if (!renderer.xr.isPresenting) return;
  if (!player || !player.model) return;

  const session = renderer.xr.getSession();
  if (!session) return;

  for (const source of session.inputSources) {
    if (!source.gamepad) continue;

    const gamepad = source.gamepad;

    const x = gamepad.axes[2] ?? gamepad.axes[0] ?? 0;
    const y = gamepad.axes[3] ?? gamepad.axes[1] ?? 0;

    const deadZone = 0.15;

    const stickX = Math.abs(x) > deadZone ? x : 0;
    const stickY = Math.abs(y) > deadZone ? y : 0;

    if (source.handedness === "left") {
      //=================================================
      // STICK IZQUIERDO: MOVIMIENTO
      //=================================================

      const triggerPressed = isPressed(gamepad.buttons[0]);
      const currentMoveSpeed = triggerPressed ? 320 : moveSpeed;

      if (stickX !== 0 || stickY !== 0) {
        forward.set(0, 0, 1).applyQuaternion(player.model.quaternion);
        forward.y = 0;
        forward.normalize();

        right.set(1, 0, 0).applyQuaternion(player.model.quaternion);
        right.y = 0;
        right.normalize();

        moveDirection.set(0, 0, 0);
        moveDirection.addScaledVector(forward, -stickY);

        // INVERTIDO
        moveDirection.addScaledVector(right, -stickX);

        moveDirection.normalize();

        player.model.position.addScaledVector(
          moveDirection,
          currentMoveSpeed * delta
        );

        clampPlayerToRing(player, ringConfig);

        //=================================================
        // ANIMACIONES VR
        //=================================================
        if (playVRMovementAnimation) {
          if (Math.abs(stickY) > Math.abs(stickX)) {
            playVRMovementAnimation(
              player,
              stickY < 0
                ? triggerPressed
                  ? "mediumForward"
                  : "shortForward"
                : triggerPressed
                  ? "mediumBackward"
                  : "shortBackward"
            );
          } else {
            playVRMovementAnimation(
              player,
              stickX < 0
                ? triggerPressed
                  ? "mediumLeft"
                  : "shortLeft"
                : triggerPressed
                  ? "mediumRight"
                  : "shortRight"
            );
          }
        }
      }

      //=================================================
      // REGRESAR A IDLE
      //=================================================
      if (stickX === 0 && stickY === 0) {
        if (playFightIdle && !player.currentPunch && !player.isHit) {
          playFightIdle(player);
        }
      }
    }

    if (source.handedness === "right") {
      //=================================================
      // STICK DERECHO: ROTACIÓN DEL CUERPO
      //=================================================
      if (stickX !== 0) {
        player.model.rotation.y -= stickX * turnSpeed * delta;
      }
    }
  }
}

function clampPlayerToRing(player, ringConfig) {
  const characterRadius = 40;
  const visualMargin = 10;
  const limit = ringConfig.ringHalf - characterRadius - visualMargin;

  player.model.position.x = Math.max(
    -limit,
    Math.min(limit, player.model.position.x)
  );

  player.model.position.z = Math.max(
    -limit,
    Math.min(limit, player.model.position.z)
  );
}

function isPressed(button) {
  return button && button.pressed;
}