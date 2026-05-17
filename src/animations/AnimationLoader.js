import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

//=================================================
// Quitar root motion en X/Z para pasos
//=================================================
export function removeRootMotionXZ(clip) {
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
    newTracks
  );
}

//=================================================
// Cargar todas las animaciones FBX
//=================================================
export function loadAllAnimations({
  manager,
  allClips,
  onComplete
}) {
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
          onComplete();
        }
      }
    );
  }
}