import { Audio, AudioListener, AudioLoader } from "three";

export function setupAudio(camera) {
  //=================================================
  // AUDIO
  //=================================================
  const listener = new AudioListener();
  camera.add(listener);

  const audioLoader = new AudioLoader();

  //=================================================
  // MÚSICA DE FONDO
  //=================================================
  const sound = new Audio(listener);

  audioLoader.load("assets/audio/Burning_Heart.mpeg", function (buffer) {
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(0.5);
    sound.play();
  });

  //=================================================
  // CAMPANA
  //=================================================
  const bellSound = new Audio(listener);

  audioLoader.load("assets/audio/campana.mpeg", function (buffer) {
    bellSound.setBuffer(buffer);
    bellSound.setLoop(false);
    bellSound.setVolume(0.9);
  });

  //=================================================
  // GOLPE
  //=================================================
  const punchSound = new Audio(listener);

  audioLoader.load("assets/audio/golpe.mpeg", function (buffer) {
    punchSound.setBuffer(buffer);
    punchSound.setLoop(false);
    punchSound.setVolume(1.8);
  });

  //=================================================
  // ACTIVAR AUDIO
  //=================================================
  window.addEventListener("click", () => {
    if (!sound.isPlaying && sound.buffer) {
      sound.play();
    }
  });

  function playBell() {
    if (bellSound.buffer && !bellSound.isPlaying) {
      bellSound.play();
    }
  }

  function playPunch() {
    if (punchSound && punchSound.buffer) {
      if (punchSound.isPlaying) punchSound.stop();
      punchSound.play();
    }
  }

  function playFightMusic() {
    audioLoader.load("assets/audio/Fanfare.mpeg", function (buffer) {
      sound.stop();
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(0.4);
      sound.play();
    });
  }

  return {
    listener,
    audioLoader,
    sound,
    bellSound,
    punchSound,
    playBell,
    playPunch,
    playFightMusic
  };
}