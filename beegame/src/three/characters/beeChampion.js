import * as THREE from 'three';

function makeMaterial(color, { ghost = false, roughness = 0.48, metalness = 0.06 } = {}) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        transparent: ghost,
        opacity: ghost ? 0.46 : 1,
        depthWrite: !ghost,
    });
}

function addSphere(parent, material, position, scale, segments = 18) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.max(12, Math.floor(segments * 0.7))), material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
}

function addTube(parent, points, material, radius = 0.018) {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, radius, 8, false), material);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
}

export function createBeeChampion({ teamColor = '#d65c4f', queen = false, ghost = false, scale = 1 } = {}) {
    const root = new THREE.Group();
    root.scale.setScalar(scale);
    root.userData.wings = [];

    const armor = makeMaterial(teamColor, { ghost, roughness: 0.34, metalness: 0.26 });
    const honey = makeMaterial('#f0bd4b', { ghost, roughness: 0.35, metalness: 0.38 });
    const honeyLight = makeMaterial('#ffe29a', { ghost, roughness: 0.32, metalness: 0.24 });
    const stripe = makeMaterial('#252a30', { ghost, roughness: 0.58, metalness: 0.04 });
    const face = makeMaterial('#f2c65f', { ghost, roughness: 0.42, metalness: 0.12 });
    const eyeWhite = makeMaterial('#fff7e6', { ghost, roughness: 0.26 });
    const pupil = makeMaterial('#17202b', { ghost, roughness: 0.18 });
    const wingMaterial = makeMaterial('#d8f0e8', { ghost, roughness: 0.24, metalness: 0.08 });
    wingMaterial.transparent = true;
    wingMaterial.opacity = ghost ? 0.26 : 0.68;
    wingMaterial.depthWrite = false;

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.34, 0.12, 6), makeMaterial('#d5a13c', { ghost, roughness: 0.4, metalness: 0.42 }));
    base.rotation.y = Math.PI / 6;
    base.position.y = 0.06;
    base.castShadow = true;
    root.add(base);

    addSphere(root, honey, [0, 0.42, -0.015], [0.29, 0.36, 0.26], 22);
    for (const y of [0.26, 0.47, 0.66]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(y === 0.66 ? 0.22 : 0.265, 0.034, 8, 24), stripe);
        band.rotation.x = Math.PI / 2;
        band.position.set(0, y, -0.015);
        band.castShadow = true;
        root.add(band);
    }

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 14), armor);
    chest.scale.set(0.88, 0.72, 0.52);
    chest.position.set(0, 0.65, 0.16);
    chest.castShadow = true;
    root.add(chest);
    addSphere(root, honeyLight, [0, 0.65, 0.27], [0.07, 0.09, 0.035], 14);

    addSphere(root, face, [0, 0.93, 0.015], [0.255, 0.245, 0.23], 22);
    for (const side of [-1, 1]) {
        addSphere(root, eyeWhite, [side * 0.096, 0.96, 0.206], [0.072, 0.09, 0.045], 16);
        addSphere(root, pupil, [side * 0.087, 0.947, 0.245], [0.034, 0.051, 0.025], 14);
        addSphere(root, eyeWhite, [side * 0.095 - 0.012, 0.971, 0.267], [0.012, 0.016, 0.009], 10);
        addSphere(root, makeMaterial('#d98373', { ghost, roughness: 0.6 }), [side * 0.18, 0.86, 0.17], [0.045, 0.026, 0.014], 12);
        addTube(root, [
            [side * 0.09, 1.12, 0.02],
            [side * 0.13, 1.27, 0.015],
            [side * 0.21, 1.31, 0.01],
        ], stripe, 0.018);
        addSphere(root, honeyLight, [side * 0.21, 1.31, 0.01], [0.04, 0.04, 0.04], 12);

        const wing = addSphere(root, wingMaterial, [side * 0.28, 0.76, -0.19], [0.18, 0.27, 0.055], 16);
        wing.rotation.z = side * -0.5;
        root.userData.wings.push(wing);

        addTube(root, [
            [side * 0.21, 0.56, 0.04],
            [side * 0.34, 0.52, 0.1],
            [side * 0.37, 0.43, 0.17],
        ], stripe, 0.045);
        addSphere(root, armor, [side * 0.37, 0.43, 0.17], [0.07, 0.055, 0.06], 12);
        addTube(root, [
            [side * 0.15, 0.16, 0],
            [side * 0.17, 0.07, 0.05],
            [side * 0.22, 0.055, 0.09],
        ], stripe, 0.045);
        addSphere(root, armor, [side * 0.22, 0.055, 0.09], [0.095, 0.045, 0.1], 12);
    }

    if (queen) {
        const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.09, 6), honeyLight);
        crownBase.rotation.y = Math.PI / 6;
        crownBase.position.y = 1.19;
        crownBase.castShadow = true;
        root.add(crownBase);
        for (let index = 0; index < 3; index += 1) {
            const x = (index - 1) * 0.11;
            const point = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.17, 5), honeyLight);
            point.position.set(x, 1.31, 0.005);
            point.castShadow = true;
            root.add(point);
        }
        const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), makeMaterial('#83c5b1', { ghost, metalness: 0.22 }));
        jewel.position.set(0, 1.19, 0.17);
        root.add(jewel);
    } else {
        const scoutCap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.09, 6), armor);
        scoutCap.rotation.y = Math.PI / 6;
        scoutCap.position.y = 1.14;
        scoutCap.castShadow = true;
        root.add(scoutCap);
    }

    root.traverse((object) => {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
    return root;
}
