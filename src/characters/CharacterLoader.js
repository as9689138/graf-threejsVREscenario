import * as THREE from "three";
import { createCharacterData } from "./CharacterData.js";
import { setupModelMaterials } from "./CharacterMaterials.js";

export function loadCharacters({
  scene,
  loader,
  manager,
  asset,
  player,
  enemy,
  guiMorphsFolder,
  setupMorphTargets,
  loadAllAnimations,
  resetState
}) {
  if (player.model) scene.remove(player.model);
  if (enemy.model) scene.remove(enemy.model);

  const newPlayer = createCharacterData();
  const newEnemy = createCharacterData();

  resetState();

  guiMorphsFolder.children.forEach((child) => child.destroy());
  guiMorphsFolder.hide();

  loader.load(
    "assets/models/fbx/character/" + asset + ".fbx",
    function (groupPlayer) {
      setupModelMaterials(groupPlayer, manager, false);

      newPlayer.model = groupPlayer;
      newPlayer.model.position.set(0, 40, 120);
      newPlayer.mixer = new THREE.AnimationMixer(newPlayer.model);

      scene.add(newPlayer.model);

      loader.load(
        "assets/models/fbx/character/" + asset + ".fbx",
        function (groupEnemy) {
          setupModelMaterials(groupEnemy, manager, true);

          newEnemy.model = groupEnemy;
          newEnemy.model.position.set(0, 40, -120);
          newEnemy.mixer = new THREE.AnimationMixer(newEnemy.model);

          scene.add(newEnemy.model);

          setupMorphTargets(newPlayer.model, guiMorphsFolder);

          loadAllAnimations(newPlayer, newEnemy);
        }
      );
    }
  );

  return {
    player: newPlayer,
    enemy: newEnemy
  };
}