import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { axialKey, axialToWorld, getLegalMoveDestinations } from '../game/hexGrid.js';
import GameBoard from './GameBoard.jsx';

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

function setShadowFlags(group) {
    group.traverse((object) => {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
}

function makePieceModel(piece, ghost = false) {
    const group = new THREE.Group();
    group.userData.pieceId = piece.id;
    group.userData.piece = piece;
    group.userData.coordinate = [piece.position.x, piece.position.y];
    const color = piece.player === 1 ? '#e45b52' : '#56aaf0';
    const opacity = ghost ? 0.48 : 1;
    const transparent = ghost;
    const body = makeMaterial(color, { transparent, opacity, roughness: 0.34, metalness: 0.18 });
    const trim = makeMaterial('#f1c46f', { transparent, opacity, metalness: 0.72, roughness: 0.25 });
    const dark = makeMaterial('#18242a', { transparent, opacity, roughness: 0.55 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.11, 10), trim);
    base.position.y = 0.07;
    group.add(base);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.35, 9), body);
    torso.position.y = 0.29;
    group.add(torso);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 14), body);
    belly.scale.set(1, 0.74, 1);
    belly.position.y = 0.47;
    group.add(belly);

    const head = new THREE.Mesh(new THREE.SphereGeometry(piece.type === 'queen' ? 0.17 : 0.135, 20, 16), trim);
    head.position.y = piece.type === 'queen' ? 0.66 : 0.63;
    group.add(head);

    if (piece.type === 'queen') {
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, 0.19, 7), trim);
        crown.position.y = 0.83;
        group.add(crown);
        const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 12), dark);
        crownBand.rotation.x = Math.PI / 2;
        crownBand.position.y = 0.77;
        group.add(crownBand);
        for (let i = 0; i < 5; i += 1) {
            const angle = (i / 5) * Math.PI * 2;
            const point = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), trim);
            point.position.set(Math.cos(angle) * 0.15, 0.95, Math.sin(angle) * 0.15);
            group.add(point);
        }
    } else {
        const antenna = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 7), trim);
        antenna.position.y = 0.79;
        group.add(antenna);
    }

    setShadowFlags(group);
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
        setMaterialColor(faceMaterial, '#e1a72c', '#ffc74f', 0.5);
        borderMaterial.color.set('#ffdd84');
    } else if (isTarget && occupant && occupant.player !== props.turn) {
        setMaterialColor(faceMaterial, '#a6553e', '#ff774f', hover ? 0.72 : 0.34);
        borderMaterial.color.set('#ff9b66');
    } else if (isTarget) {
        setMaterialColor(faceMaterial, '#318b73', '#44e0ae', hover ? 0.68 : 0.32);
        borderMaterial.color.set('#74ffd6');
    } else if (hover) {
        setMaterialColor(faceMaterial, '#547b77', '#83d9c7', 0.32);
        borderMaterial.color.set('#a2f2df');
    } else if (lastMove) {
        setMaterialColor(faceMaterial, '#806534', '#eab64e', 0.25);
        borderMaterial.color.set('#d7ae60');
    } else {
        setMaterialColor(faceMaterial, '#355260');
        borderMaterial.color.set('#63808a');
    }
}

function disposeTree(root) {
    root.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
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
    turn = 1,
    humanPlayer,
    viewFlipped = false,
}) {
    const hostRef = useRef(null);
    const propsRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
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
        piece,
        onSelectPiece,
        selectedPiece,
        coords: boardCoords,
        pieces,
        onMove,
        turn,
        humanPlayer: humanPlayer ?? (online ? p : null),
        viewFlipped,
        legalMoves,
    };

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return undefined;
        let renderer;
        let resizeObserver;
        let pointerMove;
        let pointerDown;
        let animationFrame;
        try {
            const scene = new THREE.Scene();
            scene.background = new THREE.Color('#111c21');
            scene.fog = new THREE.Fog('#111c21', 13, 28);

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.18;
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.domElement.className = 'three-board-canvas';
            renderer.domElement.setAttribute('aria-label', 'Interactive 3D hex board. Select one of your pieces, choose a movement card, then choose a highlighted destination.');
            renderer.domElement.setAttribute('role', 'img');
            renderer.domElement.tabIndex = 0;
            host.appendChild(renderer.domElement);

            const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
            camera.position.set(8, 10, 9);
            camera.lookAt(0, 0, 0);

            scene.add(new THREE.HemisphereLight('#fff3d9', '#233b48', 2.0));
            const keyLight = new THREE.DirectionalLight('#fff1d3', 4.2);
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
            const rimLight = new THREE.DirectionalLight('#70cad4', 1.5);
            rimLight.position.set(6, 5, -7);
            scene.add(rimLight);

            const table = new THREE.Mesh(
                new THREE.PlaneGeometry(50, 50),
                makeMaterial('#162329', { roughness: 0.9, metalness: 0.05 }),
            );
            table.rotation.x = -Math.PI / 2;
            table.position.y = -0.17;
            table.receiveShadow = true;
            scene.add(table);

            const platform = new THREE.Mesh(
                new THREE.CylinderGeometry(4.38, 4.52, 0.22, 48),
                makeMaterial('#21343b', { roughness: 0.56, metalness: 0.18 }),
            );
            platform.position.y = -0.06;
            platform.receiveShadow = true;
            platform.castShadow = true;
            scene.add(platform);

            const boardGroup = new THREE.Group();
            scene.add(boardGroup);
            const tileMap = new Map();
            const tileFaces = [];
            const baseMaterial = makeMaterial('#263b43', { roughness: 0.58, metalness: 0.16 });
            for (const [q, r] of boardCoords) {
                const tileGroup = new THREE.Group();
                const world = axialToWorld(q, r, HEX_RADIUS);
                tileGroup.position.set(world.x, 0, world.z);
                tileGroup.userData.coordinate = [q, r];

                const rim = new THREE.Mesh(new THREE.CylinderGeometry(HEX_RADIUS * 0.98, HEX_RADIUS, 0.22, 6), baseMaterial.clone());
                rim.position.y = 0.105;
                tileGroup.add(rim);

                const faceMaterial = makeMaterial('#355260', { roughness: 0.42, metalness: 0.08 });
                const face = new THREE.Mesh(new THREE.CylinderGeometry(HEX_RADIUS * 0.89, HEX_RADIUS * 0.95, 0.16, 6), faceMaterial);
                face.position.y = 0.29;
                face.userData.coordinate = [q, r];
                tileGroup.add(face);
                tileFaces.push(face);

                const borderMaterial = new THREE.LineBasicMaterial({ color: '#63808a', transparent: true, opacity: 0.92 });
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
                const hit = readHit(event);
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

            renderer.domElement.addEventListener('pointermove', pointerMove);
            renderer.domElement.addEventListener('pointerdown', pointerDown);

            const resize = () => {
                const width = host.clientWidth || 400;
                const height = host.clientHeight || 400;
                const aspect = width / height;
                const frustumHeight = 8.9;
                camera.left = (-frustumHeight * aspect) / 2;
                camera.right = (frustumHeight * aspect) / 2;
                camera.top = frustumHeight / 2;
                camera.bottom = -frustumHeight / 2;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height, false);
            };
            resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(host);
            resize();

            const clock = new THREE.Clock();
            const frame = (time) => {
                const delta = Math.min(clock.getDelta(), 0.05);
                const props = propsRef.current;
                const angle = (props.viewFlipped ? Math.PI : 0) + 0.48 + (props.turn === 2 ? 0.12 : 0);
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

    if (rendererError) {
        return <div className="board three-board-fallback" role="application" aria-label="Fallback game board">
            <div className="three-fallback-message" role="alert">3D graphics are unavailable here, so this match is using the classic board.</div>
            <GameBoard p={p} online={online} lms={lms} lme={lme} previewPosition={previewPosition} card={card} piece={piece} onSelectPiece={onSelectPiece} selectedPiece={selectedPiece} coords={boardCoords} pieces={pieces} onMove={onMove} turn={turn} />
        </div>;
    }

    return (
        <div ref={hostRef} className="board three-board" role="application" aria-label="Go Bee 3D game board">
            {rendererError && <div className="three-board-error" role="alert">{rendererError}</div>}
            <div className="three-board-hint" aria-hidden="true">Select a piece · pick a card · move to a glowing hex</div>
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
