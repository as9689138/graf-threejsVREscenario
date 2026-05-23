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

import {
  updateCamera,
  handleCameraZoom,
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
let gameState = "MENU"; // MENU, ANNOUNCING, FIGHTING, KO
let currentRound = 1;
let roundTimer = 60; // 1 minuto (60 segundos)
let lastTime = 0;

let playerIndex = 0;
let enemyIndex = 0;

let menuController;

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
  audioManager = setupAudio(camera);

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

  // 4. Volvemos a mostrar el menú al salir de VR
  if (menuController && menuController.overlay) {
    menuController.overlay.style.display = "flex";
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

  if (hudController && gameState !== "MENU") {
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
      gameState,
    );
  }

  // Chequeo de K.O.
  if ((player.isDead || enemy.isDead) && gameState === "FIGHTING") {
    handleKnockout();
  }

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
  // Esquina Azul (Jugador)
  player.model.position.set(-250, 40, -250);
  // Esquina Roja (IA)
  enemy.model.position.set(250, 40, 250);

  // Limpiar estados
  player.isHit = false;
  enemy.isHit = false;
  player.isMoving = false;
  enemy.isMoving = false;
  player.isComboing = false;
  enemy.isComboing = false;

  playFightIdle(player);
  playFightIdle(enemy);
}

function startNewMatch() {
  // Balanceo de vida inicial
  player.maxHealth = 100;
  player.health = 100;
  player.isDead = false;
  enemy.maxHealth = 250;
  enemy.health = 250;
  enemy.isDead = false; // IA dura más

  currentRound = 1;
  gameState = "ANNOUNCING";

  if (menuController && menuController.overlay)
    menuController.overlay.style.display = "none";
  hudController.setVisible(true, renderer.xr.isPresenting);

  startRoundSequence();
}

async function startRoundSequence() {
  gameState = "ANNOUNCING";
  resetPositions();

  await hudController.showAnnouncer(`ROUND ${currentRound}`, 2000);

  // Empieza la pelea
  audioManager.playBell();
  if (currentRound === 1) audioManager.playFightMusic();

  roundTimer = 60;
  lastTime = performance.now(); // NUEVO: Iniciamos el reloj seguro del navegador
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

async function handleKnockout() {
  gameState = "KO";
  audioManager.playBell();

  await hudController.showAnnouncer("K.O.", 2500);

  const winner = player.isDead ? "¡IA OPONENTE GANA!" : "¡JUGADOR GANA!";
  await hudController.showAnnouncer(winner, 3000);

  await hudController.showAnnouncer("JUEGO FINALIZADO", 2500);

  // Reiniciar juego y salir al menú
  hudController.setVisible(false, renderer.xr.isPresenting);

  if (renderer.xr.isPresenting) {
    renderer.xr.getSession().end(); // Cierra la VR
  }

  if (menuController && menuController.overlay)
    menuController.overlay.style.display = "flex";
  gameState = "MENU";
}
