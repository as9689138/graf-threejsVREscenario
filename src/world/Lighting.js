import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

export function setupLighting(scene) {
    //=================================================
    // NIEBLA
    //=================================================
    //scene.fog = new THREE.FogExp2(0x050505, 0.0015);

    //=================================================
    // LUZ HEMISFERICA
    //=================================================
    const hemi = new THREE.HemisphereLight(
        0xcfe8ff, // aire
        0x404860, // suelo
        0.6
    );
    scene.add(hemi);

    //=================================================
    // LUZ SPOTLIGHT
    //=================================================
    // CONFIGURACIÓN GENERAL SPOTLIGHTS
    const spotlightColor = 0xddeeff;
    const spotlightIntensity = 300;
    const spotlightHeight = 400;
    const spotlightDistance = 2000;


    //=================================================
    // TRUSS SUPERIOR
    //=================================================
    function createTruss() {
        const trussGroup = new THREE.Group();

        // --- CONFIGURACIÓN ---
        const size = 800;          // Tamaño del cuadrado
        const height = 400;        // Altura (eje Y)
        const trussWidth = 40;
        const trussDepth = 40;
        const tubeRadius = 2.5;
        const segments = 10;

        const material = new THREE.MeshStandardMaterial({
            color: 0xb8b8b8,
            roughness: 0.35,
            metalness: 1.0
        });

        // --- FUNCIÓN: CREAR TUBO ---
        function createTube(start, end, parent) {
            const direction = new THREE.Vector3().subVectors(end, start);
            const length = direction.length();
            const geometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, length, 10);
            const mesh = new THREE.Mesh(geometry, material);

            mesh.position.copy(start).add(end).multiplyScalar(0.5);
            mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
            parent.add(mesh);
        }

        // --- FUNCIÓN: CREAR TRAMO LINEAL (Eje Z) ---
        function createLinearTruss(length) {
            const group = new THREE.Group();
            const halfW = trussWidth / 2;
            const halfD = trussDepth / 2;

            const corners = [
                new THREE.Vector3(-halfW,  halfD, 0),
                new THREE.Vector3( halfW,  halfD, 0),
                new THREE.Vector3(-halfW, -halfD, 0),
                new THREE.Vector3( halfW, -halfD, 0)
            ];

            // Tubos longitudinales
            corners.forEach(corner => {
                createTube(
                    new THREE.Vector3(corner.x, corner.y, 0),
                    new THREE.Vector3(corner.x, corner.y, length),
                    group
                );
            });

            const step = length / segments;
            for (let i = 0; i < segments; i++) {
                const z1 = i * step;
                const z2 = z1 + step;

                const p1 = new THREE.Vector3(-halfW,  halfD, z1);
                const p2 = new THREE.Vector3( halfW,  halfD, z1);
                const p3 = new THREE.Vector3(-halfW, -halfD, z1);
                const p4 = new THREE.Vector3( halfW, -halfD, z1);

                // Marcos transversales
                createTube(p1, p2, group);
                createTube(p2, p4, group);
                createTube(p4, p3, group);
                createTube(p3, p1, group);

                // Diagonales
                const n1 = new THREE.Vector3(-halfW,  halfD, z2);
                const n2 = new THREE.Vector3( halfW,  halfD, z2);
                const n3 = new THREE.Vector3(-halfW, -halfD, z2);
                const n4 = new THREE.Vector3( halfW, -halfD, z2);

                if (i % 2 === 0) {
                    createTube(p1, n4, group);
                    createTube(p2, n3, group);
                } else {
                    createTube(p4, n1, group);
                    createTube(p3, n2, group);
                }
            }
            return group;
        }

        // --- POSICIONAMIENTO DE LOS 4 LADOS ---
        const halfSize = size / 2;

        // LADO 1: Izquierda (Corre de atrás hacia adelante en Z)
        const side1 = createLinearTruss(size);
        side1.position.set(-halfSize, height, -halfSize);
        trussGroup.add(side1);
        
        // LADO 2: Derecha (Corre de atrás hacia adelante en Z)
        const side2 = createLinearTruss(size);
        side2.position.set(halfSize, height, -halfSize);
        trussGroup.add(side2);

        // LADO 3: Atrás (Rotado para correr en X)
        const side3 = createLinearTruss(size);
        side3.rotation.y = Math.PI / 2; // Gira 90 grados
        side3.position.set(-halfSize, height, -halfSize);
        trussGroup.add(side3);

        // LADO 4: Frente (Rotado para correr en X)
        const side4 = createLinearTruss(size);
        side4.rotation.y = Math.PI / 2; // Gira 90 grados
        side4.position.set(-halfSize, height, halfSize);
        trussGroup.add(side4);

        scene.add(trussGroup);
    }



    createTruss();


    //=================================================
    // FUNCIÓN PARA CREAR SPOTLIGHTS
    //=================================================
    function createSpotlight(x, y, z, castShadow = false) {
        const spot = new THREE.SpotLight(
            spotlightColor,
            spotlightIntensity
        );

        // POSICIÓN
        spot.position.set(x, y, z);
        
        // CONFIGURACIÓN VISUAL
        spot.angle = Math.PI / 5;
        spot.penumbra = 1;
        spot.decay = 0.75;
        spot.distance = spotlightDistance;

        // SOMBRAS
        spot.castShadow = castShadow;
        if (castShadow) {
            spot.shadow.mapSize.width = 2048;
            spot.shadow.mapSize.height = 2048;
            spot.shadow.bias = -0.0001;
        }

        // TARGET
        const target = new THREE.Object3D();
        let targetX = 0;
        let targetZ = 0;

        // IZQUIERDA/DERECHA
        if (Math.abs(x) > Math.abs(z)) {
            targetX = -x * 0.2;
        }

        // ARRIBA/ABAJO
        if (Math.abs(z) > Math.abs(x)) {
            targetZ = -z * 0.2;
        }

        target.position.set(
            targetX,
            0,
            targetZ
        );

        scene.add(target);
        spot.target = target;
        target.updateMatrixWorld();

        // AGREGAR SPOTLIGHT
        scene.add(spot);

        // CONFIGURACIÓN BULBS
        const spacing = 200;

        // DETECTAR ORIENTACIÓN
        const isHorizontal = Math.abs(x) > Math.abs(z);

        // OFFSETS PARA 3 BULBS
        const bulbOffsets = [];
        if (isHorizontal) {

            // LATERALES
            bulbOffsets.push(
                new THREE.Vector3(0, 0, -spacing),
                // CENTRO EXACTO DEL SPOTLIGHT
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 0, spacing)
            );

        } else {

            // ARRIBA/ABAJO
            bulbOffsets.push(
                new THREE.Vector3(-spacing, 0, 0),
                // CENTRO EXACTO DEL SPOTLIGHT
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(spacing, 0, 0)
            );

        }

        // CREAR BULBS
        for (const offset of bulbOffsets) {
            // POSICIÓN FINAL
            const finalX = x + offset.x;
            const finalY = y + offset.y;
            const finalZ = z + offset.z;

            // GROUP
            const bulbGroup = new THREE.Group();

            // CARCASA
            const housingGeometry =
                new THREE.CylinderGeometry(
                    28,
                    32,
                    40,
                    32
                );

            const housingMaterial =
                new THREE.MeshStandardMaterial({
                    color: 0x111111,
                    roughness: 0.7,
                    metalness: 0.8
                });

            const housing = new THREE.Mesh(
                housingGeometry,
                housingMaterial
            );

            // ROTACIÓN
            if (isHorizontal) {
                housing.rotation.x = Math.PI / 2;

            } else {
                housing.rotation.z = Math.PI / 2;

            }
            bulbGroup.add(housing);


            // BULB GRANDE
            const bulbGeometry =
                new THREE.SphereGeometry(
                    20,
                    32,
                    32
                );

            const bulbMaterial =
                new THREE.MeshStandardMaterial({
                    color: spotlightColor,
                    emissive: spotlightColor,
                    emissiveIntensity: 5,
                    toneMapped: false
                });

            const bulb = new THREE.Mesh(
                bulbGeometry,
                bulbMaterial
            );

            // HACER SOBRESALIR EL BULB
            if (x > 0) {
                bulb.position.x = -22;
            } else if (x < 0) {
                bulb.position.x = 22;
            } else if (z > 0) {
                bulb.position.z = -22;
            } else {
                bulb.position.z = 22;
            }

            bulbGroup.add(bulb);

            // POSICIÓN
            bulbGroup.position.set(
                finalX,
                finalY,
                finalZ
            );

            // AGREGAR
            scene.add(bulbGroup);

        }

        // HELPER OPCIONAL (LINEAS DE LUZ)

            //const helper = new THREE.SpotLightHelper(spot);

        // scene.add(helper);

        return spot;

    }


    //=================================================
    // CREAR SPOTLIGHTS
    //=================================================

    // SUPERIOR
    createSpotlight(
        0,
        spotlightHeight,
        -500,
        true
    );

    // INFERIOR
    createSpotlight(
        0,
        spotlightHeight,
        500,
        true
    );

    // IZQUIERDO
    createSpotlight(
        -500,
        spotlightHeight,
        0,
        false
    );

    // DERECHO
    createSpotlight(
        500,
        spotlightHeight,
        0,
        false
    );
    
    //=================================================
    // LUCES EXCLUSIVAS PARA POSTES
    //=================================================
    const inwardOffset = 80;   // qué tan dentro del ring entra la luz
    const heightOffset = 160;  // altura sobre el poste
    const postPositions = [
        { x: 350, z: 350 },
        { x: -350, z: 350 },
        { x: -350, z: -350 },
        { x: 350, z: -350 }
    ];

    postPositions.forEach(pos => {

        const postLight = new THREE.PointLight(
            0xb8b8b8,
            10000,
            100,
            2
        );

        //=================================================
        // MOVER HACIA AFUERA DEL POSTE
        //=================================================
        postLight.position.set(
            pos.x * 0.85,   // se acerca al centro
            heightOffset,
            pos.z * 0.85
        );

        scene.add(postLight);

        //=================================================
        // HELPER
        //=================================================
        /*
        const helper = new THREE.PointLightHelper(
            postLight,
            10
        );

        scene.add(helper);
        */

    });


}