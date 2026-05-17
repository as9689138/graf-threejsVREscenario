import * as THREE from "three";

export function startStepMovement(character, name, action, stepDistances) {
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

export function updateStepMovement(character, delta, ringConfig) {
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
    Math.min(limit, character.model.position.x)
  );

  character.model.position.z = Math.max(
    -limit,
    Math.min(limit, character.model.position.z)
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