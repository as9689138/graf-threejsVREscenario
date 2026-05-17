export function setupMorphTargets(model, guiMorphsFolder) {

    model.traverse(function (child) {

        // =====================================================
        // VERIFICAR MORPH TARGETS
        // =====================================================
        if (child.isMesh && child.morphTargetDictionary) {

            guiMorphsFolder.show();

            // =====================================================
            // CREAR CARPETA DEL MESH
            // =====================================================
            const meshFolder = guiMorphsFolder.addFolder(
                child.name || child.uuid
            );

            // =====================================================
            // CREAR CONTROLES
            // =====================================================
            Object.keys(child.morphTargetDictionary).forEach((key) => {

                meshFolder.add(
                    child.morphTargetInfluences,
                    child.morphTargetDictionary[key],
                    0,
                    1,
                    0.01
                );

            });
        }
    });
}