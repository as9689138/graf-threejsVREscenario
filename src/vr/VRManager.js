import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

export function setupVR({ renderer, scene }) {
  renderer.xr.enabled = true;

  const vrButton = VRButton.createButton(renderer);
  vrButton.classList.add("vr-button");
  document.body.appendChild(vrButton);

  vrButton.style.display = "none";

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

  function setVRReady() {
    vrButton.style.display = "block";
    vrButton.style.pointerEvents = "auto";
    vrButton.style.opacity = "1";
  }

  function setVRLoading() {
    vrButton.style.display = "none";
    vrButton.style.pointerEvents = "none";
    vrButton.style.opacity = "0";
  }

  return {
    vrButton,
    controllerLeft,
    controllerRight,
    gripLeft,
    gripRight,
    setVRReady,
    setVRLoading,
  };
}
