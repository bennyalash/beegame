import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { axialKey, axialToWorld, getLegalMoveDestinations, POINTY_TOP_ROTATION } from '../game/hexGrid.js';
import { createBeeChampion } from '../three/characters/beeChampion.js';
import { buildGameHud } from '../three/ui/gameHud.js';
import '../three/ui/threeCanvas.css';

const HEX_RADIUS = 0.76;
const PIECE_BASE_Y = 0.36;
const MOVE_DURATION = 560;

function makeMaterial(color, options = {}) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.48,
        metalness: 0.08,
        ...options,
    });
}

function makePieceModel(piece, ghost = false) {
    const group = createBeeChampion({
        teamColor: piece.player === 1 ? '#d65c4f' : '#4f91c1',
        queen: piece.type === 'queen',
        ghost,
    });
    group.userData.pieceId = piece.id;
    group.userData.piece = piece;
    group.userData.coordinate = [piece.position.x, piece.position.y];
    return group;
}

function setMaterialColor(material, color, emissive = '#000000', intensity = 0) {
    material.color.set(color);
    material.emissive.set(emissive);
    material.emissiveIntensity = intensity;
}

function updateTileLook(tile, props, hoveredKey) {
    const { q, r, faceMaterial, borderMaterial } = tile;
    const key = axialKey(q, r);
    const selectedAt = props.selectedPiece?.position;
    const selected = selectedAt?.x === q && selectedAt?.y === r;
    const lastMove = (props.lms?.[0] === q && props.lms?.[1] === r)
        || (props.lme?.[0] === q && props.lme?.[1] === r);
    const movingTargets = props.legalMoves || [];
    const isTarget = movingTargets.some(([mq, mr]) => mq === q && mr === r);
    const occupant = props.pieces?.find((candidate) => candidate.position?.x === q && candidate.position?.y === r);
    const hover = hoveredKey === key;

    if (selected) {
        setMaterialColor(faceMaterial, '#d3a444', '#e6c873', 0.28);
        borderMaterial.color.set('#f1d47b');
    } else if (isTarget && occupant && occupant.player !== props.turn) {
        setMaterialColor(faceMaterial, '#9b5a45', '#d47a54', hover ? 0.4 : 0.16);
        borderMaterial.color.set('#d99b73');
    } else if (isTarget) {
        setMaterialColor(faceMaterial, '#76925e', '#a8bd78', hover ? 0.34 : 0.14);
        borderMaterial.color.set('#c9d29a');
    } else if (hover) {
        setMaterialColor(faceMaterial, '#71866b', '#a5b78a', 0.14);
        borderMaterial.color.set('#c7cfaa');
    } else if (lastMove) {
        setMaterialColor(faceMaterial, '#897349', '#c1a56a', 0.12);
        borderMaterial.color.set('#c6ac74');
    } else {
        setMaterialColor(faceMaterial, '#50674b');
        borderMaterial.color.set('#98875a');
    }
}

function findUiAction(object) {
    let current = object;
    while (current) {
        if (current.userData?.action) return current;
        current = current.parent;
    }
    return null;
}

function samePayload(left, right) {
    if (left === right) return true;
    try {
        return JSON.stringify(left) === JSON.stringify(right);
    } catch {
        return false;
    }
}

function disposeTree(root) {
    root.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
                material.map?.dispose();
                material.dispose();
            });
        }
    });
}

export function ThreeGameBoard({
    p = 1,
    online = false,
    lms,
    lme,
    previewPosition,
    card,
    piece,
    onSelectPiece,
    selectedPiece,
    coords,
    pieces = [],
    onMove,
    isConfirming = false,
    turn = 1,
    humanPlayer,
    viewFlipped = false,
    mode = 'local',
    cards1 = [],
    cards2 = [],
    extraCard = null,
    menuOpen = false,
    leaveConfirm = false,
    winner = null,
    winType = null,
    didWin = null,
    ratingDelta = null,
    p1Name = 'PLAYER 1',
    p2Name = 'PLAYER 2',
    p1Level,
    p2Level,
    onRematch,
    onUiAction,
}) {
    const hostRef = useRef(null);
    const propsRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const uiGroupRef = useRef(null);
    const uiTargetsRef = useRef([]);
    const keyboardIndexRef = useRef(-1);
    const viewAspectRef = useRef(1);
    const viewHeightRef = useRef(12.2);
    const tileMapRef = useRef(new Map());
    const tileFacesRef = useRef([]);
    const piecesRef = useRef(new Map());
    const previousPositionsRef = useRef(new Map());
    const animationsRef = useRef(new Map());
    const retiringRef = useRef(new Set());
    const ghostRef = useRef(null);
    const hoveredKeyRef = useRef(null);
    const rafRef = useRef(null);
    const [rendererError, setRendererError] = useState('');
    const boardCoords = useMemo(() => coords || [], [coords]);
    const legalMoves = useMemo(() => {
        if (!piece || !card) return [];
        return getLegalMoveDestinations({ coords: boardCoords, card, piece, pieces, turn });
    }, [boardCoords, card, piece, pieces, turn]);

    propsRef.current = {
        p,
        online,
        lms,
        lme,
        previewPosition,
        card,
        selectedCard: card,
        piece,
        onSelectPiece,
        selectedPiece,
        coords: boardCoords,
        pieces,
        onMove,
        isConfirming,
        turn,
        player: p,
        humanPlayer: humanPlayer ?? (online ? p : null),
        viewFlipped,
        legalMoves,
        mode,
        cards1,
        cards2,
        extraCard,
        menuOpen,
        leaveConfirm,
        winner,
        winType,
        didWin,
        ratingDelta,
        p1Name,
        p2Name,
        topPlayerName: mode === 'ai' ? 'HIVE RIVAL' : (mode === 'online' ? (p === 1 ? p2Name : p1Name) : (turn === 1 ? p2Name : p1Name)),
        bottomPlayerName: mode === 'ai' ? 'YOUR HAND' : (mode === 'online' ? (p === 1 ? p1Name : p2Name) : (turn === 1 ? p1Name : p2Name)),
        leftSideName: p1Name,
        rightSideName: p2Name,
        p1Level,
        p2Level,
        onRematch,
        onUiAction,
    };

    const focusGameControl = (kind, action, payload) => {
        uiTargetsRef.current.forEach((target) => target.scale.setScalar(1));
        for (const group of piecesRef.current.values()) group.scale.setScalar(1);
        for (const tile of tileMapRef.current.values()) tile.group.scale.setScalar(1);

        let target;
        if (kind === 'piece') target = piecesRef.current.get(payload.id);
        else if (kind === 'move') target = tileMapRef.current.get(axialKey(payload[0], payload[1]))?.group;
        else target = uiTargetsRef.current.find((candidate) => candidate.userData.action === action
            && (payload === undefined || samePayload(candidate.userData.payload, payload)));
        target?.scale.setScalar(1.05);
    };

    const clearGameControlFocus = () => {
        uiTargetsRef.current.forEach((target) => target.scale.setScalar(1));
        for (const group of piecesRef.current.values()) group.scale.setScalar(1);
        for (const tile of tileMapRef.current.values()) tile.group.scale.setScalar(1);
        keyboardIndexRef.current = -1;
    };

    useEffect(() => {
        const uiGroup = uiGroupRef.current;
        if (!uiGroup) return;
        uiTargetsRef.current = buildGameHud(uiGroup, propsRef.current, viewAspectRef.current, viewHeightRef.current);
    });

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return undefined;
        let renderer;
        let resizeObserver;
        let pointerMove;
        let pointerDown;
        let keyDown;
        let animationFrame;
        try {
            const scene = new THREE.Scene();
            scene.background = new THREE.Color('#e6e3d9');
            scene.fog = new THREE.Fog('#e6e3d9', 16, 34);

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.18;
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.domElement.className = 'three-board-canvas';
            renderer.domElement.setAttribute('aria-label', 'Go Bee 3D match. Use arrow keys to highlight scene controls, Enter to activate, and Tab to reach labeled game actions.');
            renderer.domElement.setAttribute('role', 'application');
            renderer.domElement.tabIndex = 0;
            host.appendChild(renderer.domElement);

            const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
            camera.position.set(8, 10, 9);
            camera.lookAt(0, 0, 0);
            scene.add(camera);
            const uiGroup = new THREE.Group();
            uiGroup.position.z = -5.7;
            camera.add(uiGroup);
            uiGroupRef.current = uiGroup;

            scene.add(new THREE.HemisphereLight('#f7efd8', '#26392c', 1.8));
            const keyLight = new THREE.DirectionalLight('#fff2d8', 3.4);
            keyLight.position.set(-5, 10, 7);
            keyLight.castShadow = true;
            keyLight.shadow.mapSize.set(1024, 1024);
            keyLight.shadow.camera.left = -7;
            keyLight.shadow.camera.right = 7;
            keyLight.shadow.camera.top = 7;
            keyLight.shadow.camera.bottom = -7;
            keyLight.shadow.bias = -0.0003;
            keyLight.shadow.radius = 5;
            scene.add(keyLight);
            const rimLight = new THREE.DirectionalLight('#d8bf7f', 0.7);
            rimLight.position.set(6, 5, -7);
            scene.add(rimLight);

            const table = new THREE.Mesh(
                new THREE.PlaneGeometry(50, 50),
                makeMaterial('#20362e', { roughness: 0.96, metalness: 0 }),
            );
            table.rotation.x = -Math.PI / 2;
            table.position.y = -0.17;
            table.receiveShadow = true;
            scene.add(table);

            const platform = new THREE.Mesh(
                new THREE.CylinderGeometry(4.38, 4.52, 0.22, 48),
                makeMaterial('#304639', { roughness: 0.78, metalness: 0.02 }),
            );
            platform.position.y = -0.06;
            platform.receiveShadow = true;
            platform.castShadow = true;
            scene.add(platform);

            const boardGroup = new THREE.Group();
            scene.add(boardGroup);
            const tileMap = new Map();
            const tileFaces = [];
            const baseMaterial = makeMaterial('#344b3d', { roughness: 0.72, metalness: 0.03 });
            for (const [q, r] of boardCoords) {
                const tileGroup = new THREE.Group();
                const world = axialToWorld(q, r, HEX_RADIUS);
                tileGroup.position.set(world.x, 0, world.z);
                tileGroup.rotation.y = POINTY_TOP_ROTATION;
                tileGroup.userData.coordinate = [q, r];

                const rim = new THREE.Mesh(new THREE.CylinderGeometry(HEX_RADIUS * 0.98, HEX_RADIUS, 0.22, 6), baseMaterial.clone());
                rim.position.y = 0.105;
                tileGroup.add(rim);

                const faceMaterial = makeMaterial('#50674b', { roughness: 0.66, metalness: 0.02 });
                const face = new THREE.Mesh(new THREE.CylinderGeometry(HEX_RADIUS * 0.89, HEX_RADIUS * 0.95, 0.16, 6), faceMaterial);
                face.position.y = 0.29;
                face.userData.coordinate = [q, r];
                tileGroup.add(face);
                tileFaces.push(face);

                const borderMaterial = new THREE.LineBasicMaterial({ color: '#98875a', transparent: true, opacity: 0.78 });
                const vertices = [];
                const outlineRadius = HEX_RADIUS * 0.88;
                for (let index = 0; index <= 6; index += 1) {
                    const angle = (Math.PI / 3) * index;
                    vertices.push(new THREE.Vector3(Math.cos(angle) * outlineRadius, 0.38, Math.sin(angle) * outlineRadius));
                }
                const outline = new THREE.Line(new THREE.BufferGeometry().setFromPoints(vertices), borderMaterial);
                tileGroup.add(outline);
                boardGroup.add(tileGroup);
                tileMap.set(axialKey(q, r), { q, r, group: tileGroup, faceMaterial, borderMaterial, face });
            }
            tileMapRef.current = tileMap;
            tileFacesRef.current = tileFaces;
            sceneRef.current = scene;
            cameraRef.current = camera;
            rendererRef.current = renderer;

            const raycaster = new THREE.Raycaster();
            const pointer = new THREE.Vector2();
            const allPieceObjects = () => [...piecesRef.current.values()].flatMap((group) => group.children);
            const readHit = (event) => {
                const rect = renderer.domElement.getBoundingClientRect();
                if (!rect.width || !rect.height) return null;
                pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
                raycaster.setFromCamera(pointer, camera);
                const uiHits = raycaster.intersectObjects(uiTargetsRef.current, true);
                for (const uiHit of uiHits) {
                    const actionTarget = findUiAction(uiHit.object);
                    if (actionTarget) {
                        return { uiAction: actionTarget.userData.action, payload: actionTarget.userData.payload };
                    }
                }
                const pieceHits = raycaster.intersectObjects(allPieceObjects(), true);
                const taggedPiece = pieceHits.find((hit) => findPieceId(hit.object));
                if (taggedPiece) {
                    const id = findPieceId(taggedPiece.object);
                    const group = piecesRef.current.get(id);
                    return { pieceId: id, coordinate: group?.userData.coordinate };
                }
                const tileHit = raycaster.intersectObjects(tileFaces, false)[0];
                return tileHit ? { coordinate: tileHit.object.userData.coordinate } : null;
            };

            pointerMove = (event) => {
                const hit = readHit(event);
                if (hit?.uiAction) {
                    renderer.domElement.style.cursor = 'pointer';
                    return;
                }
                const nextKey = hit?.coordinate ? axialKey(...hit.coordinate) : null;
                if (nextKey !== hoveredKeyRef.current) {
                    const previous = hoveredKeyRef.current;
                    hoveredKeyRef.current = nextKey;
                    if (previous && tileMap.has(previous)) updateTileLook(tileMap.get(previous), propsRef.current, nextKey);
                    if (nextKey && tileMap.has(nextKey)) updateTileLook(tileMap.get(nextKey), propsRef.current, nextKey);
                }
                const props = propsRef.current;
                const canPick = hit?.pieceId && props.pieces.find((item) => item.id === hit.pieceId);
                const canMove = hit?.coordinate && props.legalMoves.some(([q, r]) => q === hit.coordinate[0] && r === hit.coordinate[1]);
                renderer.domElement.style.cursor = canPick || canMove ? 'pointer' : 'grab';
            };

            pointerDown = (event) => {
                if (event.button !== undefined && event.button !== 0) return;
                renderer.domElement.focus({ preventScroll: true });
                const hit = readHit(event);
                if (hit?.uiAction) {
                    event.preventDefault();
                    propsRef.current.onUiAction?.(hit.uiAction, hit.payload);
                    return;
                }
                if (!hit?.coordinate) return;
                const props = propsRef.current;
                const [q, r] = hit.coordinate;
                const isLegalTarget = props.legalMoves.some(([mq, mr]) => mq === q && mr === r);
                if (isLegalTarget) {
                    props.onMove?.([q, r]);
                    return;
                }
                const candidate = hit.pieceId && props.pieces.find((item) => item.id === hit.pieceId);
                if (candidate && candidate.player === props.turn && (!props.humanPlayer || candidate.player === props.humanPlayer)) {
                    props.onSelectPiece?.(candidate);
                }
            };

            keyDown = (event) => {
                const actions = uiTargetsRef.current.filter((target) => target.userData?.action && target.userData.action !== 'noop');
                if (!actions.length) return;
                const count = actions.length;
                const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
                const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
                if (forward || backward) {
                    event.preventDefault();
                    keyboardIndexRef.current = keyboardIndexRef.current < 0
                        ? (backward ? count - 1 : 0)
                        : (keyboardIndexRef.current + (backward ? -1 : 1) + count) % count;
                    uiTargetsRef.current.forEach((target) => target.scale.setScalar(1));
                    actions[keyboardIndexRef.current]?.scale.setScalar(1.04);
                } else if (event.key === 'Enter' || event.key === ' ') {
                    const target = actions[keyboardIndexRef.current < 0 ? 0 : keyboardIndexRef.current];
                    if (target?.userData?.action) propsRef.current.onUiAction?.(target.userData.action, target.userData.payload);
                }
            };

            renderer.domElement.addEventListener('pointermove', pointerMove);
            renderer.domElement.addEventListener('pointerdown', pointerDown);
            renderer.domElement.addEventListener('keydown', keyDown);

            const resize = () => {
                const width = host.clientWidth || 400;
                const height = host.clientHeight || 400;
                const aspect = width / height;
                const frustumHeight = Math.max(9.6, 9.6 / aspect);
                viewAspectRef.current = aspect;
                viewHeightRef.current = frustumHeight;
                camera.left = (-frustumHeight * aspect) / 2;
                camera.right = (frustumHeight * aspect) / 2;
                camera.top = frustumHeight / 2;
                camera.bottom = -frustumHeight / 2;
                camera.updateProjectionMatrix();
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
                renderer.setSize(width, height, false);
                uiTargetsRef.current = buildGameHud(uiGroup, propsRef.current, aspect, frustumHeight);
            };
            resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(host);
            resize();

            const clock = new THREE.Clock();
            const frame = (time) => {
                const delta = Math.min(clock.getDelta(), 0.05);
                const props = propsRef.current;
                const angle = (props.viewFlipped ? Math.PI : 0) + 0.48;
                const cameraRadius = 10.6;
                const desiredPosition = new THREE.Vector3(Math.sin(angle) * cameraRadius, 10.1, Math.cos(angle) * cameraRadius);
                camera.position.lerp(desiredPosition, 1 - Math.exp(-delta * 2.2));
                camera.lookAt(0, 0.12, 0);

                for (const [group, animation] of animationsRef.current) {
                    const progress = Math.min(1, (time - animation.startedAt) / animation.duration);
                    const eased = 1 - ((1 - progress) ** 3);
                    if (animation.capture) {
                        group.position.y = animation.from.y - eased * 0.72;
                        group.scale.setScalar(Math.max(0.001, 1 - eased));
                    } else {
                        group.position.x = THREE.MathUtils.lerp(animation.from.x, animation.to.x, eased);
                        group.position.z = THREE.MathUtils.lerp(animation.from.z, animation.to.z, eased);
                        group.position.y = PIECE_BASE_Y + Math.sin(progress * Math.PI) * 0.92;
                        const bounce = progress > 0.82 ? Math.sin(((progress - 0.82) / 0.18) * Math.PI) * 0.09 : 0;
                        group.scale.setScalar(1 + bounce);
                    }
                    if (progress >= 1) {
                        animationsRef.current.delete(group);
                        if (animation.capture) {
                            scene.remove(group);
                            disposeTree(group);
                            piecesRef.current.delete(group.userData.pieceId);
                            retiringRef.current.delete(group.userData.pieceId);
                        } else {
                            group.position.y = PIECE_BASE_Y;
                            group.scale.setScalar(1);
                            group.userData.coordinate = animation.destination;
                        }
                    }
                }
                for (const tile of tileMapRef.current.values()) {
                    tile.group.position.y = Math.sin(time * 0.0013 + tile.q * 0.8 + tile.r * 0.55) * 0.008;
                }
                renderer.render(scene, camera);
                animationFrame = window.requestAnimationFrame(frame);
                rafRef.current = animationFrame;
            };
            animationFrame = window.requestAnimationFrame(frame);
            rafRef.current = animationFrame;
        } catch (error) {
            console.error('Unable to initialize the 3D board:', error);
            setRendererError('3D graphics could not start in this browser. Please enable WebGL or try a browser with hardware acceleration.');
        }

        return () => {
            if (animationFrame) window.cancelAnimationFrame(animationFrame);
            if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
            resizeObserver?.disconnect();
            if (renderer?.domElement && pointerMove) renderer.domElement.removeEventListener('pointermove', pointerMove);
            if (renderer?.domElement && pointerDown) renderer.domElement.removeEventListener('pointerdown', pointerDown);
            if (renderer?.domElement && keyDown) renderer.domElement.removeEventListener('keydown', keyDown);
            if (rendererRef.current) {
                for (const group of piecesRef.current.values()) disposeTree(group);
                if (ghostRef.current) disposeTree(ghostRef.current);
                disposeTree(sceneRef.current);
                rendererRef.current.dispose();
                rendererRef.current.domElement.remove();
            }
            rendererRef.current = null;
            sceneRef.current = null;
            cameraRef.current = null;
            uiGroupRef.current = null;
            uiTargetsRef.current = [];
            tileMapRef.current = new Map();
            tileFacesRef.current = [];
            piecesRef.current = new Map();
            previousPositionsRef.current = new Map();
            animationsRef.current = new Map();
            retiringRef.current = new Set();
            ghostRef.current = null;
            hoveredKeyRef.current = null;
        };
    }, [boardCoords]);

    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;
        const incomingIds = new Set(pieces.map((item) => item.id));
        const byId = new Map(pieces.map((item) => [item.id, item]));

        for (const [id, group] of piecesRef.current) {
            if (!incomingIds.has(id) && !retiringRef.current.has(id)) {
                retiringRef.current.add(id);
                animationsRef.current.set(group, {
                    capture: true,
                    from: group.position.clone(),
                    startedAt: performance.now(),
                    duration: 380,
                });
            }
        }

        for (const item of pieces) {
            const key = axialKey(item.position.x, item.position.y);
            const destination = axialToWorld(item.position.x, item.position.y, HEX_RADIUS);
            let group = piecesRef.current.get(item.id);
            if (!group) {
                group = makePieceModel(item);
                group.position.set(destination.x, PIECE_BASE_Y + 0.45, destination.z);
                group.scale.setScalar(0.72);
                scene.add(group);
                piecesRef.current.set(item.id, group);
                animationsRef.current.set(group, {
                    from: group.position.clone(),
                    to: new THREE.Vector3(destination.x, PIECE_BASE_Y, destination.z),
                    destination: [item.position.x, item.position.y],
                    startedAt: performance.now(),
                    duration: 440,
                });
            } else {
                const previousKey = previousPositionsRef.current.get(item.id);
                if (previousKey && previousKey !== key) {
                    const from = group.position.clone();
                    group.position.set(from.x, PIECE_BASE_Y, from.z);
                    animationsRef.current.set(group, {
                        from: group.position.clone(),
                        to: new THREE.Vector3(destination.x, PIECE_BASE_Y, destination.z),
                        destination: [item.position.x, item.position.y],
                        startedAt: performance.now(),
                        duration: MOVE_DURATION,
                    });
                }
                group.userData.piece = item;
            }
            previousPositionsRef.current.set(item.id, key);
        }

        for (const tile of tileMapRef.current.values()) updateTileLook(tile, propsRef.current, hoveredKeyRef.current);

        if (ghostRef.current) {
            scene.remove(ghostRef.current);
            disposeTree(ghostRef.current);
            ghostRef.current = null;
        }
        if (previewPosition && piece && sceneRef.current) {
            const ghostPiece = byId.get(piece.id) || piece;
            const ghost = makePieceModel(ghostPiece, true);
            const ghostWorld = axialToWorld(previewPosition[0], previewPosition[1], HEX_RADIUS);
            ghost.position.set(ghostWorld.x, PIECE_BASE_Y + 0.03, ghostWorld.z);
            scene.add(ghost);
            ghostRef.current = ghost;
        }
    }, [pieces, selectedPiece, piece, previewPosition, lms, lme, turn, card, legalMoves]);

    const playableCards = mode === 'online'
        ? (p === 1 ? cards1 : cards2)
        : mode === 'ai'
            ? cards1
            : (turn === 1 ? cards1 : cards2);

    if (rendererError) {
        return <div className="board three-board-fallback" role="alert" aria-live="assertive">
            <p className="three-board-error">3D graphics could not start in this browser. Enable WebGL or try a browser with hardware acceleration to play this match.</p>
        </div>;
    }

    return (
        <div ref={hostRef} className="board three-board" role="application" aria-label="Go Bee 3D game board">
            <nav className="three-a11y-controls" aria-label="Game controls" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) clearGameControlFocus(); }}>
                <span className="three-a11y-status" aria-live="polite">Go Bee match controls. Use Tab for labeled actions and arrow keys for scene controls.</span>
                <button type="button" onFocus={() => focusGameControl('action', menuOpen ? 'resume' : 'openMenu')} onClick={() => onUiAction?.(menuOpen ? 'resume' : 'openMenu')}>{menuOpen ? 'Resume match' : 'Open game menu'}</button>
                {playableCards.map((moveCard, index) => <button key={`${moveCard.name}-${index}`} type="button" onFocus={() => focusGameControl('action', 'selectCard', moveCard)} onClick={() => onUiAction?.('selectCard', moveCard)}>Select card {moveCard.name}</button>)}
                {pieces.filter((item) => item.player === turn && (!humanPlayer || item.player === humanPlayer)).map((item) => <button key={item.id} type="button" onFocus={() => focusGameControl('piece', null, item)} onClick={() => onSelectPiece?.(item)}>Select {item.type} at hex {item.position.x}, {item.position.y}</button>)}
                {legalMoves.map(([q, r]) => <button key={`${q},${r}`} type="button" onFocus={() => focusGameControl('move', null, [q, r])} onClick={() => onMove?.([q, r])}>Move to hex {q}, {r}</button>)}
                {menuOpen && !winner && <button type="button" onFocus={() => focusGameControl('action', online ? 'requestResign' : 'requestLeave')} onClick={() => onUiAction?.(online ? 'requestResign' : 'requestLeave')}>{online ? 'Resign match' : 'Leave game'}</button>}
                {leaveConfirm && <button type="button" onFocus={() => focusGameControl('action', 'confirmLeave')} onClick={() => onUiAction?.('confirmLeave')}>Confirm {online ? 'resignation' : 'leaving match'}</button>}
                {leaveConfirm && <button type="button" onFocus={() => focusGameControl('action', 'cancelLeave')} onClick={() => onUiAction?.('cancelLeave')}>Cancel leaving match</button>}
                {isConfirming && <button type="button" onFocus={() => focusGameControl('action', 'cancelMove')} onClick={() => onUiAction?.('cancelMove')}>Cancel move</button>}
                {isConfirming && <button type="button" onFocus={() => focusGameControl('action', 'confirmMove')} onClick={() => onUiAction?.('confirmMove')}>Confirm move</button>}
                {winner && <button type="button" onFocus={() => focusGameControl('action', 'exitMatch')} onClick={() => onUiAction?.('exitMatch')}>Back to the hive</button>}
                {winner && onRematch && <button type="button" onFocus={() => focusGameControl('action', 'rematch')} onClick={() => onUiAction?.('rematch')}>Rematch</button>}
            </nav>
        </div>
    );
}

function findPieceId(object) {
    let current = object;
    while (current) {
        if (current.userData?.pieceId) return current.userData.pieceId;
        current = current.parent;
    }
    return null;
}
