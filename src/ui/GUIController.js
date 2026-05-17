import { GUI } from "three/addons/libs/lil-gui.module.min.js";

export function setupGUI({
  params,
  assets,
  onAssetChange
}) {
  const gui = new GUI();

  gui.add(params, "asset", assets).onChange(function (value) {
    onAssetChange(value);
  });

  const guiMorphsFolder = gui.addFolder("Morphs").hide();

  return {
    gui,
    guiMorphsFolder
  };
}