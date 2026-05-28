import * as THREE from 'three';

export function setupModelMaterials(model, manager, textureName) {

    const skinLoader = new THREE.TextureLoader(manager);

    const texturePath = `assets/textures/${textureName}.png`;

    console.log('[TEXTURE] Cargando:', texturePath);

    skinLoader.load(

        texturePath,

        function (texture) {

            texture.colorSpace = THREE.SRGBColorSpace;
            texture.flipY = true;
            texture.needsUpdate = true;

            model.traverse(function (child) {

                if (child.isMesh) {

                    child.castShadow = true;
                    child.receiveShadow = false;

                    if (child.material) {

                        const applyMaterial = (mat) => {

                            const newMat = mat.clone();

                            newMat.map = texture;
                            newMat.color.setHex(0xffffff);

                            newMat.roughness = 0.4;
                            newMat.metalness = 0.05;

                            newMat.needsUpdate = true;

                            return newMat;
                        };

                        if (Array.isArray(child.material)) {
                            child.material =
                                child.material.map(applyMaterial);
                        } else {
                            child.material =
                                applyMaterial(child.material);
                        }
                    }
                }
            });
        },

        undefined,

        function (error) {
            console.error(
                '[TEXTURE] Error cargando textura:',
                error
            );
        }
    );
}