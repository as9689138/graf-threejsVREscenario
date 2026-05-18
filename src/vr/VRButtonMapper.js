export function createVRButtonMapper({
  getRenderer,
  getPlayer,
  playPunchAction
}) {
  const previousButtons = new Map();

  function isPressed(button) {
    return button && button.pressed;
  }

  function wasPressed(source, index) {
    const key = `${source.handedness}-${index}`;
    return previousButtons.get(key) === true;
  }

  function savePressed(source, index, pressed) {
    const key = `${source.handedness}-${index}`;
    previousButtons.set(key, pressed);
  }

  function triggerIsPressed(gamepad) {
    return isPressed(gamepad.buttons[0]);
  }

  function update() {
    const renderer = getRenderer();
    const player = getPlayer();

    if (!renderer || !renderer.xr) return;
    if (!player || !player.actions) return;

    const session = renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
      if (!source.gamepad) continue;

      const gamepad = source.gamepad;
      const shiftActive = triggerIsPressed(gamepad);

      const mappings =
        source.handedness === "left"
          ? [
              { index: 4, base: "hook", shift: "hookShift" },      // X → S
              { index: 5, base: "jabCross", shift: "uppercut" },   // Y → W
            ]
          : [
              { index: 4, base: "bodyJabCross", shift: "bodyJabCrossShift" }, // A → D
              { index: 5, base: "leadJab", shift: "leadJabShift" },           // B → A
            ];

      for (const map of mappings) {
        const pressed = isPressed(gamepad.buttons[map.index]);

        if (pressed && !wasPressed(source, map.index)) {
          playPunchAction(player, shiftActive ? map.shift : map.base);
        }

        savePressed(source, map.index, pressed);
      }
    }
  }

  return { update };
}