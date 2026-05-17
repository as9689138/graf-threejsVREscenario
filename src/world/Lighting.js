import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

export function setupLighting(scene) {

    //=================================================
    // LUZ PRINCIPAL
    //=================================================
    const light = new THREE.SpotLight(0xffffff, 340);

    light.position.set(0, 500, 0);

    light.angle = Math.PI / 3;
    light.penumbra = 0.35;

    light.castShadow = true;

    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    light.shadow.camera.near = 50;
    light.shadow.camera.far = 1000;

    light.shadow.bias = -0.0005;

    light.target.position.set(0, 0, 0);

    scene.add(light);
    scene.add(light.target);

    //=================================================
    // LUZ FRONTAL
    //=================================================
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.15);

    frontLight.position.set(0, 220, 320);
    frontLight.target.position.set(0, 70, 0);

    scene.add(frontLight);
    scene.add(frontLight.target);

    //=================================================
    // HDRI
    //=================================================
    const hdrLoader = new RGBELoader();

    hdrLoader.load(
        "assets/entorno/wrestling_gym_8k.hdr",
        function (texture) {

            texture.mapping =
                THREE.EquirectangularReflectionMapping;

            scene.background = texture;
            scene.environment = texture;

        }
    );
}