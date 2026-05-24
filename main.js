import * as THREE from "three";

import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
//import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

import { createCharacterData } from "./src/characters/CharacterData.js";
import { setupMorphTargets } from "./src/characters/MorphTargets.js";
import { createBoxingRing } from "./src/world/BoxingRing.js";
import { setupLighting } from "./src/world/Lighting.js";
import { setupAudio } from "./src/audio/AudioManager.js";
import { updateAI } from "./src/ai/AIController.js";
import { updateFacing } from "./src/combat/FacingSystem.js";
import { loadAllAnimations } from "./src/animations/AnimationLoader.js";
import { loadCharacters } from "./src/characters/CharacterLoader.js";
import { bindAnimations } from "./src/animations/AnimationBinder.js";
import { handleResize } from "./src/core/ResizeHandler.js";
import { updateGameLoop } from "./src/core/GameLoop.js";
import { setupMenu } from "./src/ui/MenuController.js";
import { createSceneSetup } from "./src/core/SceneSetup.js";
import { setupGUI } from "./src/ui/GUIController.js";
import { createHUDController } from "./src/ui/HUDController.js";
// VR
import { setupVR } from "./src/vr/VRManager.js";
import { createVRPlayerRig } from "./src/vr/VRPlayerRig.js";
import { setupVRInput } from "./src/vr/VRInputController.js";
import { createVRButtonMapper } from "./src/vr/VRButtonMapper.js";
import { updateVRLocomotion } from "./src/vr/VRLocomotion.js";
import {
  switchAction,
  playReadyIdle,
  playIntroToFight,
  playFightIdle,
  playBoxAction,
  playPunchAction,
  startEnemyCombo,
  playNextComboAction,
  playVictoryAnimation,
  playKnockoutAnimation,
  //VR
  playVRMovementAnimation,

} from "./src/animations/AnimationController.js";

import {
  resolveBodyCollisions,
  checkHits,
  triggerHitReaction,
} from "./src/combat/CombatSystem.js";

import {
  stepDistances,
  enemyPunches,
  punchTypes,
  cameraConfig,
  ringConfig,
} from "./src/config/gameConfig.js";

import { updateCamera, 
  handleCameraZoom, 
  updateCinematicCamera,
  updateVictoryCamera 
} from "./src/camera/CameraController.js";

import {
  handleKeyDown,
  handleKeyUp,
  checkAndPlayMovement,
} from "./src/input/InputController.js";

import {
  startStepMovement,
  updateStepMovement,
} from "./src/movement/MovementSystem.js";

// VR
import { findHeadBone, syncVRRigToPlayerHead } from "./src/vr/VRHeadSync.js";

const manager = new THREE.LoadingManager();

let camera, scene, renderer, composer, stats, loader, guiMorphsFolder, controls;
let flashParticles;

let player = createCharacterData();
let enemy = createCharacterData();
let allClips = {};

let keysPressed = {};

let cameraMode = cameraConfig.mode;
let camDistMode1 = cameraConfig.camDistMode1;

let gameStarted = false;
let audioManager;
let hudController; // NUEVO

// --- SISTEMA DE ROUNDS Y ESTADOS ---
let gameState = "MENU"; // MENU, ANNOUNCING, FIGHTING, KO, CINEMATIC, VICTORY_CINEMATIC
let currentRound = 1;
let roundTimer = 60; // 1 minuto (60 segundos)
let lastTime = 0;

let cinematicState = { phase: 0, time: 0 };
let victoryState = { phase: 0, time: 0, winner: null, loser: null, isPlayerWinner: false }; // <-- AÑADIDO

let playerIndex = 0;
let enemyIndex = 0;

let menuController;

let knockoutHandled = false;

// VARIABLES DE REALIDAD VIRTUAL
let vrManager;

let vrPlayerRig;
let playerHeadBone = null;

let vrButtonMapper;

const idealLookAt = new THREE.Vector3();
const idealPos = new THREE.Vector3();
const currentLookAt = new THREE.Vector3(0, 90, 0);

const clock = new THREE.Clock();

const params = { asset: "mixamo" };
const assets = ["mixamo"];

init();

function init() {
  menuController = setupMenu({
    onFightStart: () => {
      startNewMatch(); // LLAMADA AL NUEVO SISTEMA
    },

    onPlayerPrev: () => {
      playerIndex--;
      console.log("Player index:", playerIndex);
    },

    onPlayerNext: () => {
      playerIndex++;
      console.log("Player index:", playerIndex);
    },

    onEnemyPrev: () => {
      enemyIndex--;
      console.log("Enemy index:", enemyIndex);
    },

    onEnemyNext: () => {
      enemyIndex++;
      console.log("Enemy index:", enemyIndex);
    },
  });

  menuController.setLoading();

  if (vrManager) {
    vrManager.setVRLoading();
  }

  manager.onLoad = () => {
    console.log("Todo cargado");
    setGameReady();
  };

  const setup = createSceneSetup({ animate });

  camera = setup.camera;
  scene = setup.scene;
  renderer = setup.renderer;
  composer = setup.composer;
  controls = setup.controls;
  stats = setup.stats;

  //=================================================
  // ILUMINACIÓN
  //=================================================
  setupLighting(scene);

  //=================================================
  // AUDIO
  //=================================================
  audioManager = setupAudio(camera, manager);

  //=================================================
  // Ring / Escenario
  //=================================================
  const ringData = createBoxingRing(scene, manager, ringConfig);
  flashParticles = ringData.flashParticles;

  loader = new FBXLoader(manager);

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("wheel", onMouseWheel);

  const guiController = setupGUI({
    params,
    assets,
    onAssetChange: loadAsset,
  });

  guiMorphsFolder = guiController.guiMorphsFolder;

  loadAsset(params.asset);

  stats.dom.style.display = "none"; // Adiós FPS
  guiController.gui.hide();
  hudController = createHUDController(camera);
}

//=================================================
// VR
//=================================================
vrManager = setupVR({
  renderer,
  scene,
});

vrManager.setVRLoading();

vrPlayerRig = createVRPlayerRig({
  camera,
  scene,
});

// PROTECCIÓN DE CÁMARA DE VISTA 3D FRENTE A VR
renderer.xr.addEventListener("sessionstart", () => {
  vrPlayerRig.enterVRPose();

  if (gameState === "MENU") {
    startNewMatch();
  }
});

renderer.xr.addEventListener("sessionend", () => {
  vrPlayerRig.exitVRPose();

  // === LIMPIEZA EXTREMA: Restauramos el mundo 3D ===
  // 1. Reseteamos el cuerpo invisible del VR a su origen para que no estorbe tus cámaras 1 y 2
  vrPlayerRig.rig.position.set(0, 0, 0);
  vrPlayerRig.rig.rotation.set(0, 0, 0);

  // 2. Apagamos los HUDs a la fuerza
  if (hudController) {
    hudController.setVisible(false, false);
  }

  // 3. Reseteamos el estado para que sepa que estamos en el menú
  gameState = "MENU";
  gameStarted = false;

  audioManager.stopCrowd(); // Silenciar al público al forzar la salida
  audioManager.stopFinalCrowd(); // Parar público final si te quitas el visor
  document.getElementById("announcer").style.display = "none"; // Forzar apagado de texto

  // 4. Volvemos a mostrar el menú al salir de VR
  if (menuController && menuController.overlay) {
    menuController.overlay.style.display = "flex";
    audioManager.playMenuMusic();
  }
});

setupVRInput({
  controllerLeft: vrManager.controllerLeft,
  controllerRight: vrManager.controllerRight,
});

vrButtonMapper = createVRButtonMapper({
  getRenderer: () => renderer,
  getPlayer: () => player,
  playPunchAction,
});

// =======================================================

function loadAsset(asset) {
  const loaded = loadCharacters({
    scene,
    loader,
    manager,
    asset,
    player,
    enemy,
    guiMorphsFolder,
    setupMorphTargets,

    resetState: () => {
      allClips = {};
      keysPressed = {};
    },

    loadAllAnimations: (loadedPlayer, loadedEnemy) => {
      loadAllAnimations({
        manager,
        allClips,
        onComplete: () => {
          playerHeadBone = findHeadBone(loadedPlayer.model);

          bindAnimations({
            character: loadedPlayer,
            allClips,
            isPlayer: true,
            keysPressed,
            playFightIdle,
            playNextComboAction,
            checkAndPlayMovement,
            playBoxAction,
            startStepMovement: startCharacterStepMovement,
          });

          bindAnimations({
            character: loadedEnemy,
            allClips,
            isPlayer: false,
            keysPressed,
            playFightIdle,
            playNextComboAction,
            checkAndPlayMovement,
            playBoxAction,
            startStepMovement: startCharacterStepMovement,
          });

          playReadyIdle(loadedPlayer, playIntroToFight);
          playReadyIdle(loadedEnemy, playIntroToFight);
        },
      });
    },
  });

  player = loaded.player;
  enemy = loaded.enemy;
}

function startCharacterStepMovement(character, name, action) {
  startStepMovement(character, name, action, stepDistances);
}

function onMouseWheel(event) {
  camDistMode1 = handleCameraZoom({
    event,
    cameraMode,
    camDistMode1,
    cameraConfig,
  });
}

function onKeyDown(event) {
  handleKeyDown({
    event,
    player,
    keysPressed,
    controls,
    setCameraMode: (mode) => {
      cameraMode = mode;
    },
    playBoxAction,
    playPunchAction,
    startStepMovement: startCharacterStepMovement,
  });
}

function onKeyUp(event) {
  handleKeyUp({
    event,
    keysPressed,
  });
}

function onWindowResize() {
  handleResize({
    camera,
    renderer,
  });
}

function animate() {
  // ==============================
  // ACTUALIZACIÓN DE HUD Y TIEMPO
  // ==============================
  if (gameState === "FIGHTING") {
    const now = performance.now(); // Usamos el tiempo real, sin afectar a Three.js
    if (now - lastTime >= 1000) {
      // Si ya pasó 1 segundo (1000 milisegundos)
      lastTime = now;
      roundTimer--;
      if (roundTimer <= 0) handleRoundEnd();
    }
  }

  updateHUD();

  updateGameLoop({
    clock,
    player,
    enemy,
    gameStarted,
    renderer,
    scene,
    camera,
    stats,

    // Ambiente / postprocesado
    flashParticles,
    composer,

    // VR
    vrPlayerRig,
    playerHeadBone,
    syncVRRigToPlayerHead,
    vrButtonMapper,
    updateVRLocomotion,
    playVRMovementAnimation,

    // Configuración
    ringConfig,
    punchTypes,
    audioManager,

    // Sistemas
    updateFacing,
    updateStepMovement,
    resolveBodyCollisions,
    checkHits,
    triggerHitReaction,
    switchAction,
    updateAI,
    updateCamera,

    // Acciones
    playBoxAction,
    startCharacterStepMovement,
    startEnemyCombo,
    enemyPunches,
    playNextComboAction,
    playFightIdle,

    // Cámara
    controls,
    cameraMode,
    camDistMode1,
    cameraConfig,
    idealLookAt,
    idealPos,
    currentLookAt,

    // Estado del juego
    gameState,

    // KO
    onKnockout: handleKnockout,

    updateCinematicCamera, 
    cinematicState,
    updateVictoryCamera, 
    victoryState 
  });
}

function setGameReady() {
  menuController.setReady();

  if (vrManager) {
    vrManager.setVRReady();
  }
}

// ==========================================
// LÓGICA DE ROUNDS Y K.O.
// ==========================================
function resetPositions() {
  player.model.position.set(-250, 40, -250);
  enemy.model.position.set(250, 40, 250);

  player.isHit = false; enemy.isHit = false;
  player.isMoving = false; enemy.isMoving = false;
  player.isComboing = false; enemy.isComboing = false;
  player.isKnockedOut = false; enemy.isKnockedOut = false;
  player.isCelebrating = false; enemy.isCelebrating = false;

  // Solo los ponemos en "Guardia" si NO están en medio de la entrada épica ni victoria
  if (gameState !== "CINEMATIC" && gameState !== "VICTORY_CINEMATIC") {
    playFightIdle(player);
    playFightIdle(enemy);
  }
}

function startNewMatch() {
  player.maxHealth = 100; player.health = 100; player.isDead = false;
  enemy.maxHealth = 250; enemy.health = 250; enemy.isDead = false;
  currentRound = 1;

  if (menuController && menuController.overlay) menuController.overlay.style.display = "none";

  audioManager.stopMenuMusic(); // Cortamos la música del menú
  audioManager.stopCrowd();     // Por si quedó reproduciendo de la partida anterior
  audioManager.stopFinalCrowd(); // Paramos sonido de victoria anterior

  // RESET FUERTE DE CÁMARA Y CONTROLS
  camera.position.set(0, 120, 300);

  camera.rotation.set(0, 0, 0);
  camera.quaternion.identity();

  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.set(0, 90, 0);

    controls.object.position.copy(camera.position);

    controls.update();
  }

  startCinematicSequence();     // ¡Inicia el show!
}

function startCinematicSequence() {
  gameState = "CINEMATIC";
  knockoutHandled = false;
  resetPositions();

  // Los peleadores inician celebrando (bucle)
  playVictoryAnimation(player);
  playVictoryAnimation(enemy);

  hudController.setVisible(false, renderer.xr.isPresenting);
  
  // ARRANCA LA EMOCIÓN DESDE LA FASE 1
  audioManager.startCrowd(); 
  
  runCinematicPhase(1);
}

function runCinematicPhase(phase) {
  cinematicState.phase = phase;
  cinematicState.time = 0;

  if (renderer.xr.isPresenting) setupVRCinematicPose(phase);

  if (phase > 4) {
    finishCinematic();
    return;
  }

  // Reproduce el audio de la fase y al terminar salta a la siguiente
  audioManager.playCinematicPhase(phase, () => {
    if (gameState === "CINEMATIC") runCinematicPhase(phase + 1);
  });
}

function setupVRCinematicPose(phase) {
  if (phase === 1) {
    // Fase 1: Mirando 45 grados hacia abajo (para clavar la vista en el logo)
    vrPlayerRig.rig.rotation.set(-Math.PI / 4, 0, 0); 
  } else if (phase === 2) {
    // Fase 2: Mirando hacia la esquina del JUGADOR
    vrPlayerRig.rig.rotation.set(0, Math.PI * 0.25, 0); 
  } else if (phase === 3) {
    // Fase 3: Mirando hacia la esquina del OPONENTE
    vrPlayerRig.rig.rotation.set(0, -Math.PI * 0.75, 0);
  } else if (phase === 4) {
    // Fase 4: Entrando al cuerpo
    vrPlayerRig.rig.rotation.set(0, 0, 0);
  }
}

async function finishCinematic() {
  // === ESTA ES LA CLAVE PARA DESCONGELARLOS ===
  player.isCelebrating = false;
  enemy.isCelebrating = false;
  player.isMoving = false;
  enemy.isMoving = false;

  // Transición suave de la celebración a la guardia de pelea
  playReadyIdle(player, playIntroToFight);
  playReadyIdle(enemy, playIntroToFight);

  gameState = "ANNOUNCING";
  hudController.setVisible(true, renderer.xr.isPresenting);
  
  await hudController.showAnnouncer(`ROUND 1`, 2000);
  
  audioManager.playBell();
  audioManager.playCrowdCheer(); // VUELVE A SONAR EL GRITO AL EMPEZAR LA PELEA
  
  roundTimer = 60;
  lastTime = performance.now();
  gameState = "FIGHTING";
  gameStarted = true;
}

async function startRoundSequence() {
  // Esto se usa exclusivamente para el Round 2, 3, etc.
  knockoutHandled = false;
  gameState = "ANNOUNCING";
  resetPositions();

  await hudController.showAnnouncer(`ROUND ${currentRound}`, 2000);
  
  audioManager.playBell();
  audioManager.playCrowdCheer(); // VUELVE A SONAR EL GRITO AL EMPEZAR NUEVO ROUND

  roundTimer = 60;
  lastTime = performance.now();
  gameState = "FIGHTING";
  gameStarted = true;
}

async function handleRoundEnd() {
  gameState = "ANNOUNCING";
  audioManager.playBell();

  await hudController.showAnnouncer("FIN DEL ROUND", 2000);

  // Recuperan 15 puntos de vida
  player.health = Math.min(player.maxHealth, player.health + 15);
  enemy.health = Math.min(enemy.maxHealth, enemy.health + 15);

  currentRound++;
  startRoundSequence();
}

function updateHUD(forcedState = gameState) {
  if (!hudController || forcedState === "MENU") return;

  // 🛡️ CORRECCIÓN PROTECCIÓN DE TEXTO VR: Mantenemos el estado en "KO" si estamos en la 
  // cinemática final, evitando que el bucle continuo oculte la malla 3D de los mensajes.
  let visualState = forcedState;
  if (visualState === "VICTORY_CINEMATIC") {
    visualState = "KO";
  }

  const min = Math.floor(roundTimer / 60);
  const sec = roundTimer % 60;
  const timeStr = `${min}:${sec < 10 ? "0" : ""}${sec}`;

  hudController.update(
    player.health,
    player.maxHealth,
    enemy.health,
    enemy.maxHealth,
    timeStr,
    currentRound,
    renderer.xr.isPresenting,
    visualState
  );
}

// ==========================================
// CINEMÁTICA DE VICTORIA EN 5 FASES
// ==========================================
async function handleKnockout({ winner, loser }) {
  if (knockoutHandled) return;
  knockoutHandled = true;

  // Primero cerramos la vida del perdedor
  loser.health = 0;
  loser.isDead = true;

  // Actualizamos visualmente la barra ANTES de cambiar a KO
  updateHUD("FIGHTING");

  // Damos tiempo a que el navegador pinte la barra en 0
  await wait(400);

  // Ahora sí congelamos la pelea y pasamos al nuevo estado de victoria
  gameState = "VICTORY_CINEMATIC";
  gameStarted = false;

  playKnockoutAnimation(loser);
  playVictoryAnimation(winner);
  audioManager.playBell();

  updateHUD("KO");

  audioManager.playFinalBell();
  
  // Dejamos el HUD visible para mantener vivo el texto en VR
  if (!renderer.xr.isPresenting) {
    hudController.setVisible(false, false);
  } else {
    hudController.setVisible(true, true);
  }
  
  document.getElementById("announcer").style.display = "none"; // Limpiar textos viejos 2D

  // Iniciar la locura del público final
  audioManager.startFinalCrowd();

  // Guardamos quién ganó para la cinemática
  victoryState.winner = winner;
  victoryState.loser = loser;
  victoryState.isPlayerWinner = (winner === player);
  
  // AÑADIDO: totalTime para independizar PC de VR
  victoryState.totalTime = 0;

  runVictoryPhase(1);
}

function runVictoryPhase(phase) {
  victoryState.phase = phase;
  
  // CLAVE VR: Reiniciar el tiempo local de cada fase para que los cálculos 
  // del recorrido empiecen de cero y no haya saltos bruscos.
  victoryState.time = 0;

  if (phase > 5) {
    exitToMenu();
    return;
  }

  // Lógica de textos según fase
  let text = "";

  let color = "#ff0000";

  if (phase === 2) {
    text = "K.O.";
    color = "#ff0000";
  }

  if (phase === 3) {
    if (victoryState.isPlayerWinner) {
      text = "¡JUGADOR GANA!";
      color = "#ff0000";
    } else {
      text = "¡IA OPONENTE GANA!";
      color = "#0066ff";
    }
  }

  if (phase === 4) text = "";
  if (phase === 5) text = "JUEGO FINALIZADO";

  if (text !== "") {
    if (renderer.xr.isPresenting) hudController.setVisible(true, true);
    hudController.showAnnouncer(text, 20000, color);
  } else if (phase === 4) {
    document.getElementById("announcer").style.display = "none";
    if (renderer.xr.isPresenting) hudController.showAnnouncer("", 10);
  }

  // Reproducir el audio de la fase correspondiente (GR_1... o GA_1...)
  audioManager.playVictoryPhase(phase, victoryState.isPlayerWinner, () => {
    if (gameState === "VICTORY_CINEMATIC") runVictoryPhase(phase + 1);
  });
}

function setupVRVictoryPose(phase) {
  // Esta función queda en desuso ya que la animación por frames se realiza dinámicamente 
  // dentro del GameLoop, pero se conserva vacía para mantener intactas todas las llamadas.
}

function exitToMenu() {
  document.getElementById("announcer").style.display = "none";
  hudController.setVisible(false, false);

  if (renderer.xr.isPresenting) renderer.xr.getSession().end();

  if (menuController && menuController.overlay) {
    menuController.overlay.style.display = "flex";
    audioManager.stopFinalCrowd();
    audioManager.stopCrowd(); 
    audioManager.playMenuMusic();
    audioManager.stopFinalBell();
  }
  gameState = "MENU";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}