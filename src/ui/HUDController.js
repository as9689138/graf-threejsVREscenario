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
        if (percentage > 50) return "#00ff00"; // Verde
        if (percentage > 20) return "#ffff00"; // Amarillo
        return "#ff0000"; // Rojo
    }

    function update(playerHealth, playerMax, enemyHealth, enemyMax, timeStr, roundNum, isVR, gameState) {
        currentIsVR = isVR; // Actualizamos la memoria constantemente
        
        if (gameState === 'ANNOUNCING' || gameState === 'KO') return;

        const p1 = Math.max(0, (playerHealth / playerMax) * 100);
        const p2 = Math.max(0, (enemyHealth / enemyMax) * 100);

        // 1. Actualizar HTML (PC) - Solo si NO estamos en VR
        if (!currentIsVR) {
            hpPlayer.style.width = `${p1}%`;
            hpPlayer.style.backgroundColor = getColor(p1);
            hpEnemy.style.width = `${p2}%`;
            hpEnemy.style.backgroundColor = getColor(p2);
            timerText.textContent = timeStr;
            roundText.textContent = `ROUND ${roundNum}`;
        }

        // 2. Actualizar Panel 3D (VR) - Solo si SÍ estamos en VR
        if (currentIsVR) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, "rgba(0,0,0,0.8)");
            gradient.addColorStop(1, "rgba(0,0,0,0)");   
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 40px Arial";
            
            ctx.textAlign = "left";
            ctx.fillText(`JUGADOR`, 100, 80);
            
            ctx.textAlign = "right";
            ctx.fillText(`IA OPONENTE`, canvas.width - 100, 80);

            ctx.textAlign = "center";
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 45px Arial";
            ctx.fillText(`ROUND ${roundNum}`, canvas.width / 2, 80);

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 60px monospace";
            ctx.fillText(timeStr, canvas.width / 2, 150);

            const barWidth = 600;
            const barHeight = 35;

            ctx.fillStyle = "#333333"; 
            ctx.fillRect(100, 110, barWidth, barHeight);
            ctx.fillStyle = getColor(p1); 
            ctx.fillRect(100, 110, (p1 / 100) * barWidth, barHeight);
            ctx.strokeStyle = "#ffffff"; 
            ctx.lineWidth = 4;
            ctx.strokeRect(100, 110, barWidth, barHeight);

            const enemyX = canvas.width - 100 - barWidth;
            ctx.fillStyle = "#333333";
            ctx.fillRect(enemyX, 110, barWidth, barHeight);
            ctx.fillStyle = getColor(p2);
            ctx.fillRect(enemyX + (barWidth - (p2 / 100) * barWidth), 110, (p2 / 100) * barWidth, barHeight);
            ctx.strokeRect(enemyX, 110, barWidth, barHeight);

            ctx.textAlign = "left";
            vrTexture.needsUpdate = true;
        }
    }

    function showAnnouncer(text, duration = 2000, color = "#ff0000") {
        return new Promise(resolve => {
            // === RUTINA PARA PC (3D NORMAL) ===
            if (!currentIsVR) {
                htmlAnnouncer.textContent = text;
                htmlAnnouncer.style.display = "block";
                htmlAnnouncer.style.color = "#ffffff";
                htmlAnnouncer.style.textShadow = `0px 0px 20px ${color}, 4px 4px 0px #000`;
                vrHUD.visible = false; // Apagamos a la fuerza el panel fantasma
            } 
            // === RUTINA PARA REALIDAD VIRTUAL ===
            else {
                htmlAnnouncer.style.display = "none"; // Apagamos a la fuerza el texto HTML
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "rgba(0,0,0,0.8)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 150px Arial"; 
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.shadowColor = color;
                ctx.shadowBlur = 40;
                ctx.fillText(text, canvas.width / 2, canvas.height / 2);
                ctx.shadowBlur = 0;
                
                ctx.textBaseline = "alphabetic"; 
                ctx.textAlign = "left"; 
                
                vrTexture.needsUpdate = true;
                vrHUD.visible = true; // Solo lo encendemos si estamos en VR
            }

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