import { Audio, AudioListener, AudioLoader } from "three";

export function setupAudio(camera) {
  const listener = new AudioListener();
  camera.add(listener);
  const audioLoader = new AudioLoader();

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
    // Solo permitimos que el clic encienda la música si estamos en el menú
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
        if (onComplete) onComplete();
      }, target.buffer.duration * 1000);
    } else {
      // Respaldo por si falla la carga (espera 3 segundos y avanza)
      setTimeout(() => { if (onComplete) onComplete(); }, 3000);
    }
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
    // Vacío intencionalmente para que NO suene música durante el combate
  }

  return {
    listener, audioLoader, sound, bellSound, punchSound,
    playBell, playPunch, playFightMusic,
    playCinematicPhase, stopMenuMusic, playMenuMusic
  };
}