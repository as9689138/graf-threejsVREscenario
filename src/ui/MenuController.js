export function setupMenu({
  onFightStart,
  onCharacterSwap // 🟢 NUEVO: Función para avisarle al motor 3D
}) {
  const fightBtn = document.getElementById("fightBtn");
  const overlay = document.getElementById("menuOverlay");

  const playerPrev = document.getElementById("playerPrev");
  const playerNext = document.getElementById("playerNext");
  const enemyPrev = document.getElementById("enemyPrev");
  const enemyNext = document.getElementById("enemyNext");

  // Capturamos las etiquetas <img> del HTML para cambiar sus fotos
  const playerImg = document.querySelector("#playerViewer img");
  const enemyImg = document.querySelector("#enemyViewer img");

  // Por defecto, el jugador es CR7
  let isPlayerCR7 = true;

  function setLoading() {
    fightBtn.disabled = true;
    fightBtn.textContent = "CARGANDO RECURSOS...";
  }

  function setReady() {
    fightBtn.disabled = false;
    fightBtn.textContent = "Luchar";
  }

  // 🔄 FUNCIÓN MAESTRA DE INTERCAMBIO (SWAP)
  function handleSwap() {
    isPlayerCR7 = !isPlayerCR7; // Invertimos el valor (Verdadero a Falso, Falso a Verdadero)

    if (isPlayerCR7) {
      playerImg.src = "assets/textures/avatar_jugador.png"; // Cristiano a la izquierda
      enemyImg.src = "assets/textures/avatar_enemigo.png";  // Messi a la derecha
    } else {
      playerImg.src = "assets/textures/avatar_enemigo.png"; // Messi a la izquierda
      enemyImg.src = "assets/textures/avatar_jugador.png";  // Cristiano a la derecha
    }

    // Le enviamos la decisión final a main.js
    if (onCharacterSwap) onCharacterSwap(isPlayerCR7);
  }

  // Las 4 flechas hacen exactamente lo mismo: cruzar a los personajes
  playerPrev.onclick = handleSwap;
  playerNext.onclick = handleSwap;
  enemyPrev.onclick = handleSwap;
  enemyNext.onclick = handleSwap;

  fightBtn.addEventListener("click", () => {
    overlay.style.display = "none";
    onFightStart();
  });

  return {
    fightBtn,
    overlay,
    setLoading,
    setReady
  };
}