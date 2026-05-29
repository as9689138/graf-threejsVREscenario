export function createVRButtonMapper({
  getRenderer,
  getPlayer,
  playPunchAction,
  getIsPaused = () => false   // ← callback para ignorar inputs durante pausa
}) {
  const previousButtons = new Map();

  // Margen para que el trigger funcione como Shift,
  // incluso si el emulador lo detecta unos milisegundos antes/después.
  let lastTriggerTime = 0;
  const triggerGraceTime = 180; // ms

  function isPressed(button, threshold = 0.35) {
    return !!button && (
      button.pressed ||
      button.touched ||
      button.value > threshold
    );
  }

  function wasPressed(source, index) {
    const key = `${source.handedness}-${index}`;
    return previousButtons.get(key) === true;
  }

  function savePressed(source, index, pressed) {
    const key = `${source.handedness}-${index}`;
    previousButtons.set(key, pressed);
  }

  function sourceTriggerIsPressed(gamepad) {
    // En la mayoría de controles WebXR el trigger es buttons[0].
    // En algunos emuladores/perfiles puede aparecer también como buttons[1].
    return (
      isPressed(gamepad.buttons[0], 0.25) ||
      isPressed(gamepad.buttons[1], 0.25)
    );
  }

  function getGlobalShiftActive(session) {
    let triggerActive = false;

    for (const source of session.inputSources) {
      if (!source.gamepad) continue;

      if (sourceTriggerIsPressed(source.gamepad)) {
        triggerActive = true;
        lastTriggerTime = performance.now();
      }
    }

    const recentlyPressed =
      performance.now() - lastTriggerTime < triggerGraceTime;

    return triggerActive || recentlyPressed;
  }

  function update() {
    const renderer = getRenderer();
    const player = getPlayer();

    if (!renderer || !renderer.xr) return;

    // No procesar golpes durante la pausa
    if (getIsPaused()) return;

    if (
      !player ||
      !player.actions ||
      player.isDead ||
      player.isKnockedOut ||
      player.isCelebrating
    ) {
      return;
    }

    const session = renderer.xr.getSession();
    if (!session) return;

    // Shift global: permite usar trigger de cualquier control.
    const shiftActive = getGlobalShiftActive(session);

    for (const source of session.inputSources) {
      if (!source.gamepad) continue;

      const gamepad = source.gamepad;

      const mappings =
        source.handedness === "left"
          ? [
              // Control izquierdo
              { index: 4, base: "hook", shift: "hookShift" },      // X → S
              { index: 5, base: "jabCross", shift: "uppercut" },   // Y → W
            ]
          : [
              // Control derecho
              { index: 4, base: "bodyJabCross", shift: "bodyJabCrossShift" }, // A → D
              { index: 5, base: "leadJab", shift: "leadJabShift" },           // B → A
            ];

      for (const map of mappings) {
        const pressed = isPressed(gamepad.buttons[map.index]);

        if (pressed && !wasPressed(source, map.index)) {
          const punchName = shiftActive ? map.shift : map.base;
          playPunchAction(player, punchName);

          // Log temporal para probar. Puedes eliminarlo cuando confirmes todo.
          console.log("Golpe VR:", {
            hand: source.handedness,
            buttonIndex: map.index,
            shiftActive,
            punch: punchName
          });
        }

        savePressed(source, map.index, pressed);
      }
    }
  }

  return { update };
}