export function setupVRInput({ controllerLeft, controllerRight }) {
  controllerLeft.addEventListener("selectstart", () => {
    console.log("[VR] Trigger izquierdo presionado");
  });

  controllerLeft.addEventListener("selectend", () => {
    console.log("[VR] Trigger izquierdo soltado");
  });

  controllerRight.addEventListener("selectstart", () => {
    console.log("[VR] Trigger derecho presionado");
  });

  controllerRight.addEventListener("selectend", () => {
    console.log("[VR] Trigger derecho soltado");
  });

  controllerLeft.addEventListener("squeezestart", () => {
    console.log("[VR] Grip izquierdo presionado");
  });

  controllerRight.addEventListener("squeezestart", () => {
    console.log("[VR] Grip derecho presionado");
  });
}