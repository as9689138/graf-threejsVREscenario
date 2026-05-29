import * as THREE from "three";

/**
 * PauseController — Sistema de pausa para PC y VR
 * Ubicación: src/ui/PauseController.js
 *
 * PC  → tecla P abre/cierra el menú de pausa con overlay HTML
 * VR  → click de thumbstick (button[3]) abre/cierra panel 3D en cámara
 */
export function createPauseController({
  onContinue   = () => {},
  onRestart    = () => {},
  onEnterVR    = null,     // null → botón "Entrar a VR" oculto
  onExit       = () => {},
  getGameState,
  getRenderer,
  camera
}) {

  let _isPaused   = false;
  let _vrNavIdx   = 0;
  let _vrCooldown = 0;
  const _vrPrev   = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  // OPCIONES DEL MENÚ VR  (sin "Entrar a VR" porque ya estás en VR)
  // ─────────────────────────────────────────────────────────────────────────
  const VR_OPTIONS = [
    { icon: "▶", label: "CONTINUAR",    action: "continue" },
    { icon: "↺", label: "REINICIAR",    action: "restart"  },
    { icon: "✕", label: "SALIR AL MENÚ",action: "exit"     }
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // HTML OVERLAY  (sólo visible en modo PC)
  // ─────────────────────────────────────────────────────────────────────────
  const overlay = _buildOverlay();
  document.body.appendChild(overlay);
  _wireButtons();

  function _buildOverlay() {
    const el = document.createElement("div");
    el.id = "pauseOverlay";
    el.style.display = "none";
    el.innerHTML = `
      <div class="pause-panel" id="pausePanel">

        <div class="pause-panel-glow"></div>

        <p class="pause-badge">▮ ▮</p>
        <h2 class="pause-title">PAUSA</h2>
        <p class="pause-subtitle">— COMBATE DETENIDO —</p>

        <div class="pause-divider"></div>

        <div class="pause-buttons">

          <button class="pause-btn pause-btn--primary" id="pauseBtnContinue">
            <span class="pause-btn-icon">▶</span>
            <span>CONTINUAR</span>
            <span class="pause-btn-hint">P</span>
          </button>

          <button class="pause-btn pause-btn--secondary" id="pauseBtnRestart">
            <span class="pause-btn-icon">↺</span>
            <span>REINICIAR</span>
          </button>

          <button class="pause-btn pause-btn--vr" id="pauseBtnVR" style="display:none;">
            <span class="pause-btn-icon">◎</span>
            <span>ENTRAR A VR</span>
            <span class="pause-btn-badge-vr">BETA</span>
          </button>

          <button class="pause-btn pause-btn--danger" id="pauseBtnExit">
            <span class="pause-btn-icon">✕</span>
            <span>SALIR AL MENÚ</span>
          </button>

        </div>

        <p class="pause-hint">Presiona <kbd>P</kbd> para continuar</p>
      </div>
    `;
    return el;
  }

  function _wireButtons() {
    overlay.querySelector("#pauseBtnContinue").addEventListener("click", resume);
    overlay.querySelector("#pauseBtnRestart").addEventListener("click", () => {
      resume(); onRestart();
    });
    overlay.querySelector("#pauseBtnVR").addEventListener("click", () => {
      resume(); if (onEnterVR) onEnterVR();
    });
    overlay.querySelector("#pauseBtnExit").addEventListener("click", () => {
      resume(); onExit();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VR PANEL  (canvas 3D adjunto a la cámara)
  // ─────────────────────────────────────────────────────────────────────────
  const _vrCanvas  = document.createElement("canvas");
  _vrCanvas.width  = 1024;
  _vrCanvas.height = 680;
  const _vrCtx = _vrCanvas.getContext("2d");

  const _vrTex = new THREE.CanvasTexture(_vrCanvas);
  _vrTex.colorSpace = THREE.SRGBColorSpace;

  const _vrPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.86),
    new THREE.MeshBasicMaterial({ map: _vrTex, transparent: true, depthTest: false })
  );
  _vrPanel.position.set(0, -0.08, -2.2);
  _vrPanel.renderOrder = 1000;
  _vrPanel.frustumCulled = false;
  _vrPanel.visible = false;
  camera.add(_vrPanel);

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS INTERNOS
  // ─────────────────────────────────────────────────────────────────────────
  function _canOpen() { return getGameState() === "FIGHTING"; }
  function _isVR()    { return getRenderer()?.xr?.isPresenting === true; }

  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,   x + w, y + r,   r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y,   x + r, y,         r);
    ctx.closePath();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDERIZADO DEL PANEL VR
  // ─────────────────────────────────────────────────────────────────────────
  function _drawVRPanel() {
    const W = _vrCanvas.width, H = _vrCanvas.height;
    _vrCtx.clearRect(0, 0, W, H);

    // Fondo oscuro principal
    _vrCtx.fillStyle = "rgba(6, 6, 20, 0.97)";
    _roundRect(_vrCtx, 0, 0, W, H, 28);
    _vrCtx.fill();

    // Borde dorado exterior
    _vrCtx.strokeStyle = "#ffd700";
    _vrCtx.lineWidth = 6;
    _roundRect(_vrCtx, 3, 3, W - 6, H - 6, 26);
    _vrCtx.stroke();

    // Borde interior sutil
    _vrCtx.strokeStyle = "rgba(255,215,0,0.12)";
    _vrCtx.lineWidth = 1.5;
    _roundRect(_vrCtx, 12, 12, W - 24, H - 24, 20);
    _vrCtx.stroke();

    // Destello radial desde arriba
    const glow = _vrCtx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.7);
    glow.addColorStop(0, "rgba(255,215,0,0.07)");
    glow.addColorStop(1, "transparent");
    _vrCtx.fillStyle = glow;
    _vrCtx.fillRect(0, 0, W, H);

    // Línea separadora dorada
    const lineGrad = _vrCtx.createLinearGradient(W * 0.12, 0, W * 0.88, 0);
    lineGrad.addColorStop(0, "transparent");
    lineGrad.addColorStop(0.5, "rgba(255,215,0,0.55)");
    lineGrad.addColorStop(1, "transparent");
    _vrCtx.strokeStyle = lineGrad;
    _vrCtx.lineWidth = 1.8;
    _vrCtx.beginPath();
    _vrCtx.moveTo(60, 155);
    _vrCtx.lineTo(W - 60, 155);
    _vrCtx.stroke();

    // Icono pause
    _vrCtx.fillStyle = "rgba(255,215,0,0.2)";
    _vrCtx.font = "bold 38px Arial";
    _vrCtx.textAlign = "center";
    _vrCtx.textBaseline = "top";
    _vrCtx.fillText("▮  ▮", W / 2, 26);

    // Título PAUSA
    _vrCtx.fillStyle = "#ffd700";
    _vrCtx.font = "bold 76px Arial";
    _vrCtx.fillText("PAUSA", W / 2, 64);

    // Subtítulo
    _vrCtx.fillStyle = "rgba(255,255,255,0.35)";
    _vrCtx.font = "25px Arial";
    _vrCtx.fillText("— COMBATE DETENIDO —", W / 2, 165);

    // Botones de opciones
    const btnW = 560, btnH = 100, btnX = (W - btnW) / 2;
    const startY = 198, gap = 118;

    VR_OPTIONS.forEach((opt, i) => {
      const y   = startY + i * gap;
      const sel = i === _vrNavIdx;

      // Glow del botón seleccionado
      if (sel) {
        _vrCtx.shadowColor = "#ffd700";
        _vrCtx.shadowBlur  = 24;
      }

      // Fondo del botón
      if (sel) {
        const g = _vrCtx.createLinearGradient(btnX, y, btnX + btnW, y);
        g.addColorStop(0, "#a87e00");
        g.addColorStop(0.5, "#ffd700");
        g.addColorStop(1, "#a87e00");
        _vrCtx.fillStyle = g;
      } else {
        _vrCtx.fillStyle = opt.action === "exit"
          ? "rgba(160, 0, 0, 0.22)"
          : "rgba(255,255,255,0.055)";
      }
      _roundRect(_vrCtx, btnX, y, btnW, btnH, 14);
      _vrCtx.fill();
      _vrCtx.shadowBlur = 0;

      // Borde del botón
      _vrCtx.strokeStyle = sel
        ? "rgba(255,255,255,0.55)"
        : opt.action === "exit"
          ? "rgba(220,0,0,0.4)"
          : "rgba(255,255,255,0.1)";
      _vrCtx.lineWidth = sel ? 2.5 : 1.5;
      _roundRect(_vrCtx, btnX, y, btnW, btnH, 14);
      _vrCtx.stroke();

      // Reflejo interior
      _vrCtx.fillStyle = "rgba(255,255,255,0.05)";
      _roundRect(_vrCtx, btnX, y, btnW, btnH / 2, 14);
      _vrCtx.fill();

      // Texto del botón
      _vrCtx.fillStyle    = sel ? "#000" : (opt.action === "exit" ? "#ff7070" : "#fff");
      _vrCtx.font         = `bold ${sel ? 42 : 37}px Arial`;
      _vrCtx.textAlign    = "center";
      _vrCtx.textBaseline = "middle";
      _vrCtx.fillText(`${opt.icon}   ${opt.label}`, W / 2, y + btnH / 2);
    });

    // Hint de controles en el footer
    _vrCtx.fillStyle    = "rgba(255,255,255,0.28)";
    _vrCtx.font         = "22px Arial";
    _vrCtx.textAlign    = "center";
    _vrCtx.textBaseline = "bottom";
    _vrCtx.fillText(
      "🕹 Stick Y: Navegar   •   Trigger: Seleccionar   •   Click Stick: Cerrar",
      W / 2, H - 14
    );

    _vrTex.needsUpdate = true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAUSE / RESUME
  // ─────────────────────────────────────────────────────────────────────────
  function pause() {
    _isPaused = true;

    if (_isVR()) {
      // — Modo VR: panel 3D —
      _vrNavIdx = 0;
      _drawVRPanel();
      _vrPanel.visible = true;

    } else {
      // — Modo PC: overlay HTML —
      // Mostrar botón VR sólo si está disponible
      const vrBtnEl   = document.getElementById("pauseBtnVR");
      const vrDomBtn  = document.querySelector(".vr-button");
      const vrReady   = vrDomBtn && vrDomBtn.style.display !== "none";
      if (vrBtnEl) vrBtnEl.style.display = (vrReady && onEnterVR) ? "flex" : "none";

      overlay.style.display = "flex";

      // Re-disparar animación de entrada del panel
      const panel = document.getElementById("pausePanel");
      if (panel) {
        panel.style.animation = "none";
        void panel.offsetWidth;           // reflow para reiniciar keyframe
        panel.style.animation = "";
      }
    }
  }

  function resume() {
    _isPaused          = false;
    overlay.style.display = "none";
    _vrPanel.visible   = false;
    onContinue();
  }

  function togglePause() {
    // No abrir si el combate no está activo y no estamos ya pausados
    if (!_isPaused && !_canOpen()) return;
    _isPaused ? resume() : pause();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DETECCIÓN DE BOTONES VR
  // ─────────────────────────────────────────────────────────────────────────
  function _justPressed(source, idx, btn) {
    const k   = `${source.handedness}-${idx}`;
    const was = _vrPrev.get(k) || false;
    const now = !!btn && (btn.pressed || btn.value > 0.45);
    _vrPrev.set(k, now);
    return now && !was;
  }

  function _selectVROption() {
    const action = VR_OPTIONS[_vrNavIdx].action;
    resume();
    if (action === "restart") onRestart();
    else if (action === "exit") onExit();
    // "continue" solo llama resume, ya hecho
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE — debe llamarse CADA FRAME desde el game loop
  // ─────────────────────────────────────────────────────────────────────────
  function update(delta) {
    const renderer = getRenderer();
    if (!renderer?.xr?.isPresenting) return;

    const session = renderer.xr.getSession();
    if (!session) return;

    _vrCooldown = Math.max(0, _vrCooldown - delta);

    for (const src of session.inputSources) {
      if (!src.gamepad) continue;
      const gp = src.gamepad;

      // ── Thumbstick click (button[3]) → toggle pausa ──
      if (_justPressed(src, 3, gp.buttons[3])) {
        togglePause();
        return;   // procesamos un evento a la vez
      }

      if (!_isPaused) continue;

      // ── Trigger (button[0]) → confirmar opción ──
      if (_justPressed(src, 0, gp.buttons[0])) {
        _selectVROption();
        return;
      }

      // ── Thumbstick Y → navegar opciones ──
      const sy = gp.axes[3] ?? gp.axes[1] ?? 0;
      if (Math.abs(sy) > 0.5 && _vrCooldown === 0) {
        _vrNavIdx = (_vrNavIdx + (sy > 0 ? 1 : -1) + VR_OPTIONS.length) % VR_OPTIONS.length;
        _drawVRPanel();
        _vrCooldown = 0.27;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // API PÚBLICA
  // ─────────────────────────────────────────────────────────────────────────
  return {
    togglePause,
    isPaused: () => _isPaused,
    pause,
    resume,
    update
  };
}
