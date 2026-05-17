import * as THREE from "three";

import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

import { createCharacterData } from "./src/characters/CharacterData.js";
// import { setupModelMaterials } from "./src/characters/CharacterMaterials.js";
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
import {
  switchAction,
  playReadyIdle,
  playIntroToFight,
  playFightIdle,
  playBoxAction,
  playPunchAction,
  startEnemyCombo,
  playNextComboAction
} from "./src/animations/AnimationController.js";

import {
  resolveBodyCollisions,
  checkHits,
  triggerHitReaction
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
  handleCameraZoom
} from "./src/camera/CameraController.js";

import {
  handleKeyDown,
  handleKeyUp,
  checkAndPlayMovement
} from "./src/input/InputController.js";

import {
  startStepMovement,
  updateStepMovement
} from "./src/movement/MovementSystem.js";



const manager = new THREE.LoadingManager();

let camera, scene, renderer, stats, loader, guiMorphsFolder, controls;

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

const idealLookAt = new THREE.Vector3();
const idealPos = new THREE.Vector3();
const currentLookAt = new THREE.Vector3(0, 90, 0);

const clock = new THREE.Clock();

const params = { asset: "mixamo" };
const assets = ["mixamo"];

init();

function init() {
  const fightBtn = document.getElementById("fightBtn");

  fightBtn.disabled = true;
  fightBtn.textContent = "Cargando...";

  manager.onLoad = () => {
    console.log("Todo cargado");
    fightBtn.disabled = false;
    fightBtn.textContent = "Luchar";
  };

  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    2000,
  );
  camera.position.set(0, 350, 500);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);

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
  createBoxingRing(scene, manager, ringConfig);

  loader = new FBXLoader(manager);

  const canvas = document.getElementById("scene");

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = 150;
  controls.maxDistance = 600;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.enabled = false;

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("wheel", onMouseWheel);

  stats = new Stats();
  document.body.appendChild(stats.dom);

  const gui = new GUI();

  gui.add(params, "asset", assets).onChange(function (value) {
    loadAsset(value);
  });

  guiMorphsFolder = gui.addFolder("Morphs").hide();

  loadAsset(params.asset);

  const overlay = document.getElementById("menuOverlay");

  document.getElementById("playerPrev").onclick = () => {
    playerIndex--;
    console.log("Player index:", playerIndex);
  };

  document.getElementById("playerNext").onclick = () => {
    playerIndex++;
    console.log("Player index:", playerIndex);
  };

  document.getElementById("enemyPrev").onclick = () => {
    enemyIndex--;
    console.log("Enemy index:", enemyIndex);
  };

  document.getElementById("enemyNext").onclick = () => {
    enemyIndex++;
    console.log("Enemy index:", enemyIndex);
  };

  fightBtn.addEventListener("click", () => {
    overlay.style.display = "none";
    gameStarted = true;

    audioManager.playBell();
    audioManager.playFightMusic();
  });
}

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
          bindAnimations({
            character: loadedPlayer,
            allClips,
            isPlayer: true,
            keysPressed,
            playFightIdle,
            playNextComboAction,
            checkAndPlayMovement,
            playBoxAction,
            startStepMovement: startCharacterStepMovement
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
            startStepMovement: startCharacterStepMovement
          });

          playReadyIdle(loadedPlayer, playIntroToFight);
          playReadyIdle(loadedEnemy, playIntroToFight);
        }
      });
    }
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
    cameraConfig
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
    startStepMovement: startCharacterStepMovement
  });
}

function onKeyUp(event) {
  handleKeyUp({
    event,
    keysPressed
  });
}

function onWindowResize() {
  handleResize({
    camera,
    renderer
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
    currentLookAt
  });
}
