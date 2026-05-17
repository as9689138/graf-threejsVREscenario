import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createBoxingRing(scene, manager, ringConfig) {

    //=================================================
    // Ring con textura de lona
    //=================================================
    const ringTextureLoader = new THREE.TextureLoader(manager);

    const lonaTexture = ringTextureLoader.load('assets/textures/lona.jpg');

    lonaTexture.wrapS = THREE.RepeatWrapping;
    lonaTexture.wrapT = THREE.RepeatWrapping;
    lonaTexture.repeat.set(4, 4);

    const ringMaterial = new THREE.MeshStandardMaterial({
        map: lonaTexture,
        color: 0xffffff,
        roughness: 0.4,
        metalness: 0.1
    });

    const ring = new THREE.Mesh(
        new RoundedBoxGeometry(
            ringConfig.ringSize,
            ringConfig.ringHeight,
            ringConfig.ringSize,
            10,
            2,
            10
        ),
        ringMaterial
    );

    ring.position.y = ringConfig.ringHeight / 2;
    ring.receiveShadow = true;

    scene.add(ring);

    // =================================================
    // Logo en el centro de la lona (Con Aspect Ratio)
    // =================================================
    const textureLoader = new THREE.TextureLoader(manager);

    textureLoader.load('assets/textures/logo_itp.png', function (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;

        const imgWidth = texture.image.width;
        const imgHeight = texture.image.height;
        const aspectRatio = imgWidth / imgHeight;

        const targetSize = 400;
        let planeWidth;
        let planeHeight;

        if (aspectRatio > 1) {
            planeWidth = targetSize;
            planeHeight = targetSize / aspectRatio;
        } else {
            planeHeight = targetSize;
            planeWidth = targetSize * aspectRatio;
        }

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
        logoMesh.position.set(0, ringConfig.ringHeight + 0.1, 0);
        logoMesh.receiveShadow = true;

        scene.add(logoMesh);
    });

    // =================================================
    // Postes
    //=================================================
    const postData = [
        { x: 350, z: 350, color: 0xad0202 },
        { x: -350, z: 350, color: 0xc7c5c5 },
        { x: -350, z: -350, color: 0x004aab },
        { x: 350, z: -350, color: 0xc7c5c5 }
    ];

    postData.forEach(p => {
        const material = new THREE.MeshStandardMaterial({
            color: p.color,
            roughness: 0.35,
            metalness: 0.7
        });

        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(10, 10, ringConfig.postHeight, 32),
            material
        );

        post.castShadow = true;
        post.receiveShadow = true;

        post.position.set(
            p.x,
            ringConfig.postHeight / 2 + ringConfig.ringHeight,
            p.z
        );

        scene.add(post);
    });

    //=================================================
    // Cuerdas con textura
    //=================================================
    const ropeTexture = textureLoader.load('assets/textures/cuerda.jpg');

    ropeTexture.wrapS = THREE.RepeatWrapping;
    ropeTexture.wrapT = THREE.RepeatWrapping;
    ropeTexture.repeat.set(1, 20);

    const ropeMaterial = new THREE.MeshStandardMaterial({
        map: ropeTexture,
        color: 0xffffff,
        roughness: 0.8,
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
        rope.position.set(0, h + ringConfig.ringHeight, 350);
        rope.castShadow = true;
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
        ropeSide.position.set(-350, h + ringConfig.ringHeight, 0);
        ropeSide.castShadow = true;
        ropeSide.receiveShadow = true;

        scene.add(ropeSide);

        // Derecha
        const right = ropeSide.clone();
        right.position.x = 350;
        scene.add(right);
    });
}