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
import {
  findHeadBone,
  syncVRRigToPlayerHead
} from "./src/vr/VRHeadSync.js";

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

let playerIndex = 0;
let enemyIndex = 0;

let menuController;

// VARIABLES DE REALIDAD VIRTUAL
let vrManager;

let vrPlayerRig;
let playerHeadBone = null;

let vrButtonMapper;

vrButtonMapper = createVRButtonMapper({
  renderer,
  player,
  playPunchAction
});

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
      gameStarted = true;
      audioManager.playBell();
      audioManager.playFightMusic();
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
}

//=================================================
// VR
//=================================================
vrManager = setupVR({
  renderer,
  scene
});

vrManager.setVRLoading();

vrPlayerRig = createVRPlayerRig({
  camera,
  scene
});

// PROTECCIÓN DE CÁMARA DE VISTA 3D FRENTE A VR
renderer.xr.addEventListener("sessionstart", () => {
  vrPlayerRig.enterVRPose();
});

renderer.xr.addEventListener("sessionend", () => {
  vrPlayerRig.exitVRPose();
});

setupVRInput({
  controllerLeft: vrManager.controllerLeft,
  controllerRight: vrManager.controllerRight
});

vrButtonMapper = createVRButtonMapper({
  getRenderer: () => renderer,
  getPlayer: () => player,
  playPunchAction
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
  updateGameLoop({
    clock,
    player,
    enemy,
    gameStarted,
    renderer,
    scene,
    camera,
    stats,
    flashParticles,
    composer,

    vrPlayerRig,
    playerHeadBone,
    syncVRRigToPlayerHead,

    vrButtonMapper,

    updateVRLocomotion,

    ringConfig,
    punchTypes,
    audioManager,

    updateFacing,
    updateStepMovement,
    resolveBodyCollisions,
    checkHits,
    triggerHitReaction,
    switchAction,
    updateAI,
    updateCamera,

    playBoxAction,
    startCharacterStepMovement,
    startEnemyCombo,
    enemyPunches,
    playNextComboAction,
    playFightIdle,

    controls,
    cameraMode,
    camDistMode1,
    cameraConfig,
    idealLookAt,
    idealPos,
    currentLookAt,
  });
}


function setGameReady() {
  menuController.setReady();

  if (vrManager) {
    vrManager.setVRReady();
  }
}