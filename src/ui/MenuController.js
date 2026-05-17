export function setupMenu({
  onFightStart,
  onPlayerPrev,
  onPlayerNext,
  onEnemyPrev,
  onEnemyNext
}) {
  const fightBtn = document.getElementById("fightBtn");
  const overlay = document.getElementById("menuOverlay");

  const playerPrev = document.getElementById("playerPrev");
  const playerNext = document.getElementById("playerNext");
  const enemyPrev = document.getElementById("enemyPrev");
  const enemyNext = document.getElementById("enemyNext");

  function setLoading() {
    fightBtn.disabled = true;
    fightBtn.textContent = "Cargando...";
  }

  function setReady() {
    fightBtn.disabled = false;
    fightBtn.textContent = "Luchar";
  }

  playerPrev.onclick = onPlayerPrev;
  playerNext.onclick = onPlayerNext;
  enemyPrev.onclick = onEnemyPrev;
  enemyNext.onclick = onEnemyNext;

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