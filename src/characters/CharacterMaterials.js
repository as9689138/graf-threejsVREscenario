import * as THREE from 'three';

export function setupModelMaterials(model, manager, textureName) {

    const skinLoader = new THREE.TextureLoader(manager);
    const texturePath = `assets/textures/${textureName}.png`;

    console.log('[TEXTURE] Cargando:', texturePath);

    skinLoader.load(

        texturePath,

        function (texture) {

            texture.colorSpace = THREE.SRGBColorSpace;
            // flipY = false para FBX: las UVs ya vienen ajustadas para WebGL
            texture.flipY = true;
            texture.needsUpdate = true;

            model.traverse(function (child) {

                if (child.isMesh) {

                    child.castShadow    = true;
                    child.receiveShadow = false;

                    if (child.material) {

                        // ─────────────────────────────────────────────────────
                        // MATERIAL LIMPIO — NO clonamos el original del FBX.
                        // El FBX referencia texturas que no existen en el servidor
                        // (Ch38_1001_Normal.png, etc.), lo que deja el normalMap
                        // en estado roto y oscurece el modelo.
                        // Creamos un MeshStandardMaterial desde cero con solo
                        // lo que necesitamos.
                        // ─────────────────────────────────────────────────────
                        const freshMaterial = () => new THREE.MeshStandardMaterial({
                            map:       texture,
                            color:     new THREE.Color(0xffffff),
                            roughness: 0.55,
                            metalness: 0.02,
                            // normalMap, specularMap, roughnessMap → NO se heredan
                        });

                        if (Array.isArray(child.material)) {
                            child.material = child.material.map(freshMaterial);
                        } else {
                            child.material = freshMaterial();
                        }
                    }
                }
            });
        },

        undefined,

        function (error) {
            console.error('[TEXTURE] Error cargando textura:', error);
        }
    );
}