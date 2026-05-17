import * as THREE from "three";

import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
//import { Audio, AudioListener, AudioLoader } from "three";

import { createCharacterData } from "./src/characters/CharacterData.js";
import { setupModelMaterials } from "./src/characters/CharacterMaterials.js";
import { setupMorphTargets } from "./src/characters/MorphTargets.js";
import { createBoxingRing } from "./src/world/BoxingRing.js";
import { setupLighting } from "./src/world/Lighting.js";
import { setupAudio } from "./src/audio/AudioManager.js";

import {
  stepDistances,
  enemyPunches,
  punchTypes,
  cameraConfig,
  ringConfig,
} from "./src/config/gameConfig.js";

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

          playReadyIdle(player);
          playReadyIdle(enemy);
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
      playNextComboAction(character);
      return;
    }

    character.isMoving = false;

    if (character === player) {
      checkAndPlayMovement();
    } else {
      playFightIdle(character);
    }
  });
}

function switchAction(character, nextAction, fadeDuration = 0.35) {
  if (!nextAction) return;

  const previousAction = character.activeAction;

  if (previousAction === nextAction) {
    nextAction.reset().play();
  } else {
    nextAction.reset().fadeIn(fadeDuration).play();

    if (previousAction) {
      previousAction.crossFadeTo(nextAction, fadeDuration, false);
    }
  }

  character.activeAction = nextAction;
}

function playReadyIdle(character) {
  const idle = character.actions.readyIdle;
  if (!idle) return;

  switchAction(character, idle, 0.4);

  setTimeout(function () {
    if (character.activeAction === idle) playIntroToFight(character);
  }, 1200);
}

function playIntroToFight(character) {
  const intro = character.actions.standingToFight;
  if (!intro) return;

  switchAction(character, intro, 0.55);
}

function playFightIdle(character) {
  const idle = character.actions.fightIdle;
  if (!idle || character.activeAction === idle) return;

  switchAction(character, idle, 0.45);

  character.isMoving = false;
  character.moveData = null;
}

function playBoxAction(character, name) {
  if (character.isMoving || character.isHit) return;
  if (!character.actions[name]) return;

  character.isMoving = true;

  const action = character.actions[name];

  switchAction(character, action, 0.2);
  startStepMovement(character, name, action);
}

function playPunchAction(character, name) {
  if (character.isMoving || character.isHit) return;
  if (!character.actions[name]) return;

  character.isMoving = true;
  character.currentPunch = name;
  character.hasHit = false;

  const action = character.actions[name];

  switchAction(character, action, 0.15);
}

function startEnemyCombo() {
  if (enemy.isMoving || enemy.isComboing || enemy.isHit) return;

  const comboLength = THREE.MathUtils.randInt(1, 4);

  enemy.comboQueue = [];

  for (let i = 0; i < comboLength; i++) {
    const randomPunch =
      enemyPunches[Math.floor(Math.random() * enemyPunches.length)];

    enemy.comboQueue.push(randomPunch);
  }

  enemy.isComboing = true;

  playNextComboAction(enemy);
}

function playNextComboAction(character) {
  if (character.comboQueue.length === 0) {
    character.isComboing = false;
    character.isMoving = false;
    playFightIdle(character);
    return;
  }

  const actionName = character.comboQueue.shift();
  const action = character.actions[actionName];

  if (!action) {
    playNextComboAction(character);
    return;
  }

  character.isMoving = true;
  character.currentPunch = actionName;
  character.hasHit = false;

  switchAction(character, action, 0.12);
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

function resolveBodyCollisions() {
  if (!player.model || !enemy.model) return;

  const dist = player.model.position.distanceTo(enemy.model.position);
  const minDist = 65;

  if (dist < minDist) {
    const overlap = minDist - dist;
    const dir = new THREE.Vector3()
      .subVectors(player.model.position, enemy.model.position)
      .normalize();

    player.model.position.addScaledVector(dir, overlap * 0.5);
    enemy.model.position.addScaledVector(dir, -overlap * 0.5);
  }
}

function checkHits() {
  if (!gameStarted || !player.model || !enemy.model) return;

  evaluateHit(player, enemy);
  evaluateHit(enemy, player);
}

function evaluateHit(attacker, defender) {
  if (
    !attacker.currentPunch ||
    attacker.hasHit ||
    attacker.isHit ||
    defender.isHit
  )
    return;

  const action = attacker.actions[attacker.currentPunch];
  if (!action) return;

  const progress = action.time / action.getClip().duration;

  if (progress > 0.3 && progress < 0.5) {
    const dist = attacker.model.position.distanceTo(defender.model.position);
    const hitRange = 140;

    if (dist < hitRange) {
      attacker.hasHit = true;

      audioManager.playPunch();

      triggerHitReaction(defender, punchTypes[attacker.currentPunch] || "head");
    }
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

function updateAI() {
  if (!enemy.model || !player.model) return;
  if (!enemy.actions.fightIdle) return;
  if (enemy.activeAction === enemy.actions.readyIdle) return;
  if (enemy.activeAction === enemy.actions.standingToFight) return;
  if (enemy.isMoving || enemy.isComboing || enemy.isHit || player.isHit) return;

  const distance = player.model.position.distanceTo(enemy.model.position);
  const idealDistance = 150;

  const now = performance.now();

  if (distance > idealDistance + 35) {
    playBoxAction(enemy, "mediumForward");
  } else if (distance < idealDistance - 35) {
    playBoxAction(enemy, "shortBackward");
  } else {
    if (now > enemy.nextAttackTime) {
      startEnemyCombo();

      enemy.nextAttackTime = now + 1600 + Math.random() * 1400;
    } else {
      playFightIdle(enemy);
    }
  }
}

function updateCamera() {
  if (!player.model || !enemy.model) return;

  if (cameraMode === 1) {
    const dx = enemy.model.position.x - player.model.position.x;
    const dz = enemy.model.position.z - player.model.position.z;
    const dir = new THREE.Vector3(dx, 0, dz).normalize();

    const midPoint = new THREE.Vector3()
      .addVectors(player.model.position, enemy.model.position)
      .multiplyScalar(0.5);

    idealPos
      .copy(player.model.position)
      .addScaledVector(dir, -camDistMode1)
      .add(new THREE.Vector3(0, cameraConfig.camHeightMode1, 0));

    camera.position.lerp(idealPos, 0.1);

    idealLookAt.copy(midPoint).add(new THREE.Vector3(0, 40, 0));
    currentLookAt.lerp(idealLookAt, 0.1);
    camera.lookAt(currentLookAt);
  } else if (cameraMode === 2) {
    const midPoint = new THREE.Vector3()
      .addVectors(player.model.position, enemy.model.position)
      .multiplyScalar(0.5);

    midPoint.y = 90;

    controls.target.lerp(midPoint, 0.1);
    controls.update();
  }
}

function onMouseWheel(event) {
  if (cameraMode === 1) {
    camDistMode1 += event.deltaY * 0.1;

    camDistMode1 = THREE.MathUtils.clamp(
      camDistMode1,
      cameraConfig.minCamDist1,
      cameraConfig.maxCamDist1,
    );
  }
}

function onKeyDown(event) {
  if (event.key === "1") {
    cameraMode = 1;
    controls.enabled = false;
    return;
  }

  if (event.key === "2") {
    cameraMode = 2;
    controls.enabled = true;
    return;
  }

  keysPressed[event.key] = true;

  if (event.key === "Shift") {
    keysPressed.Shift = true;
  }

  if (!player || !player.actions.fightIdle) return;
  if (player.isMoving || player.isHit) return;

  const shift = event.shiftKey;

  switch (event.code) {
    case "KeyA":
      event.preventDefault();
      playPunchAction(player, shift ? "leadJabShift" : "leadJab");
      break;

    case "KeyW":
      event.preventDefault();
      playPunchAction(player, shift ? "uppercut" : "jabCross");
      break;

    case "KeyS":
      event.preventDefault();
      playPunchAction(player, shift ? "hookShift" : "hook");
      break;

    case "KeyD":
      event.preventDefault();
      playPunchAction(player, shift ? "bodyJabCrossShift" : "bodyJabCross");
      break;

    case "ArrowUp":
      event.preventDefault();
      playBoxAction(player, shift ? "mediumForward" : "shortForward");
      break;

    case "ArrowDown":
      event.preventDefault();
      playBoxAction(player, shift ? "mediumBackward" : "shortBackward");
      break;

    case "ArrowLeft":
      event.preventDefault();
      playBoxAction(player, shift ? "mediumLeft" : "shortLeft");
      break;

    case "ArrowRight":
      event.preventDefault();
      playBoxAction(player, shift ? "mediumRight" : "shortRight");
      break;
  }
}

function onKeyUp(event) {
  keysPressed[event.key] = false;

  if (event.key === "Shift") {
    keysPressed.Shift = false;
  }
}

function checkAndPlayMovement() {
  const medium = keysPressed.Shift;

  if (keysPressed.ArrowUp) {
    playBoxAction(player, medium ? "mediumForward" : "shortForward");
  } else if (keysPressed.ArrowDown) {
    playBoxAction(player, medium ? "mediumBackward" : "shortBackward");
  } else if (keysPressed.ArrowLeft) {
    playBoxAction(player, medium ? "mediumLeft" : "shortLeft");
  } else if (keysPressed.ArrowRight) {
    playBoxAction(player, medium ? "mediumRight" : "shortRight");
  } else {
    playFightIdle(player);
  }
}

function checkAndPlayPunch() {
  const shift = keysPressed.Shift;

  if (keysPressed.a || keysPressed.A) {
    playPunchAction(player, shift ? "leadJabShift" : "leadJab");
    return;
  }

  if (keysPressed.w || keysPressed.W) {
    playPunchAction(player, shift ? "uppercut" : "jabCross");
    return;
  }

  if (keysPressed.s || keysPressed.S) {
    playPunchAction(player, shift ? "hookShift" : "hook");
    return;
  }

  if (keysPressed.d || keysPressed.D) {
    playPunchAction(player, shift ? "bodyJabCrossShift" : "bodyJabCross");
  }
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

  resolveBodyCollisions();
  checkHits();

  updateAI();

  updateCamera();

  renderer.render(scene, camera);
  stats.update();
}
