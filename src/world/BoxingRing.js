import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

 let flashParticles; // <-- DECLÁRALA AQUÍ ARRIBA, FUERA DE CUALQUIER FUNCIÓN

export function createBoxingRing(scene, manager, ringConfig) {

     //=================================================
            // Ring con textura de lona
            //=================================================
            // Creamos el cargador aquí mismo antes de usarlo
            const ringTextureLoader = new THREE.TextureLoader(manager);
            
            // Cargamos la textura con la extensión .jpg correcta
            const lonaTexture = ringTextureLoader.load('assets/textures/lona.jpg');
            
            // Configuramos la repetición para que el tejido de la lona se vea fino
            lonaTexture.wrapS = THREE.RepeatWrapping;
            lonaTexture.wrapT = THREE.RepeatWrapping;
            lonaTexture.repeat.set(4, 4); 

            const ringSize = 800;
            const ringHeight = 40;
            
            const ringMaterial = new THREE.MeshStandardMaterial({ 
                map: lonaTexture,
                color: 0xffffff, 
                roughness: 0.14,  // REDUCIDO: Mientras más cerca a 0, más refleja la luz
                metalness: 0.6   // Le da un ligero toque satinado
            });

            const ring = new THREE.Mesh(
                new RoundedBoxGeometry(ringSize, ringHeight, ringSize, 10, 2, 10),
                ringMaterial
            );

            ring.position.y = ringHeight / 2;
            ring.receiveShadow = true; 
            scene.add(ring);


            // =================================================
            // Logo en el centro de la lona (Con Aspect Ratio)
            // =================================================
            const textureLoader = new THREE.TextureLoader(manager);
            textureLoader.load('assets/textures/logo_itp.png', function(texture) {
                texture.colorSpace = THREE.SRGBColorSpace;
                
                // 1. Obtenemos las dimensiones originales de la imagen
                const imgWidth = texture.image.width;
                const imgHeight = texture.image.height;
                const aspectRatio = imgWidth / imgHeight;

                // 2. Definimos el tamaño deseado (lo subí a 400 para que se vea más grande)
                const targetSize = 400; 
                let planeWidth, planeHeight;

                // 3. Calculamos el ancho y alto final respetando la proporción original
                if (aspectRatio > 1) {
                    // Si es más ancha que alta
                    planeWidth = targetSize;
                    planeHeight = targetSize / aspectRatio;
                } else {
                    // Si es más alta que ancha, o cuadrada
                    planeHeight = targetSize;
                    planeWidth = targetSize * aspectRatio;
                }

                // 4. Creamos el plano con las medidas correctas
                const logoMesh = new THREE.Mesh(
                    new THREE.PlaneGeometry(planeWidth, planeHeight),
                    new THREE.MeshStandardMaterial({
                        map: texture,
                        transparent: true, 
                        roughness: 0.9,    
                        metalness: 0.0,
                        depthWrite: false  
                    })
                );

                logoMesh.rotation.x = -Math.PI / 2;
                logoMesh.position.set(0, ringHeight + 0.1, 0);
                logoMesh.receiveShadow = true;
                scene.add(logoMesh);
            });
            
            // =================================================
            // Postes                                                   
            //=================================================
            const postHeight = 120;
            const postData = [ 
                { x: 350, z: 350, color: 0xad0202 }, // rojo 
                { x: -350, z: 350, color: 0xc7c5c5 }, // blanco 
                { x: -350, z: -350, color: 0x004aab }, // azul 
                { x: 350, z: -350, color: 0xc7c5c5 } // blanco 
            ];

            postData.forEach(p => {

                const material = new THREE.MeshStandardMaterial({
                    color: p.color,
                    roughness: 0.18,
                    metalness: 0.85
                });

                const post = new THREE.Mesh(
                    new THREE.CylinderGeometry(10, 10, postHeight, 32),
                    material
                );

                post.castShadow = true;
                post.receiveShadow = true;

                post.position.set(p.x, postHeight / 2 + ringHeight, p.z);

                scene.add(post);
            });

            //=================================================
            // Cuerdas con textura
            //=================================================
            const ropeTexture = textureLoader.load('assets/textures/cuerda.jpg');
            
            // Configuramos la repetición para que no se estire la imagen
            ropeTexture.wrapS = THREE.RepeatWrapping;
            ropeTexture.wrapT = THREE.RepeatWrapping;
            
            // Ajusta el segundo número (20) para que el trenzado se vea más o menos tupido
            ropeTexture.repeat.set(1, 20); 

            const ropeMaterial = new THREE.MeshStandardMaterial({ 
                map: ropeTexture,
                color: 0xffffff, // Mantener en blanco para no teñir la textura
                roughness: 0.8,  // Más rugoso para que parezca tela o soga
                metalness: 0.0
            });

            const ropeLength = 700;

            [60, 80, 100].forEach(h => {

                // Frente
                const rope = new THREE.Mesh(
                    new THREE.CylinderGeometry(1.5, 1.5, ropeLength, 16),
                    ropeMaterial
                );

                rope.rotation.z = Math.PI / 2;
                rope.position.set(0, h + ringHeight, 350);
                rope.castShadow = true; // Añadimos sombras para más profundidad
                rope.receiveShadow = true;

                scene.add(rope);

                // Atrás
                const back = rope.clone();
                back.position.z = -350;
                scene.add(back);

                // Izquierda
                const ropeSide = new THREE.Mesh(
                    new THREE.CylinderGeometry(1.5, 1.5, ropeLength, 16),
                    ropeMaterial
                );

                ropeSide.rotation.x = Math.PI / 2;
                ropeSide.position.set(-350, h + ringHeight, 0);
                ropeSide.castShadow = true;
                ropeSide.receiveShadow = true;

                scene.add(ropeSide);

                // Derecha
                const right = ropeSide.clone();
                right.position.x = 350;
                scene.add(right);
            });

            //=================================================
            // 1. PISO CONECTOR (Ring -> Gradas)
            //=================================================
            const floorSize = 3000; // Suficientemente grande para cubrir todo
            const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
            const floorMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x1a1a1a, // Gris muy oscuro (concreto)
                roughness: 0.8,
                metalness: 0.1
            });

            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2; // Acostarlo
            floor.position.y = -0.1; // Justo debajo del ring para evitar parpadeo
            floor.receiveShadow = true;
            scene.add(floor);

            //=================================================
            // 2. GRADAS CORREGIDAS
            //=================================================
            function createBleachers() {
                const bleacherGroup = new THREE.Group();
                const numSteps = 8;
                const stepWidth = 1600;      
                const stepHeight = 40;       
                const stepDepth = 80;        
                const distanceToRing = 650; 

                const aficionTexture = textureLoader.load('assets/textures/cazul.png');
                aficionTexture.wrapS = THREE.RepeatWrapping;
                aficionTexture.wrapT = THREE.RepeatWrapping;
                
                // --- CAMBIO DE ESCALA ---
                // Prueba con (1, 1) para que la imagen sea gigante. 
                // O (2, 1) para un punto medio.
                aficionTexture.repeat.set(4, 1); 
                aficionTexture.magFilter = THREE.NearestFilter;
                aficionTexture.minFilter = THREE.LinearMipmapLinearFilter;
                aficionTexture.anisotropy = 16; // Esto evita que la gente se vea borrosa de lejos

                const concreteMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
                
                const crowdMat = new THREE.MeshStandardMaterial({ 
                    map: aficionTexture,
                    emissive: 0xffffff, 
                    emissiveIntensity: 0.05
                });

                // Material para las filas con gente
                const materialsWithCrowd = [
                    concreteMat, concreteMat, concreteMat, concreteMat, concreteMat, crowdMat
                ];

                // Material para la primera fila (solo concreto)
                const materialsOnlyConcrete = [
                    concreteMat, concreteMat, concreteMat, concreteMat, concreteMat, concreteMat
                ];

                function createBleacherSide(rotationY) {
                    const sideGroup = new THREE.Group();
                    for (let i = 0; i < numSteps; i++) {
                        // CAMBIO: Ahora cada caja mide exactamente 40 de alto (no se acumula el tamaño en la geometría)
                        const stepGeo = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
                        
                        const currentMaterials = (i === 0) ? materialsOnlyConcrete : materialsWithCrowd;
                        const stepMesh = new THREE.Mesh(stepGeo, currentMaterials);

                        // CAMBIO: Elevamos el escalón en el eje Y de forma acumulativa en la posición
                        stepMesh.position.set(
                            0, 
                            (stepHeight / 2) + (i * stepHeight), // <-- Aquí se calcula la altura en el espacio 3D
                            distanceToRing + (i * stepDepth)
                        );

                        stepMesh.castShadow = true;
                        stepMesh.receiveShadow = true;
                        sideGroup.add(stepMesh);
                    }
                    sideGroup.rotation.y = rotationY;
                    return sideGroup;
                }

                bleacherGroup.add(createBleacherSide(0));               
                bleacherGroup.add(createBleacherSide(Math.PI / 2));    
                bleacherGroup.add(createBleacherSide(Math.PI));        
                bleacherGroup.add(createBleacherSide(-Math.PI / 2));   

                scene.add(bleacherGroup);
            }

            createBleachers();

            //=================================================
        // CREAR EFECTO DE FLASHES DE CÁMARA (CORREGIDO PARA ESQUINAS)
        //=================================================
        flashParticles; 

        function createFlashes() {
            const flashCount = 6000; 
            const flashGeometry = new THREE.BufferGeometry();
            const positions = new Float32Array(flashCount * 3); 

            const numSteps = 7; 
            const stepHeight = 40;
            const maxStepsHeight = stepHeight * numSteps; 
            const bleacherDepthRange = 650; // Dónde empieza la primera fila
            
            // El ancho real de tus gradas en el código es 1600.
            // Esto significa que van desde -800 hasta 800 en su eje local.
            const mitadAnchoGrada = 1600 / 2; 

            for (let i = 0; i < flashCount; i++) {
                let side = Math.random();
                let posX, posY, posZ;

                // Determinamos en qué rango de profundidad (hacia atrás de la grada) se genera
                // Tus gradas tienen 7 escalones de 80 de profundidad cada uno = 560 de profundidad total.
                const profundidadAleatoria = Math.random() * 560;

                // Generamos el ancho de forma que NUNCA se salga del límite de la estructura (1600 de ancho)
                const anchoAleatorio = (Math.random() - 0.5) * 1600; 

                // --- RESTRICCIÓN ESTRICTA POR ZONAS ---
                if (side < 0.25) { // Grada Norte
                    posX = anchoAleatorio; // Restringido entre -800 y 800
                    posZ = bleacherDepthRange + profundidadAleatoria; 
                } else if (side < 0.5) { // Grada Sur
                    posX = anchoAleatorio; // Restringido entre -800 y 800
                    posZ = -bleacherDepthRange - profundidadAleatoria;
                } else if (side < 0.75) { // Grada Este
                    posX = bleacherDepthRange + profundidadAleatoria;
                    posZ = anchoAleatorio; // Restringido entre -800 y 800
                } else { // Grada Oeste
                    posX = -bleacherDepthRange - profundidadAleatoria;
                    posZ = anchoAleatorio; // Restringido entre -800 y 800
                }

                // --- CÁLCULO DE ALTURA REALISTA ---
                // Para que vayan subiendo junto con los escalones y no floten:
                const altoGradaEnEsePunto = (profundidadAleatoria * (40 / 80)) + (Math.random() * 25 + 5);
                posY = altoGradaEnEsePunto;

                // Candados de seguridad para la altura
                if (posY < 15) posY = 15;
                if (posY > maxStepsHeight) posY = maxStepsHeight - 10;

                positions[i * 3] = posX;
                positions[i * 3 + 1] = posY;
                positions[i * 3 + 2] = posZ;
            }

            flashGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const flashMaterial = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 5,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });

            flashParticles = new THREE.Points(flashGeometry, flashMaterial);
            scene.add(flashParticles);
        }

        createFlashes();
        return {
            flashParticles
        };
}