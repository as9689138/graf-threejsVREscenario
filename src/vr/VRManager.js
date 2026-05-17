import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

export function setupVR({ renderer, scene }) {
  renderer.xr.enabled = true;

  const vrButton = VRButton.createButton(renderer);
  vrButton.classList.add("vr-button");
  document.body.appendChild(vrButton);

  const controllerLeft = renderer.xr.getController(0);
  const controllerRight = renderer.xr.getController(1);

  scene.add(controllerLeft);
  scene.add(controllerRight);

  const controllerModelFactory = new XRControllerModelFactory();

  const gripLeft = renderer.xr.getControllerGrip(0);
  gripLeft.add(controllerModelFactory.createControllerModel(gripLeft));
  scene.add(gripLeft);

  const gripRight = renderer.xr.getControllerGrip(1);
  gripRight.add(controllerModelFactory.createControllerModel(gripRight));
  scene.add(gripRight);

  return {
    vrButton,
    controllerLeft,
    controllerRight,
    gripLeft,
    gripRight
  };
}