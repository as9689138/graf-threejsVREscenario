import * as THREE from 'three';

export function setupModelMaterials(model, manager, makeBlue = false) {

    const skinLoader = new THREE.TextureLoader(manager);

    const texturePath = makeBlue
        ? 'assets/textures/rockyy3121i21.png'
        : 'assets/textures/rockyy3121bal.png';

    console.log('[TEXTURE] Intentando cargar:', texturePath);

    skinLoader.load(
        texturePath,

        function (texture) {
            console.log('[TEXTURE] Cargada correctamente:', texturePath);
            console.log('[TEXTURE] Dimensiones:', texture.image.width, texture.image.height);

            texture.colorSpace = THREE.SRGBColorSpace;
            texture.flipY = true;
            texture.needsUpdate = true;

            model.traverse(function (child) {

                if (child.isMesh) {

                    child.castShadow = true;
                    child.receiveShadow = false;

                    if (child.material) {

                        const configureMaterial = (m) => {
                            const newMat = m.clone();

                            newMat.map = texture;
                            newMat.color.setHex(0xffffff);

                            // Valores originales
                            newMat.roughness = 0.3;
                            newMat.metalness = 0.1;

                            newMat.needsUpdate = true;

                            return newMat;
                        };

                        if (Array.isArray(child.material)) {
                            child.material = child.material.map(m => configureMaterial(m));
                        } else {
                            child.material = configureMaterial(child.material);
                        }
                    }
                }
            });
        },

        undefined,

        function (error) {
            console.error('[TEXTURE] Error al cargar:', texturePath, error);
        }
    );
}