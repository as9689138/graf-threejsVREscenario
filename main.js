import * as THREE from "three";

import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

import { createCharacterData } from "./src/characters/CharacterData.js";
import { setupModelMaterials } from "./src/characters/CharacterMaterials.js";
import { setupMorphTargets } from "./src/characters/MorphTargets.js";
import { createBoxingRing } from "./src/world/BoxingRing.js";
import { setupLighting } from "./src/world/Lighting.js";
import { setupAudio } from "./src/audio/AudioManager.js";
import { updateAI } from "./src/ai/AIController.js";
import {
  //bindAnimations,
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
  checkHits
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

const manager = new THREE.LoadingManager();

let camera, scene, renderer, stats, loader, guiMorphsFolder, controls;

let player = createCharacterData();
let enemy = createCharacterData();
let allClips = {};

let keysPressed = {};

let cameraMode = cameraConfig.mode;
let camDistMode1 = cameraConfig.camDistMode1;

let gameStarted = false;
// let punchSound;
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
  if (player.model) scene.remove(player.model);
  if (enemy.model) scene.remove(enemy.model);

  player = createCharacterData();
  enemy = createCharacterData();
  allClips = {};
  keysPressed = {};

  guiMorphsFolder.children.forEach((child) => child.destroy());
  guiMorphsFolder.hide();

  loader.load(
    "assets/models/fbx/character/" + asset + ".fbx",
    function (groupPlayer) {
      setupModelMaterials(groupPlayer, manager, false);

      player.model = groupPlayer;
      player.model.position.set(0, 40, 120);
      player.mixer = new THREE.AnimationMixer(player.model);
      scene.add(player.model);

      loader.load(
        "assets/models/fbx/character/" + asset + ".fbx",
        function (groupEnemy) {
          setupModelMaterials(groupEnemy, manager, true);

          enemy.model = groupEnemy;
          enemy.model.position.set(0, 40, -120);
          enemy.mixer = new THREE.AnimationMixer(enemy.model);
          scene.add(enemy.model);

          setupMorphTargets(player.model, guiMorphsFolder);
          loadAllAnimations();
        },
      );
    },
  );
}

function removeRootMotionXZ(clip) {
  const newTracks = clip.tracks.map(function (track) {
    if (
      track.name.includes("Hips.position") ||
      track.name.includes("mixamorigHips.position")
    ) {
      const newValues = track.values.slice();
      const baseX = newValues[0];
      const baseZ = newValues[2];

      for (let i = 0; i < newValues.length; i += 3) {
        newValues[i] = baseX;
        newValues[i + 2] = baseZ;
      }

      return new THREE.VectorKeyframeTrack(track.name, track.times, newValues);
    }

    return track;
  });

  return new THREE.AnimationClip(
    clip.name + "_NoRootMotionXZ",
    clip.duration,
    newTracks,
  );
}

function loadAllAnimations() {
  const animationLoader = new FBXLoader(manager);

  const animations = {
    readyIdle: "Ready Idle",
    standingToFight: "Standing Idle To Fight Idle",
    fightIdle: "Bouncing Fight Idle",

    shortForward: "Short Step Forward",
    shortBackward: "Short Step Backward",
    shortLeft: "Short Left Side Step",
    shortRight: "Short Right Side Step",

    mediumForward: "Long Step Forward",
    mediumBackward: "Long Step Backward",
    mediumLeft: "Long Left Side Step",
    mediumRight: "Long Right Side Step",

    leadJab: "Lead Jab",
    jabCross: "Jab Cross",
    hook: "Hook",
    bodyJabCross: "Body Jab Cross",

    leadJabShift: "Lead Jab Shift",
    uppercut: "Uppercut",
    hookShift: "Hook Shift",
    bodyJabCrossShift: "Body Jab Cross Shift",

    hitBody: "Hit To Body",
    hitHead: "Big Hit To Head",
  };

  let loadedCount = 0;
  const totalAnimations = Object.keys(animations).length;

  for (const name in animations) {
    animationLoader.load(
      "assets/models/fbx/animations/" + animations[name] + ".fbx",
      function (animGroup) {
        if (!animGroup.animations || animGroup.animations.length === 0) {
          console.warn("El archivo no trae animación:", animations[name]);
          return;
        }

        let clip = animGroup.animations[0];

        if (name.includes("short") || name.includes("medium")) {
          clip = removeRootMotionXZ(clip);
        }

        allClips[name] = clip;
        loadedCount++;

        if (loadedCount === totalAnimations) {
          bindAnimations(player);
          bindAnimations(enemy);

          playReadyIdle(player, playIntroToFight);
          playReadyIdle(enemy, playIntroToFight);
        }
      },
    );
  }
}

function bindAnimations(character) {
  for (const name in allClips) {
    const action = character.mixer.clipAction(allClips[name]);

    if (name === "readyIdle" || name === "fightIdle") {
      action.setLoop(THREE.LoopRepeat);
    } else {
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
    }

    action.enabled = true;
    character.actions[name] = action;
  }

  character.mixer.addEventListener("finished", function (event) {
    if (event.action === character.actions.readyIdle) return;
    if (event.action === character.actions.fightIdle) return;

    character.currentPunch = null;
    character.hasHit = false;
    character.moveData = null;

    if (character.isHit) {
      character.isHit = false;
      playFightIdle(character);
      return;
    }

    if (character.isComboing) {
      playNextComboAction(character, playFightIdle);
      return;
    }

    character.isMoving = false;

    if (character === player) {
      checkAndPlayMovement({
        player,
        keysPressed,
        playBoxAction,
        playFightIdle,
        startStepMovement
      });
    } else {
      playFightIdle(character);
    }
  });
}


function startStepMovement(character, name, action) {
  const distance = stepDistances[name];
  if (!distance) return;

  const direction = new THREE.Vector3();

  switch (name) {
    case "shortForward":
    case "mediumForward":
      direction.set(0, 0, 1);
      break;

    case "shortBackward":
    case "mediumBackward":
      direction.set(0, 0, -1);
      break;

    case "shortLeft":
    case "mediumLeft":
      direction.set(1, 0, 0);
      break;

    case "shortRight":
    case "mediumRight":
      direction.set(-1, 0, 0);
      break;
  }

  character.moveData = {
    direction,
    distance,
    duration: action.getClip().duration,
    elapsed: 0,
  };
}

function updateStepMovement(character, delta) {
  if (!character.model || !character.moveData || character.isHit) return;

  character.moveData.elapsed += delta;

  const speed = character.moveData.distance / character.moveData.duration;

  character.model.translateX(character.moveData.direction.x * speed * delta);
  character.model.translateZ(character.moveData.direction.z * speed * delta);

  const characterRadius = 40;
  const visualMargin = 10;
  const limit = ringConfig.ringHalf - characterRadius - visualMargin;

  character.model.position.x = Math.max(
    -limit,
    Math.min(limit, character.model.position.x),
  );
  character.model.position.z = Math.max(
    -limit,
    Math.min(limit, character.model.position.z),
  );

  const postRadius = 10;
  const safeDistance = characterRadius + postRadius;

  const postPositions = [
    { x: 350, z: 350 },
    { x: -350, z: 350 },
    { x: -350, z: -350 },
    { x: 350, z: -350 },
  ];

  postPositions.forEach((p) => {
    const dx = character.model.position.x - p.x;
    const dz = character.model.position.z - p.z;

    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < safeDistance) {
      const angle = Math.atan2(dz, dx);

      character.model.position.x = p.x + Math.cos(angle) * safeDistance;
      character.model.position.z = p.z + Math.sin(angle) * safeDistance;
    }
  });

  if (character.moveData.elapsed >= character.moveData.duration) {
    character.moveData = null;
  }
}


function triggerHitReaction(character, type) {
  character.isHit = true;
  character.isMoving = false;
  character.isComboing = false;
  character.comboQueue = [];
  character.currentPunch = null;
  character.moveData = null;

  const animName = type === "body" ? "hitBody" : "hitHead";
  const action = character.actions[animName];

  if (action) {
    switchAction(character, action, 0.1);
  }
}

function updateFacing() {
  if (!player.model || !enemy.model) return;

  const dx = enemy.model.position.x - player.model.position.x;
  const dz = enemy.model.position.z - player.model.position.z;

  const anglePlayerToEnemy = Math.atan2(dx, dz);
  const angleEnemyToPlayer = Math.atan2(-dx, -dz);

  player.model.rotation.y = anglePlayerToEnemy;
  enemy.model.rotation.y = angleEnemyToPlayer;
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
    startStepMovement
  });
}

function onKeyUp(event) {
  handleKeyUp({
    event,
    keysPressed
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const delta = clock.getDelta();

  if (player.mixer) player.mixer.update(delta);
  if (enemy.mixer) enemy.mixer.update(delta);

  if (!gameStarted) {
    renderer.render(scene, camera);
    stats.update();
    return;
  }

  updateFacing();

  updateStepMovement(player, delta);
  updateStepMovement(enemy, delta);

  resolveBodyCollisions(player, enemy);

  checkHits({
    gameStarted,
    player,
    enemy,
    punchTypes,
    audioManager,
    triggerHitReaction
  });

  updateAI({
    player,
    enemy,
    playBoxAction,
    startStepMovement,
    startEnemyCombo,
    enemyPunches,
    playNextComboAction,
    playFightIdle
  });

  updateCamera({
    player,
    enemy,
    camera,
    controls,
    cameraMode,
    camDistMode1,
    cameraConfig,
    idealLookAt,
    idealPos,
    currentLookAt
  });

  renderer.render(scene, camera);
  stats.update();
}
