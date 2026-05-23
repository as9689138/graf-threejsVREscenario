import { Audio, AudioListener, AudioLoader } from "three";

export function setupAudio(camera, manager) {
  const listener = new AudioListener();
  camera.add(listener);
  const audioLoader = new AudioLoader(manager);

  //=================================================
  // MÚSICA DE FONDO (MENÚ)
  //=================================================
  const sound = new Audio(listener);
  audioLoader.load("assets/audio/Burning_Heart.mpeg", function (buffer) {
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(0.5);
  });

  //=================================================
  // CINEMÁTICA (LOS 4 AUDIOS)
  //=================================================
  const intro1 = new Audio(listener);
  const intro2 = new Audio(listener);
  const intro3 = new Audio(listener);
  const intro4 = new Audio(listener);

  audioLoader.load("assets/audio/p1_inicio.mp3", (b) => intro1.setBuffer(b));
  audioLoader.load("assets/audio/p2_inicio.mp3", (b) => intro2.setBuffer(b));
  audioLoader.load("assets/audio/p3_inicio.mp3", (b) => intro3.setBuffer(b));
  audioLoader.load("assets/audio/p4_inicio.mp3", (b) => intro4.setBuffer(b));

  //=================================================
  // AMBIENTE DE MULTITUD (NUEVOS)
  //=================================================
  const crowdLoop = new Audio(listener);
  audioLoader.load("assets/audio/Gente loop.mp3", function (buffer) {
    crowdLoop.setBuffer(buffer);
    crowdLoop.setLoop(true);
    crowdLoop.setVolume(0.4); 
  });

  const crowdStart = new Audio(listener);
  audioLoader.load("assets/audio/Gente_Inicio.mp3", (b) => {
    crowdStart.setBuffer(b);
    crowdStart.setVolume(0.5); // Volumen ajustado a 0.5 como pediste
  });

  const ovationPlayer = new Audio(listener);
  audioLoader.load("assets/audio/Ovacion.mp3", (b) => {
    ovationPlayer.setBuffer(b);
    ovationPlayer.setVolume(1.0);
  });

  const ovationEnemy = new Audio(listener);
  // Reemplazado para que use el mismo archivo de Ovacion.mp3
  audioLoader.load("assets/audio/Ovacion.mp3", (b) => {
    ovationEnemy.setBuffer(b);
    ovationEnemy.setVolume(1.0);
  });

  const winnerSound = new Audio(listener);
  audioLoader.load("assets/audio/Ganador.mp3", (b) => {
    winnerSound.setBuffer(b);
    winnerSound.setVolume(1.0);
  });

  //=================================================
  // EFECTOS (CAMPANA Y GOLPE)
  //=================================================
  const bellSound = new Audio(listener);
  audioLoader.load("assets/audio/campana.mpeg", function (buffer) {
    bellSound.setBuffer(buffer);
    bellSound.setLoop(false);
    bellSound.setVolume(0.9);
  });

  const punchSound = new Audio(listener);
  audioLoader.load("assets/audio/golpe.mpeg", function (buffer) {
    punchSound.setBuffer(buffer);
    punchSound.setLoop(false);
    punchSound.setVolume(1.8);
  });

  //=================================================
  // ACTIVAR AUDIO Y CONTROLES
  //=================================================
  window.addEventListener("click", () => {
    const menu = document.getElementById("menuOverlay");
    if (menu && menu.style.display !== "none") {
      if (!sound.isPlaying && sound.buffer) {
        sound.play();
      }
    }
  });

  function stopMenuMusic() {
    if (sound.isPlaying) sound.stop();
  }

  function playMenuMusic() {
    if (!sound.isPlaying && sound.buffer) sound.play();
  }

  function playCinematicPhase(phase, onComplete) {
    const audios = [intro1, intro2, intro3, intro4];
    const target = audios[phase - 1];

    if (target && target.buffer) {
      target.setVolume(1.0);
      target.play();
      
      setTimeout(() => {
        if (phase === 2 && ovationPlayer.buffer) {
          ovationPlayer.play();
          setTimeout(() => { if (onComplete) onComplete(); }, ovationPlayer.buffer.duration * 1000);
        } 
        else if (phase === 3 && ovationEnemy.buffer) {
          ovationEnemy.play();
          setTimeout(() => { if (onComplete) onComplete(); }, ovationEnemy.buffer.duration * 1000);
        } 
        else {
          if (onComplete) onComplete();
        }
      }, target.buffer.duration * 1000);
      
    } else {
      setTimeout(() => { if (onComplete) onComplete(); }, 3000);
    }
  }

  // --- LÓGICA DE AMBIENTE CON EMPALME PARA EVITAR SILENCIOS ---
  function startCrowd() {
    if (crowdStart.buffer && !crowdStart.isPlaying) {
      crowdStart.play(); 
      
      // Restamos 300ms para que el loop arranque un instante antes de que acabe el grito
      const overlapTime = Math.max(0, (crowdStart.buffer.duration * 1000) - 300);
      
      setTimeout(() => {
        const menu = document.getElementById("menuOverlay");
        if (menu && menu.style.display === "none") {
          if (crowdLoop.buffer && !crowdLoop.isPlaying) {
            crowdLoop.play();
          }
        }
      }, overlapTime);
      
    } else {
      if (crowdLoop.buffer && !crowdLoop.isPlaying) {
        crowdLoop.play();
      }
    }
  }

  // --- FUNCIÓN PARA REPETIR EL GRITO DE INICIO ---
  function playCrowdCheer() {
    if (crowdStart.buffer) {
      if (crowdStart.isPlaying) crowdStart.stop();
      crowdStart.play();
    }
  }

  function stopCrowd() {
    if (crowdStart.isPlaying) crowdStart.stop();
    if (crowdLoop.isPlaying) crowdLoop.stop();
  }

  function playWinner() {
    if (winnerSound.buffer && !winnerSound.isPlaying) winnerSound.play();
  }

  function playBell() {
    if (bellSound.buffer && !bellSound.isPlaying) bellSound.play();
  }

  function playPunch() {
    if (punchSound && punchSound.buffer) {
      if (punchSound.isPlaying) punchSound.stop();
      punchSound.play();
    }
  }

  function playFightMusic() {
    // Vacío intencionalmente
  }

  return {
    listener, audioLoader, sound, bellSound, punchSound,
    playBell, playPunch, playFightMusic,
    playCinematicPhase, stopMenuMusic, playMenuMusic,
    startCrowd, stopCrowd, playWinner, playCrowdCheer // <-- Exportamos la nueva función
  };
}