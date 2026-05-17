import * as THREE from "three";

import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

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

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  renderer.shadowMap.enabled = true;

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
    controls,
    stats,
  };
}