import * as THREE from "three";

export function createHUDController(camera) {
    const htmlHUD = document.getElementById("gameHUD");
    const htmlAnnouncer = document.getElementById("announcer");
    const hpPlayer = document.getElementById("hp-player");
    const hpEnemy = document.getElementById("hp-enemy");
    const roundText = document.getElementById("hud-round");
    const timerText = document.getElementById("hud-timer");

    // --- NUEVO: Memoria para saber en qué modo estamos ---
    let currentIsVR = false;

    // --- PANEL 3D PARA VR ---
    const canvas = document.createElement("canvas");
    canvas.width = 2048;  
    canvas.height = 512; 
    const ctx = canvas.getContext("2d");
    
    const vrTexture = new THREE.CanvasTexture(canvas);
    vrTexture.colorSpace = THREE.SRGBColorSpace; 
    
    const vrMaterial = new THREE.MeshBasicMaterial({ 
        map: vrTexture, 
        transparent: true, 
        depthTest: false 
    });
    
    const vrHUD = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.0), vrMaterial);
    
    vrHUD.position.set(0, 0.4, -2.0);
    vrHUD.rotation.set(0, 0, 0); 
    
    vrHUD.renderOrder = 999; 
    vrHUD.frustumCulled = false; 
    
    camera.add(vrHUD);
    vrHUD.visible = false;

    function getColor(percentage) {
        if (percentage > 55) return "#00cc55";   // verde vibrante
        if (percentage > 25) return "#ffaa00";   // naranja/dorado
        return "#ff3333";                         // rojo alerta
    }

    // Glow que acompaña al color de la barra
    function getGlow(percentage) {
        if (percentage > 55) return "rgba(0, 204, 85,  0.55)";
        if (percentage > 25) return "rgba(255,170, 0,  0.55)";
        return                       "rgba(255, 51,51,  0.60)";
    }

    // ── Helpers de canvas ──────────────────────────────────────────────────

    // Rectángulo redondeado para canvas 2D
    function _roundRectVR(c, x, y, w, h, r) {
        if (w <= 0) return;
        r = Math.min(r, w / 2, h / 2);
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.arcTo(x + w, y,     x + w, y + r,     r);
        c.lineTo(x + w, y + h - r);
        c.arcTo(x + w, y + h, x + w - r, y + h, r);
        c.lineTo(x + r, y + h);
        c.arcTo(x, y + h,     x, y + h - r,     r);
        c.lineTo(x, y + r);
        c.arcTo(x, y,         x + r, y,          r);
        c.closePath();
    }

    // Aclara un color hex sumándole blanco
    function lighten(hex, amount) {
        const n = parseInt(hex.slice(1), 16);
        const r = Math.min(255, (n >> 16) + Math.round(amount * 255));
        const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(amount * 255));
        const b = Math.min(255, (n & 0xff) + Math.round(amount * 255));
        return `rgb(${r},${g},${b})`;
    }

    // Oscurece un color hex
    function darken(hex, amount) {
        const n = parseInt(hex.slice(1), 16);
        const r = Math.max(0, (n >> 16) - Math.round(amount * 255));
        const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(amount * 255));
        const b = Math.max(0, (n & 0xff) - Math.round(amount * 255));
        return `rgb(${r},${g},${b})`;
    }

    function update(playerHealth, playerMax, enemyHealth, enemyMax, timeStr, roundNum, isVR, gameState) {
        currentIsVR = isVR; // Actualizamos la memoria constantemente
        
        if (gameState === 'ANNOUNCING' || gameState === 'KO') return;

        const p1 = Math.max(0, (playerHealth / playerMax) * 100);
        const p2 = Math.max(0, (enemyHealth / enemyMax) * 100);

        // 1. Actualizar HTML (PC) - Solo si NO estamos en VR
        if (!currentIsVR) {
            const playerColor = getColor(p1);
            const enemyColor  = getColor(p2);

            // Barras de vida con glow dinámico
            hpPlayer.style.width = `${p1}%`;
            hpPlayer.style.backgroundColor = playerColor;
            hpPlayer.style.boxShadow = `0 0 8px ${getGlow(p1)}, 0 0 18px ${getGlow(p1)}`;

            hpEnemy.style.width = `${p2}%`;
            hpEnemy.style.backgroundColor = enemyColor;
            hpEnemy.style.boxShadow = `0 0 8px ${getGlow(p2)}, 0 0 18px ${getGlow(p2)}`;

            // Pulso de vida baja / crítica
            hpPlayer.classList.toggle('low-health',      p1 <= 30 && p1 > 15);
            hpPlayer.classList.toggle('critical-health', p1 <= 15);
            hpEnemy.classList.toggle('low-health',       p2 <= 30 && p2 > 15);
            hpEnemy.classList.toggle('critical-health',  p2 <= 15);

            // Timer con data-text para el efecto ::before glow del CSS
            timerText.textContent = timeStr;
            timerText.setAttribute('data-text', timeStr);

            // Clases de advertencia de tiempo
            const parts     = timeStr.split(':');
            const totalSecs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            timerText.classList.toggle('warning',  totalSecs <= 30 && totalSecs > 10);
            timerText.classList.toggle('critical', totalSecs <= 10);

            roundText.textContent = `ROUND ${roundNum}`;
        }

        // 2. Actualizar Panel 3D (VR) - Solo si SÍ estamos en VR
        if (currentIsVR) {
            const W = canvas.width;   // 2048
            const H = canvas.height;  // 512

            ctx.clearRect(0, 0, W, H);

            // ── Fondo degradado del panel ──
            const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
            bgGrad.addColorStop(0,   "rgba(0,0,0,0.88)");
            bgGrad.addColorStop(0.6, "rgba(0,0,0,0.50)");
            bgGrad.addColorStop(1,   "rgba(0,0,0,0)");
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            // ── Línea dorada superior decorativa ──
            const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
            lineGrad.addColorStop(0,    "transparent");
            lineGrad.addColorStop(0.15, "rgba(255,215,0,0.6)");
            lineGrad.addColorStop(0.85, "rgba(255,215,0,0.6)");
            lineGrad.addColorStop(1,    "transparent");
            ctx.strokeStyle = lineGrad;
            ctx.lineWidth   = 2;
            ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(W, 4); ctx.stroke();

            // ══════════════════════════════════════════
            // HELPER — barra de vida en canvas
            // ══════════════════════════════════════════
            function drawHealthBar(x, y, bw, bh, pct, color, glow, mirrored) {
                const filled = (pct / 100) * bw;

                // Fondo oscuro
                ctx.fillStyle = "rgba(0,0,0,0.55)";
                _roundRectVR(ctx, x, y, bw, bh, 4);
                ctx.fill();

                // Borde sutil
                ctx.strokeStyle = "rgba(255,255,255,0.10)";
                ctx.lineWidth = 1.5;
                _roundRectVR(ctx, x, y, bw, bh, 4);
                ctx.stroke();

                if (pct > 0) {
                    const bx = mirrored ? x + bw - filled : x;

                    // Glow exterior de la barra
                    ctx.shadowColor = glow;
                    ctx.shadowBlur  = 18;

                    // Relleno con gradiente vertical
                    const vGrad = ctx.createLinearGradient(0, y, 0, y + bh);
                    vGrad.addColorStop(0,   lighten(color, 0.3));
                    vGrad.addColorStop(0.45, color);
                    vGrad.addColorStop(1,   darken(color, 0.25));
                    ctx.fillStyle = vGrad;
                    _roundRectVR(ctx, bx, y, filled, bh, 4);
                    ctx.fill();

                    ctx.shadowBlur = 0;

                    // Shine superior
                    const shineGrad = ctx.createLinearGradient(0, y, 0, y + bh * 0.5);
                    shineGrad.addColorStop(0, "rgba(255,255,255,0.22)");
                    shineGrad.addColorStop(1, "transparent");
                    ctx.fillStyle = shineGrad;
                    _roundRectVR(ctx, bx, y, filled, bh * 0.5, 4);
                    ctx.fill();
                }
            }

            // ══════════════════════════════════════════
            // ZONA JUGADOR (izquierda)
            // ══════════════════════════════════════════
            const margin  = 70;
            const barW    = 720;
            const barH    = 38;
            const nameY   = 80;
            const barY    = 102;
            const pColor  = getColor(p1);
            const pGlow   = getGlow(p1);

            // Nombre
            ctx.fillStyle    = "rgba(255,255,255,0.48)";
            ctx.font         = "bold 30px Arial";
            ctx.textAlign    = "left";
            ctx.textBaseline = "top";
            ctx.letterSpacing = "3px";
            ctx.fillText("JUGADOR", margin, nameY);

            // Barra
            drawHealthBar(margin, barY, barW, barH, p1, pColor, pGlow, false);

            // Porcentaje numérico
            ctx.fillStyle    = p1 <= 25 ? "#ff3333" : "rgba(255,255,255,0.35)";
            ctx.font         = "bold 26px Arial";
            ctx.textAlign    = "left";
            ctx.fillText(`${Math.round(p1)}%`, margin, barY + barH + 8);

            // ══════════════════════════════════════════
            // ZONA ENEMIGO (derecha, espejada)
            // ══════════════════════════════════════════
            const eColor = getColor(p2);
            const eGlow  = getGlow(p2);
            const eX     = W - margin - barW;

            // Nombre
            ctx.fillStyle    = "rgba(255,255,255,0.48)";
            ctx.font         = "bold 30px Arial";
            ctx.textAlign    = "right";
            ctx.fillText("IA OPONENTE", W - margin, nameY);

            // Barra (de derecha a izquierda)
            drawHealthBar(eX, barY, barW, barH, p2, eColor, eGlow, true);

            // Porcentaje numérico
            ctx.fillStyle    = p2 <= 25 ? "#ff3333" : "rgba(255,255,255,0.35)";
            ctx.font         = "bold 26px Arial";
            ctx.textAlign    = "right";
            ctx.fillText(`${Math.round(p2)}%`, W - margin, barY + barH + 8);

            // ══════════════════════════════════════════
            // ZONA CENTRAL (round + timer)
            // ══════════════════════════════════════════
            const cx = W / 2;

            // Etiqueta ROUND
            ctx.fillStyle    = "#ffd700";
            ctx.font         = "bold 28px Arial";
            ctx.textAlign    = "center";
            ctx.textBaseline = "top";
            ctx.shadowColor  = "rgba(255,215,0,0.55)";
            ctx.shadowBlur   = 14;
            ctx.fillText(`ROUND ${roundNum}`, cx, 55);
            ctx.shadowBlur   = 0;

            // Separadores decorativos laterales del timer
            ctx.strokeStyle = "rgba(255,215,0,0.25)";
            ctx.lineWidth   = 1;
            ctx.beginPath(); ctx.moveTo(cx - 160, 88); ctx.lineTo(cx - 40, 88); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx +  40, 88); ctx.lineTo(cx +160, 88); ctx.stroke();

            // Timer
            const parts    = timeStr.split(':');
            const totalSecs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            const timerColor = totalSecs <= 10 ? "#ff3c3c"
                             : totalSecs <= 30 ? "#ffc400"
                             : "#ffffff";

            ctx.fillStyle    = timerColor;
            ctx.font         = "bold 90px 'Courier New', monospace";
            ctx.textAlign    = "center";
            ctx.textBaseline = "top";
            ctx.shadowColor  = totalSecs <= 10
                ? "rgba(255,60,60,0.7)"
                : totalSecs <= 30
                    ? "rgba(255,196,0,0.6)"
                    : "rgba(255,255,255,0.25)";
            ctx.shadowBlur   = 22;
            ctx.fillText(timeStr, cx, 95);
            ctx.shadowBlur   = 0;

            ctx.textBaseline = "alphabetic";
            ctx.textAlign    = "left";
            vrTexture.needsUpdate = true;
        }
    }

    function showAnnouncer(text, duration = 2000, color = "#ff0000") {
        return new Promise(resolve => {

            // ═══════════════════════════════════════════
            // PC — overlay HTML con animación CSS
            // ═══════════════════════════════════════════
            if (!currentIsVR) {
                vrHUD.visible = false;

                // data-text alimenta el ::before de glow en CSS
                htmlAnnouncer.setAttribute('data-text', text);
                htmlAnnouncer.textContent = text;
                htmlAnnouncer.style.color = "#ffffff";

                // Recalcular color de glow según tipo de mensaje
                const isKO      = text.toUpperCase().includes("K.O") || text.toUpperCase().includes("KO");
                const isFight   = text.toUpperCase().includes("FIGHT") || text.toUpperCase() === "¡PELEA!";
                const glowColor = isKO    ? "rgba(255,30,30,0.95)"
                                : isFight ? "rgba(255,200,0,0.95)"
                                :           `${color}CC`;

                htmlAnnouncer.style.textShadow = [
                    `0 0  30px ${glowColor}`,
                    `0 0  70px ${color}88`,
                    `0 0 120px ${color}44`,
                    "4px 4px 0 rgba(0,0,0,0.55)"
                ].join(", ");

                // Re-disparar la animación CSS reiniciando el elemento
                htmlAnnouncer.style.display   = "none";
                htmlAnnouncer.style.animation = "none";
                void htmlAnnouncer.offsetWidth;           // reflow
                htmlAnnouncer.style.animation = "";
                htmlAnnouncer.style.display   = "block";

            // ═══════════════════════════════════════════
            // VR — panel 3D dibujado en canvas
            // ═══════════════════════════════════════════
            } else {
                htmlAnnouncer.style.display = "none";

                const W = canvas.width;    // 2048
                const H = canvas.height;   // 512
                ctx.clearRect(0, 0, W, H);

                // Fondo oscuro central (no cubre todo, deja espacio)
                const panelH  = 260;
                const panelY  = (H - panelH) / 2;
                const panelPad = 120;

                const bgGrad = ctx.createLinearGradient(0, panelY, 0, panelY + panelH);
                bgGrad.addColorStop(0,   "rgba(0,0,0,0.0)");
                bgGrad.addColorStop(0.2, "rgba(0,0,0,0.82)");
                bgGrad.addColorStop(0.8, "rgba(0,0,0,0.82)");
                bgGrad.addColorStop(1,   "rgba(0,0,0,0.0)");
                ctx.fillStyle = bgGrad;
                ctx.fillRect(panelPad, panelY, W - panelPad * 2, panelH);

                // Líneas decorativas (top & bottom del panel)
                const lineColor = `${color}99`;
                const hLineGrad = ctx.createLinearGradient(panelPad, 0, W - panelPad, 0);
                hLineGrad.addColorStop(0,    "transparent");
                hLineGrad.addColorStop(0.15, lineColor);
                hLineGrad.addColorStop(0.85, lineColor);
                hLineGrad.addColorStop(1,    "transparent");

                ctx.strokeStyle = hLineGrad;
                ctx.lineWidth   = 3;
                ctx.beginPath(); ctx.moveTo(panelPad, panelY + 2);         ctx.lineTo(W - panelPad, panelY + 2);         ctx.stroke();
                ctx.beginPath(); ctx.moveTo(panelPad, panelY + panelH - 2); ctx.lineTo(W - panelPad, panelY + panelH - 2); ctx.stroke();

                // Texto principal — capa de glow (blur)
                ctx.save();
                ctx.filter       = "blur(16px)";
                ctx.fillStyle    = color;
                ctx.font         = "bold 155px Arial";
                ctx.textAlign    = "center";
                ctx.textBaseline = "middle";
                ctx.globalAlpha  = 0.65;
                ctx.fillText(text, W / 2, H / 2);
                ctx.restore();

                // Texto principal — capa sólida
                ctx.fillStyle    = "#ffffff";
                ctx.font         = "bold 155px Arial";
                ctx.textAlign    = "center";
                ctx.textBaseline = "middle";
                ctx.shadowColor  = color;
                ctx.shadowBlur   = 50;
                ctx.fillText(text, W / 2, H / 2);

                // Segunda pasada para intensificar el glow
                ctx.shadowBlur  = 22;
                ctx.fillStyle   = color;
                ctx.globalAlpha = 0.25;
                ctx.fillText(text, W / 2, H / 2);
                ctx.globalAlpha = 1;
                ctx.shadowBlur  = 0;

                // Resetear baselines
                ctx.textBaseline = "alphabetic";
                ctx.textAlign    = "left";

                vrTexture.needsUpdate = true;
                vrHUD.visible = true;
            }

            // ── Timing original intacto ──────────────────
            setTimeout(() => {
                if (!currentIsVR) {
                    htmlAnnouncer.style.display = "none";
                } else {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    vrTexture.needsUpdate = true;
                }
                resolve();
            }, duration);
        });
    }

    function setVisible(visible, isVR) {
        currentIsVR = isVR; // Guardamos el estado al iniciar
        htmlHUD.style.display = visible && !isVR ? "flex" : "none";
        vrHUD.visible = visible && isVR;
    }

    return { update, showAnnouncer, setVisible };
}