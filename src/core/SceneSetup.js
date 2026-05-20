import * as THREE from "three";

import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

export function createSceneSetup({ animate }) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  //=================================================
  // CÁMARA
  //=================================================
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );

  camera.position.set(0, 350, 500);

  //=================================================
  // ESCENA
  //=================================================
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);

  //=================================================
  // RENDERER
  //=================================================
  const canvas = document.getElementById("scene");

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  renderer.physicallyCorrectLights = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;

  const composer = new EffectComposer(renderer);
  composer.setSize(window.innerWidth, window.innerHeight);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.15,
      0.2,
      1
  );
  composer.addPass(bloomPass);

  //=================================================
  // CONTROLES
  //=================================================
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.enablePan = false;
  controls.minDistance = 150;
  controls.maxDistance = 600;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.enabled = false;

  //=================================================
  // STATS
  //=================================================
  const stats = new Stats();
  document.body.appendChild(stats.dom);

  return {
    camera,
    scene,
    renderer,
    composer,
    controls,
    stats,
  };
}