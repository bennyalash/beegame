import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createBeeChampion } from '../three/characters/beeChampion.js';
import { createScenePanel } from '../three/ui/scenePanel.js';
import { POINTY_TOP_ROTATION } from '../game/hexGrid.js';
import '../three/ui/threeCanvas.css';

const NAV_ITEMS = [
    ['home', 'HOME'],
    ['active', 'GAMES'],
    ['friends', 'FRIENDS'],
    ['recent', 'RECENT'],
];

function disposeGroup(group) {
    if (!group) return;
    group.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
                if (material.map) material.map.dispose();
                material.dispose();
            });
        }
    });
}

function createHexProp(radius, depth, color, x, y, z, rotation = POINTY_TOP_ROTATION) {
    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.91, radius, depth, 6),
        new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.12 }),
    );
    mesh.rotation.y = rotation;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function dataText(value, fallback = '') {
    return value === null || value === undefined || value === '' ? fallback : String(value);
}

function samePayload(left, right) {
    if (left === right) return true;
    try {
        return JSON.stringify(left) === JSON.stringify(right);
    } catch {
        return false;
    }
}

function gameOpponent(game, userId) {
    return game?.Player1 === userId ? game?.P2Name : game?.P1Name;
}

export function ThreeAppCanvas({
    view = 'home',
    user = null,
    data = {},
    actions = {},
    searchValue = '',
    onSearchChange,
    loginError = '',
}) {
    const hostRef = useRef(null);
    const inputRef = useRef(null);
    const controlsRef = useRef(null);
    const statusRef = useRef(null);
    const propsRef = useRef({ view, user, data, actions, searchValue, loginError });
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const uiRef = useRef(null);
    const raycasterRef = useRef(null);
    const interactiveRef = useRef([]);
    const heroRef = useRef(null);
    const focusedActionRef = useRef(-1);
    const rebuildRef = useRef(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [listPage, setListPage] = useState(0);
    const [rendererError, setRendererError] = useState('');

    propsRef.current = { view, user, data, actions, searchValue, loginError, settingsOpen, confirmAction, listPage };

    const runAction = (action, payload) => {
        const current = propsRef.current;
        if (!action) return;
        if (action === 'focusSearch') {
            inputRef.current?.focus();
            return;
        }
        if (action === 'toggleSettings') {
            setSettingsOpen((open) => !open);
            return;
        }
        if (action === 'logout') {
            setConfirmAction('logout');
            return;
        }
        if (action === 'confirmAction') {
            current.actions?.[current.confirmAction]?.();
            setConfirmAction(null);
            return;
        }
        if (action === 'cancelConfirm') {
            setConfirmAction(null);
            return;
        }
        if (action === 'previousPage') {
            setListPage((page) => Math.max(0, page - 1));
            return;
        }
        if (action === 'nextPage') {
            setListPage((page) => page + 1);
            return;
        }
        current.actions?.[action]?.(payload);
    };

    const focusSceneAction = (action, payload, label) => {
        const panels = interactiveRef.current;
        const index = panels.findIndex((panel) => panel.userData.action === action
            && (payload === undefined || samePayload(panel.userData.payload, payload)));
        panels.forEach((panel) => panel.scale.setScalar(1));
        focusedActionRef.current = index;
        if (index >= 0) panels[index].scale.setScalar(1.04);
        if (statusRef.current && label) statusRef.current.textContent = label;
    };

    const clearSceneActionFocus = () => {
        interactiveRef.current.forEach((panel) => panel.scale.setScalar(1));
        focusedActionRef.current = -1;
        if (statusRef.current) {
            statusRef.current.textContent = view === 'home' ? 'Go Bee lobby' : view === 'friends' ? 'Friends' : view === 'active' ? 'Active games' : view === 'recent' ? 'Recent games' : view;
        }
    };

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return undefined;
        let renderer;
        let resizeObserver;
        let animationFrame = 0;
        let pointerMove;
        let pointerDown;
        let keyDown;
        let hoveredPanel = null;
        const clock = new THREE.Clock();

        try {
            const scene = new THREE.Scene();
            scene.background = new THREE.Color('#111c29');
            scene.fog = new THREE.Fog('#111c29', 24, 54);

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.12;
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.domElement.className = 'three-app-canvas';
            renderer.domElement.setAttribute('role', 'application');
            renderer.domElement.setAttribute('aria-label', 'Go Bee interactive 3D game interface. Use Tab for labeled actions, arrow keys to highlight scene controls, and Enter to activate.');
            renderer.domElement.tabIndex = 0;
            host.appendChild(renderer.domElement);

            const camera = new THREE.OrthographicCamera(-7, 7, 5.5, -5.5, 0.1, 100);
            camera.position.set(0, 2.2, 19);
            camera.lookAt(0, 0, 0);
            scene.add(camera);

            scene.add(new THREE.HemisphereLight('#f9f1dc', '#243141', 1.8));
            const keyLight = new THREE.DirectionalLight('#fff1cf', 3.0);
            keyLight.position.set(-5, 11, 9);
            keyLight.castShadow = true;
            keyLight.shadow.mapSize.set(1024, 1024);
            scene.add(keyLight);
            const rimLight = new THREE.DirectionalLight('#8aa9c1', 1.3);
            rimLight.position.set(7, 4, -5);
            scene.add(rimLight);

            const floor = new THREE.Mesh(
                new THREE.PlaneGeometry(100, 100),
                new THREE.MeshStandardMaterial({ color: '#172434', roughness: 0.94, metalness: 0.04 }),
            );
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -3.15;
            floor.receiveShadow = true;
            scene.add(floor);

            const heroStage = new THREE.Group();
            const plinth = new THREE.Mesh(
                new THREE.CylinderGeometry(2.05, 2.3, 0.48, 6),
                new THREE.MeshStandardMaterial({ color: '#345349', roughness: 0.64, metalness: 0.16 }),
            );
            plinth.rotation.y = POINTY_TOP_ROTATION;
            plinth.position.set(-3.1, -2.86, -0.5);
            plinth.castShadow = true;
            plinth.receiveShadow = true;
            heroStage.add(plinth);

            const inset = new THREE.Mesh(
                new THREE.CylinderGeometry(1.74, 1.74, 0.09, 6),
                new THREE.MeshStandardMaterial({ color: '#a37934', roughness: 0.42, metalness: 0.38 }),
            );
            inset.rotation.y = POINTY_TOP_ROTATION;
            inset.position.set(-3.1, -2.55, -0.5);
            inset.castShadow = true;
            heroStage.add(inset);

            const hero = createBeeChampion({ teamColor: '#c9574d', queen: true, scale: 1.72 });
            hero.position.set(-3.1, -2.48, 0.06);
            heroStage.add(hero);
            scene.add(heroStage);
            heroRef.current = hero;

            const decoration = new THREE.Group();
            for (let index = 0; index < 11; index += 1) {
                const angle = (index / 11) * Math.PI * 2;
                const radius = 7.3 + (index % 3) * 0.55;
                const hex = createHexProp(0.48 + (index % 2) * 0.14, 0.12, index % 3 === 0 ? '#9a7538' : '#263b43', Math.cos(angle) * radius, -2.8 + (index % 2) * 0.34, Math.sin(angle) * radius - 2, POINTY_TOP_ROTATION);
                decoration.add(hex);
            }
            scene.add(decoration);

            const uiGroup = new THREE.Group();
            uiGroup.position.z = -6.5;
            camera.add(uiGroup);
            sceneRef.current = scene;
            cameraRef.current = camera;
            rendererRef.current = renderer;
            uiRef.current = uiGroup;

            const raycaster = new THREE.Raycaster();
            const pointer = new THREE.Vector2();
            raycasterRef.current = raycaster;

            const parentPanel = (object) => {
                let current = object;
                while (current) {
                    if (current.userData?.action) return current;
                    current = current.parent;
                }
                return null;
            };
            const hitPanel = (event) => {
                const rect = renderer.domElement.getBoundingClientRect();
                if (!rect.width || !rect.height) return null;
                pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
                raycaster.setFromCamera(pointer, camera);
                const hits = raycaster.intersectObjects(interactiveRef.current, true);
                for (const hit of hits) {
                    const panel = parentPanel(hit.object);
                    if (panel) return panel;
                }
                return null;
            };

            pointerMove = (event) => {
                const panel = hitPanel(event);
                const next = panel?.userData?.action ? panel : null;
                renderer.domElement.style.cursor = next ? 'pointer' : 'default';
                if (hoveredPanel && hoveredPanel !== next) hoveredPanel.scale.setScalar(1);
                if (next && hoveredPanel !== next) next.scale.setScalar(1.025);
                hoveredPanel = next;
            };
            pointerDown = (event) => {
                renderer.domElement.focus({ preventScroll: true });
                const panel = hitPanel(event);
                if (!panel) return;
                event.preventDefault();
                runAction(panel.userData.action, panel.userData.payload);
            };
            keyDown = (event) => {
                if (event.key === 'Escape') {
                    if (propsRef.current.confirmAction) setConfirmAction(null);
                    else if (propsRef.current.settingsOpen) setSettingsOpen(false);
                    return;
                }
                const actions = interactiveRef.current.filter((panel) => panel.userData?.action && panel.userData.action !== 'noop');
                const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
                const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
                if ((forward || backward) && actions.length) {
                    event.preventDefault();
                    const current = focusedActionRef.current;
                    const next = current < 0
                        ? (backward ? actions.length - 1 : 0)
                        : (current + (backward ? -1 : 1) + actions.length) % actions.length;
                    const target = actions[next];
                    const payloadKey = target.userData.payload === undefined ? '' : JSON.stringify(target.userData.payload);
                    const button = [...(controlsRef.current?.querySelectorAll('button') || [])].find((candidate) => candidate.dataset.action === target.userData.action && candidate.dataset.payload === payloadKey);
                    focusSceneAction(target.userData.action, target.userData.payload, button?.textContent || target.userData.action);
                } else if (event.key === 'Enter' || event.key === ' ') {
                    const target = actions[focusedActionRef.current];
                    const panel = target ? parentPanel(target) : null;
                    if (panel) runAction(panel.userData.action, panel.userData.payload);
                }
            };
            renderer.domElement.addEventListener('pointermove', pointerMove);
            renderer.domElement.addEventListener('pointerdown', pointerDown);
            renderer.domElement.addEventListener('keydown', keyDown);

            const resize = () => {
                const rect = host.getBoundingClientRect();
                const width = Math.max(1, rect.width);
                const height = Math.max(1, rect.height);
                const aspect = width / height;
                const viewHeight = Math.max(10.8, 6.6 / aspect);
                const viewWidth = viewHeight * aspect;
                camera.left = -viewWidth / 2;
                camera.right = viewWidth / 2;
                camera.top = viewHeight / 2;
                camera.bottom = -viewHeight / 2;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height, false);
                const currentView = propsRef.current.view;
                const mobile = aspect < 0.78;
                if (heroRef.current) {
                    const showHero = ['home', 'login', 'loading'].includes(currentView);
                    const stage = heroRef.current.parent;
                    const stageScale = mobile ? 0.55 : 1;
                    const targetX = mobile ? 0 : -viewWidth * 0.3;
                    const targetBaseY = mobile
                        ? (currentView === 'home' ? -5.0 : currentView === 'login' ? -3.4 : -4.4)
                        : -2.48;
                    stage?.position.set(targetX + 3.1 * stageScale, targetBaseY + 2.48 * stageScale, -0.1);
                    stage?.scale.setScalar(stageScale);
                    stage.visible = showHero && !(mobile && currentView === 'home' && propsRef.current.settingsOpen);
                    heroRef.current.position.set(-3.1, -2.48, 0.06);
                    heroRef.current.userData.baseY = heroRef.current.position.y;
                    const heroScale = currentView === 'login' ? 1.72 : 1.45;
                    heroRef.current.scale.setScalar(heroScale);
                }
                rebuildRef.current?.(viewWidth, viewHeight, aspect);
            };
            resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(host);
            resize();

            const animate = () => {
                animationFrame = window.requestAnimationFrame(animate);
                const elapsed = clock.getElapsedTime();
                const heroModel = heroRef.current;
            if (heroModel?.visible) {
                    heroModel.position.y = heroModel.userData.baseY + Math.sin(elapsed * 1.8) * 0.045;
                    heroModel.userData.wings?.forEach((wing, index) => {
                        wing.rotation.z = (index === 0 ? -0.5 : 0.5) + Math.sin(elapsed * 14) * 0.12;
                    });
                }
                renderer.render(scene, camera);
            };
            animate();
        } catch (error) {
            console.error('Unable to initialize the Three.js app scene:', error);
            setRendererError('3D graphics are not available in this browser. Update your browser or enable WebGL to continue.');
        }

        return () => {
            if (animationFrame) window.cancelAnimationFrame(animationFrame);
            resizeObserver?.disconnect();
            if (renderer) {
                renderer.domElement.removeEventListener('pointermove', pointerMove);
                renderer.domElement.removeEventListener('pointerdown', pointerDown);
                renderer.domElement.removeEventListener('keydown', keyDown);
            }
            if (sceneRef.current) disposeGroup(sceneRef.current);
            renderer?.dispose();
            renderer?.domElement.remove();
            sceneRef.current = null;
            cameraRef.current = null;
            rendererRef.current = null;
            uiRef.current = null;
            heroRef.current = null;
            rebuildRef.current = null;
            interactiveRef.current = [];
        };
    }, []);

    useEffect(() => {
        const rebuild = (viewWidth, viewHeight, aspect) => {
            const uiGroup = uiRef.current;
            if (!uiGroup || !cameraRef.current) return;
            disposeGroup(uiGroup);
            uiGroup.clear();
            const panels = [];
            const current = propsRef.current;
            const mobile = aspect < 0.78;
            if (heroRef.current?.parent) {
                heroRef.current.parent.visible = ['home', 'login', 'loading'].includes(current.view)
                    && !(mobile && current.view === 'home' && current.settingsOpen);
            }
            const width = mobile ? Math.min(viewWidth - 0.5, 6.15) : Math.max(0, viewWidth - 0.5);
            const add = (options, x, y, z = 0) => {
                const panel = createScenePanel(options);
                panel.position.set(x, y, z);
                uiGroup.add(panel);
                if (panel.userData.interactive) panels.push(panel);
                return panel;
            };
            const headerY = viewHeight / 2 - (mobile ? 1.18 : 0.62);
            add({ width, height: 0.78, title: 'GO BEE', subtitle: dataText(current.user?.username || current.user?.name, current.view === 'login' ? 'A STRATEGY GAME FOR YOUR NEXT MOVE' : 'THE HIVE IS READY'), badge: current.user?.level || '', kind: 'panel', accent: '#d7a53f' }, 0, headerY, -0.05);

            if (current.view !== 'login' && current.view !== 'loading') {
                if (!mobile) {
                    const navWidth = Math.min(1.75, width * 0.13);
                    const totalWidth = NAV_ITEMS.length * navWidth + (NAV_ITEMS.length - 1) * 0.12;
                    const start = width / 2 - totalWidth + navWidth / 2 - 0.28;
                    NAV_ITEMS.forEach(([action, label], index) => {
                        add({ width: navWidth, height: 0.48, title: label, kind: 'button', action, accent: action === current.view ? '#e5b84f' : '#7793a0', selected: action === current.view }, start + index * (navWidth + 0.12), headerY, 0.15);
                    });
                    if (current.user) add({ width: 1.18, height: 0.48, title: 'SIGN OUT', kind: 'button', action: 'logout', accent: '#ba7562' }, start - navWidth / 2 - 0.68, headerY, 0.15);
                } else if (current.user) {
                    add({ width: 1.1, height: 0.48, title: 'EXIT', kind: 'button', action: 'logout', accent: '#ba7562' }, width / 2 - 0.68, headerY, 0.15);
                }
            }

            const bottomNavY = -viewHeight / 2 + (mobile ? 1.15 : 0.54);
            if (mobile && current.view !== 'login' && current.view !== 'loading') {
                const navWidth = Math.min(1.42, (width - 0.22) / NAV_ITEMS.length);
                const gap = 0.06;
                const total = NAV_ITEMS.length * navWidth + (NAV_ITEMS.length - 1) * gap;
                NAV_ITEMS.forEach(([action, label], index) => {
                    add({ width: navWidth, height: 0.55, title: label, kind: 'button', action, accent: action === current.view ? '#e5b84f' : '#7793a0', selected: action === current.view }, -total / 2 + navWidth / 2 + index * (navWidth + gap), bottomNavY, 0.15);
                });
            }

            if (current.view === 'loading') {
                add({ width: Math.min(width * 0.86, 7.4), height: 1.45, eyebrow: 'GO BEE', title: 'SETTING UP THE HIVE', subtitle: 'Loading your game and friends', accent: '#e5b84f' }, 0, 0, 0.1);
            } else if (current.view === 'login') {
                add({ width: Math.min(width * 0.9, mobile ? 5.9 : 7.6), height: 1.25, eyebrow: 'THE HIVE AWAITS', title: 'THINK IN HEXES', subtitle: 'Protect your queen. Make the next move count.', accent: '#e5b84f' }, mobile ? 0 : width * 0.19, mobile ? 4.1 : 1.0, 0.15);
                add({ width: Math.min(width * 0.9, mobile ? 5.9 : 5.5), height: 1.0, title: 'CONTINUE WITH GOOGLE', subtitle: 'Secure sign-in · your progress follows your account', kind: 'button', action: 'login', accent: '#d6a23d' }, mobile ? 0 : width * 0.19, mobile ? 2.5 : -0.6, 0.18);
                if (current.loginError) add({ width: Math.min(width * 0.9, 5.4), height: 0.74, title: 'SIGN-IN DID NOT COMPLETE', subtitle: current.loginError, accent: '#c9655c' }, mobile ? 0 : width * 0.19, mobile ? 1.35 : -1.65, 0.2);
                add({ width: Math.min(width - 0.3, mobile ? 5.9 : 8.0), height: 0.62, title: 'PLAY IN YOUR BROWSER  ·  INSTALL IS OPTIONAL', kind: 'panel', accent: '#56766e' }, 0, mobile ? -5.35 : -4.75, 0.1);
            } else if (current.view === 'home') {
                add({ width: Math.min(width * 0.78, mobile ? 5.6 : 8.3), height: 1.15, eyebrow: 'THE HIVE IS YOURS TO COMMAND', title: 'THINK IN HEXES. MOVE LIKE A BEE.', subtitle: 'Outmaneuver your rival and protect your queen.', accent: '#e5b84f' }, mobile ? 0 : width * 0.14, mobile ? 4.25 : 2.8, 0.12);

                const modes = [
                    { action: 'playOnline', title: 'PLAY ONLINE', subtitle: 'Find a rival or return to a match', badge: '01', accent: '#4f91ac' },
                    { action: 'playAI', title: 'AI CHALLENGE', subtitle: 'Sharpen your strategy against the hive', badge: '02', accent: '#c95d50' },
                    { action: 'playLocal', title: 'LOCAL MATCH', subtitle: 'Take both sides at one table', badge: '03', accent: '#d3a743' },
                ];
                if (mobile) {
                    modes.forEach((mode, index) => add({ width: width * 0.9, height: 1.22, ...mode, kind: 'button' }, 0, 2.15 - index * 1.5, 0.18));
                } else {
                    const cardWidth = Math.min(4.35, width * 0.29);
                    const gap = 0.2;
                    const start = -((cardWidth * modes.length + gap * (modes.length - 1)) / 2) + cardWidth / 2;
                    modes.forEach((mode, index) => add({ width: cardWidth, height: 1.42, ...mode, kind: 'button' }, start + index * (cardWidth + gap), -0.18, 0.18));
                }

                if (current.data.invitation?.id) {
                    const inviteY = mobile ? -2.8 : -2.05;
                    add({ width: Math.min(width * 0.85, 7.0), height: 0.9, title: `${current.data.invitation.name || 'A beekeeper'} CHALLENGES YOU`, subtitle: `Rating ${current.data.invitation.level ?? '—'}  ·  Accept to join the match`, accent: '#d5aa48' }, 0, inviteY, 0.2);
                    add({ width: 1.85, height: 0.55, title: 'ACCEPT MATCH', kind: 'button', action: 'acceptInvite', accent: '#4e9279' }, mobile ? 1.0 : 2.2, inviteY - 0.68, 0.22);
                    add({ width: 1.35, height: 0.55, title: 'DECLINE', kind: 'button', action: 'declineInvite', accent: '#a95d56' }, mobile ? -1.05 : 0.35, inviteY - 0.68, 0.22);
                }

                const settingsY = current.data.invitation?.id ? (mobile ? -4.7 : -3.65) : (mobile ? -3.5 : -2.15);
                add({ width: Math.min(width * 0.77, 6.6), height: 0.63, title: current.settingsOpen ? 'CLOSE ALERT SETTINGS' : 'PLAYER SETTINGS  ·  PUSH & EMAIL', kind: 'button', action: 'toggleSettings', accent: '#837b63' }, 0, settingsY, 0.18);
                if (current.settingsOpen) {
                    const startY = settingsY - 0.82;
                    const pushDisabled = ['denied', 'unsupported', 'insecure'].includes(current.data.notificationsStatus);
                    add({ width: Math.min(width * 0.77, 6.6), height: 0.72, title: `PUSH ALERTS: ${current.data.pushEnabled ? 'ON' : 'OFF'}`, subtitle: pushDisabled ? dataText(current.data.notificationsMessage, current.data.notificationsStatus) : 'Permission is per browser/device', kind: 'button', action: 'togglePush', accent: current.data.pushEnabled ? '#4d9a7b' : '#788590', disabled: pushDisabled }, 0, startY, 0.2);
                    add({ width: Math.min(width * 0.77, 6.6), height: 0.72, title: `EMAIL ALERTS: ${current.data.emailEnabled ? 'ON' : 'OFF'}`, subtitle: current.user?.email || 'No email address on this account', kind: 'button', action: 'toggleEmail', accent: current.data.emailEnabled ? '#4d9a7b' : '#788590', disabled: !current.user?.email || current.data.savingEmail }, 0, startY - 0.88, 0.2);
                    if (current.data.settingsMessage) add({ width: Math.min(width * 0.77, 6.6), height: 0.62, title: current.data.settingsMessage, accent: '#637b70' }, 0, startY - 1.69, 0.2);
                }
            } else if (current.view === 'friends') {
                add({ width: Math.min(width * 0.7, 7.3), height: 0.85, title: 'YOUR CREW', subtitle: 'Find a beekeeper, accept a request, or start a duel.', accent: '#d8ad4e' }, mobile ? 0 : -width * 0.2, viewHeight / 2 - 2.05, 0.12);
                add({ width: Math.min(width * 0.67, 6.8), height: 0.7, title: current.searchValue ? `SEARCH  ·  ${current.searchValue}` : 'SEARCH PLAYERS', subtitle: 'Tap here, then type a username', kind: 'button', action: 'focusSearch', accent: '#7395a2' }, mobile ? 0 : -width * 0.19, viewHeight / 2 - 2.95, 0.18);
                const friends = current.data.friendUsers || [];
                const requests = current.data.requestUsers || [];
                const results = current.data.filteredUsers || [];
                const columns = mobile ? [{ title: 'SEARCH RESULTS', items: results, type: 'search' }, { title: 'FRIEND REQUESTS', items: requests, type: 'request' }, { title: 'YOUR FRIENDS', items: friends, type: 'friend' }] : [
                    { title: 'SEARCH RESULTS', items: results, type: 'search' },
                    { title: 'FRIEND REQUESTS', items: requests, type: 'request' },
                    { title: 'YOUR FRIENDS', items: friends, type: 'friend' },
                ];
                const sectionWidth = mobile ? width * 0.88 : Math.min(4.55, (width - 0.9) / 3);
                const hasInvitation = Boolean(current.data.invitation?.id);
                const yStart = hasInvitation ? (mobile ? 3.95 : -1.0) : (mobile ? viewHeight / 2 - 4.15 : 0.4);
                const xCenters = mobile ? [0, 0, 0] : [-sectionWidth - 0.1, 0, sectionWidth + 0.1];
                columns.forEach((column, columnIndex) => {
                    const items = column.items || [];
                    const pageSize = mobile ? 2 : 3;
                    const offset = current.listPage * pageSize;
                    const sectionY = mobile ? yStart - columnIndex * 3.15 : yStart;
                    add({ width: sectionWidth, height: 0.55, title: column.title, trailing: items.length ? `${Math.min(offset + 1, items.length)}–${Math.min(offset + pageSize, items.length)} / ${items.length}` : '0', accent: '#b6974c' }, xCenters[columnIndex], sectionY, 0.13);
                    const visible = items.slice(offset, offset + pageSize);
                    visible.forEach((person, index) => {
                        const name = person.username || person.name || 'Beekeeper';
                        const action = column.type === 'request' ? 'acceptFriendRequest' : column.type === 'friend' ? 'sendChallenge' : person.isFriend ? 'sendChallenge' : 'sendFriendRequest';
                        const buttonText = column.type === 'request' ? 'ACCEPT' : column.type === 'friend' || person.isFriend ? 'CHALLENGE' : person.requestSent ? 'SENT' : 'ADD';
                        const disabled = Boolean(person.requestSent);
                        add({ width: sectionWidth, height: 0.76, title: name, subtitle: `Rating ${person.level ?? '—'}  ·  ${buttonText}`, kind: 'button', action, payload: column.type === 'request' ? person.id : { id: person.id, name }, accent: column.type === 'request' ? '#4c9578' : '#667f92', disabled }, xCenters[columnIndex], sectionY - 0.75 - index * 0.83, 0.17);
                    });
                    if (items.length > pageSize) {
                        add({ width: 1.25, height: 0.48, title: 'PREV', kind: 'button', action: 'previousPage', disabled: current.listPage === 0, accent: '#74848a' }, xCenters[columnIndex] - 0.72, sectionY - 2.15, 0.18);
                        add({ width: 1.25, height: 0.48, title: 'NEXT', kind: 'button', action: 'nextPage', disabled: offset + pageSize >= items.length, accent: '#74848a' }, xCenters[columnIndex] + 0.72, sectionY - 2.15, 0.18);
                    }
                });
                if (hasInvitation) {
                    const inviteY = mobile ? 5.65 : 1.65;
                    add({ width: Math.min(width * 0.86, 6.8), height: 0.55, title: `CHALLENGE FROM ${current.data.invitation.name || 'A BEEKEEPER'}`, accent: '#d7a847' }, 0, inviteY, 0.2);
                    add({ width: 1.8, height: 0.48, title: 'ACCEPT', kind: 'button', action: 'acceptInvite', accent: '#4e9279' }, mobile ? 1.0 : 1.3, inviteY - 0.62, 0.22);
                    add({ width: 1.55, height: 0.48, title: 'DECLINE', kind: 'button', action: 'declineInvite', accent: '#b45c55' }, mobile ? -1.0 : -1.3, inviteY - 0.62, 0.22);
                }
            } else if (current.view === 'active' || current.view === 'recent') {
                const isRecentView = current.view === 'recent';
                add({ width: Math.min(width * 0.72, 8.0), height: 0.82, title: isRecentView ? 'MATCH HISTORY' : 'YOUR TABLES', subtitle: isRecentView ? 'Wins, losses and the games that made you sharper.' : 'Resume a match, answer a challenge, or review a result.', accent: '#d9ac49' }, mobile ? 0 : -width * 0.17, viewHeight / 2 - 2.0, 0.12);
                const games = isRecentView ? (current.data.recentGames || []) : (current.data.activeGames || []);
                const offset = current.listPage * (mobile ? 3 : 4);
                const pageSize = mobile ? 3 : 4;
                const visibleGames = games.slice(offset, offset + pageSize);
                const rowWidth = Math.min(width * 0.84, mobile ? 6.0 : 9.8);
                const hasInvitation = Boolean(current.data.invitation?.id);
                const yStart = hasInvitation ? (mobile ? viewHeight / 2 - 4.3 : -0.1) : (mobile ? viewHeight / 2 - 3.15 : 1.1);
                if (hasInvitation) {
                    const inviteY = mobile ? viewHeight / 2 - 3.05 : 1.9;
                    add({ width: Math.min(width * 0.84, 7.0), height: 0.55, title: `CHALLENGE FROM ${current.data.invitation.name || 'A BEEKEEPER'}`, accent: '#d7a847' }, 0, inviteY, 0.2);
                    add({ width: 1.8, height: 0.48, title: 'ACCEPT', kind: 'button', action: 'acceptInvite', accent: '#4e9279' }, mobile ? 1.0 : 1.3, inviteY - 0.62, 0.22);
                    add({ width: 1.55, height: 0.48, title: 'DECLINE', kind: 'button', action: 'declineInvite', accent: '#b45c55' }, mobile ? -1.0 : -1.3, inviteY - 0.62, 0.22);
                }
                if (!visibleGames.length) {
                    const emptyY = hasInvitation && !mobile ? -0.2 : 0.7;
                    add({ width: rowWidth, height: 1.1, title: isRecentView ? 'NO FINISHED MATCHES YET' : 'NO ACTIVE MATCHES', subtitle: isRecentView ? 'Your results will appear here after a game ends.' : 'Challenge a friend to start a new table.', accent: '#697b7a' }, 0, emptyY, 0.18);
                    add({ width: 2.7, height: 0.68, title: isRecentView ? 'VIEW ACTIVE GAMES' : 'FIND FRIENDS', kind: 'button', action: isRecentView ? 'active' : 'friends', accent: '#4c9578' }, 0, emptyY - 1.15, 0.2);
                }
                visibleGames.forEach((game, index) => {
                    const isWin = game.Player1 === current.user?.id ? game.Winner === 'Red' : game.Winner === 'Blue';
                    const result = isRecentView ? (isWin ? 'VICTORY' : 'DEFEAT') : (((game.Player1 === current.user?.id && game.Turn === 1) || (game.Player2 === current.user?.id && game.Turn === 2)) ? 'YOUR TURN' : 'WAITING');
                    const detail = isRecentView ? `${game.WinType || 'Match complete'}  ·  ${Number(isWin ? game.WinnerChange : game.LoserChange) || 0} rating` : `Turn ${game.Turn || 1}  ·  ${result}`;
                    const action = isRecentView ? 'openGame' : 'resumeGame';
                    const title = `${gameOpponent(game, current.user?.id) || 'Opponent'}  ·  ${result}`;
                    add({ width: rowWidth, height: 0.92, title, subtitle: detail, kind: 'button', action, payload: game.id, accent: isRecentView ? (isWin ? '#4c9578' : '#bd6257') : '#4d91a8', trailing: isRecentView ? (isWin ? '+' : '−') : '›' }, 0, yStart - index * 1.05, 0.18);
                });
                if (games.length > pageSize) {
                    add({ width: 1.55, height: 0.55, title: 'PREVIOUS', kind: 'button', action: 'previousPage', disabled: current.listPage === 0, accent: '#74848a' }, -1.0, mobile ? -viewHeight / 2 + 1.45 : -3.85, 0.18);
                    add({ width: 1.55, height: 0.55, title: 'NEXT', kind: 'button', action: 'nextPage', disabled: offset + pageSize >= games.length, accent: '#74848a' }, 1.0, mobile ? -viewHeight / 2 + 1.45 : -3.85, 0.18);
                }
            } else if (current.view === 'accept') {
                const invitation = current.data.invitation;
                add({ width: Math.min(width * 0.86, 7.5), height: 1.05, eyebrow: 'NEW CHALLENGE', title: `${invitation?.name || 'A fellow beekeeper'} IS WAITING`, subtitle: `Rating ${invitation?.level ?? '—'}  ·  Ready to play?`, accent: '#d7a847' }, 0, 1.2, 0.18);
                add({ width: 2.6, height: 0.82, title: 'ACCEPT MATCH', kind: 'button', action: 'acceptInvite', accent: '#4e9279' }, -1.45, -0.35, 0.22);
                add({ width: 2.6, height: 0.82, title: 'DECLINE', kind: 'button', action: 'declineInvite', accent: '#b45c55' }, 1.45, -0.35, 0.22);
            } else if (current.view === 'waiting') {
                add({ width: Math.min(width * 0.86, 7.6), height: 1.2, eyebrow: 'ONLINE TABLE', title: 'WAITING FOR YOUR RIVAL', subtitle: `The invitation has been sent to ${current.data.opponent || 'your opponent'}.`, accent: '#d7a847' }, 0, 1.1, 0.18);
                add({ width: 2.9, height: 0.8, title: 'RETURN TO GAMES', kind: 'button', action: 'active', accent: '#4e9279' }, 0, -0.4, 0.22);
            }

            if (current.confirmAction) {
                add({ width: Math.min(width * 0.82, 5.8), height: 1.0, title: 'SIGN OUT OF GO BEE?', subtitle: 'Your saved games will be here when you return.', accent: '#bd655a' }, 0, 0.8, 0.55);
                add({ width: 2.1, height: 0.7, title: 'SIGN OUT', kind: 'button', action: 'confirmAction', accent: '#bd655a' }, -1.15, -0.55, 0.58);
                add({ width: 2.1, height: 0.7, title: 'KEEP PLAYING', kind: 'button', action: 'cancelConfirm', accent: '#4d8c77' }, 1.15, -0.55, 0.58);
            }

            interactiveRef.current = panels;
            focusedActionRef.current = Math.min(focusedActionRef.current, Math.max(0, panels.length - 1));
        };
        rebuildRef.current = rebuild;
        const rect = hostRef.current?.getBoundingClientRect();
        if (rect?.width && rect?.height) rebuild(rect.width, rect.height, rect.width / rect.height);
    });

    useEffect(() => {
        if (searchValue && inputRef.current && document.activeElement !== inputRef.current) {
            // Keep the rendered label synchronized without stealing focus from other controls.
        }
    }, [searchValue]);

    const accessibleActions = (() => {
        if (view === 'login') return [{ action: 'login', label: 'Continue with Google' }];
        if (view === 'loading') return [];

        const actionsForPage = NAV_ITEMS.map(([action, label]) => ({ action, label }));
        if (view === 'home') {
            actionsForPage.push(
                { action: 'playOnline', label: 'Play online' },
                { action: 'playAI', label: 'AI challenge' },
                { action: 'playLocal', label: 'Local match' },
                { action: 'toggleSettings', label: 'Player notification settings' },
                { action: 'togglePush', label: `Push notifications ${data.pushEnabled ? 'on' : 'off'}` },
                { action: 'toggleEmail', label: `Email notifications ${data.emailEnabled ? 'on' : 'off'}` },
            );
        } else if (view === 'friends') {
            actionsForPage.push({ action: 'focusSearch', label: 'Search players' });
            (data.filteredUsers || []).forEach((person) => actionsForPage.push({ action: person.isFriend ? 'sendChallenge' : 'sendFriendRequest', payload: { id: person.id, name: person.username || person.name }, label: `${person.isFriend ? 'Challenge' : 'Add'} ${person.username || person.name || 'player'}` }));
            (data.requestUsers || []).forEach((person) => actionsForPage.push({ action: 'acceptFriendRequest', payload: person.id, label: `Accept friend request from ${person.username || person.name || 'player'}` }));
            (data.friendUsers || []).forEach((person) => actionsForPage.push({ action: 'sendChallenge', payload: { id: person.id, name: person.username || person.name }, label: `Challenge ${person.username || person.name || 'friend'}` }));
            const pageSize = window.innerWidth / Math.max(1, window.innerHeight) < 0.78 ? 2 : 3;
            const lengths = [data.filteredUsers, data.requestUsers, data.friendUsers].map((items) => items?.length || 0);
            if (Math.max(...lengths) > pageSize) {
                if (listPage > 0) actionsForPage.push({ action: 'previousPage', label: 'Previous friend results' });
                if (lengths.some((length) => length > (listPage + 1) * pageSize)) actionsForPage.push({ action: 'nextPage', label: 'Next friend results' });
            }
        } else if (view === 'active' || view === 'recent') {
            const games = view === 'recent' ? (data.recentGames || []) : (data.activeGames || []);
            const pageSize = window.innerWidth / Math.max(1, window.innerHeight) < 0.78 ? 3 : 4;
            games.forEach((game) => actionsForPage.push({ action: view === 'recent' ? 'openGame' : 'resumeGame', payload: game.id, label: `${view === 'recent' ? 'Review' : 'Resume'} match against ${gameOpponent(game, user?.id) || 'opponent'}` }));
            if (games.length > pageSize) {
                if (listPage > 0) actionsForPage.push({ action: 'previousPage', label: 'Previous matches' });
                if (games.length > (listPage + 1) * pageSize) actionsForPage.push({ action: 'nextPage', label: 'Next matches' });
            }
        } else if (view === 'accept') {
            actionsForPage.push({ action: 'acceptInvite', label: 'Accept match invitation' }, { action: 'declineInvite', label: 'Decline match invitation' });
        } else if (view === 'waiting') {
            actionsForPage.push({ action: 'active', label: 'Return to games' });
        }

        if (data.invitation?.id && view !== 'accept') {
            actionsForPage.push({ action: 'acceptInvite', label: `Accept challenge from ${data.invitation.name || 'opponent'}` }, { action: 'declineInvite', label: 'Decline challenge' });
        }
        if (confirmAction) actionsForPage.push({ action: 'confirmAction', label: 'Confirm sign out' }, { action: 'cancelConfirm', label: 'Cancel sign out' });
        if (user && actions.logout) actionsForPage.push({ action: 'logout', label: 'Sign out' });
        return actionsForPage;
    })();

    return (
        <div className="three-app-shell">
            <div ref={hostRef} className="three-app-host" aria-hidden="false">
                {rendererError && <p className="three-app-error" role="alert">{rendererError}</p>}
            </div>
            {view === 'friends' && <input
                ref={inputRef}
                className="three-a11y-input"
                type="text"
                aria-label="Search players by username"
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value)}
            />}
            <nav ref={controlsRef} className="three-a11y-controls" aria-label="Go Bee actions" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) clearSceneActionFocus(); }}>
                <span ref={statusRef} className="three-a11y-status" aria-live="polite">{view === 'home' ? 'Go Bee lobby' : view === 'friends' ? 'Friends' : view === 'active' ? 'Active games' : view === 'recent' ? 'Recent games' : view}</span>
                {accessibleActions.map(({ action, payload, label }) => <button key={`${action}-${label}`} type="button" data-action={action} data-payload={payload === undefined ? '' : JSON.stringify(payload)} onFocus={() => focusSceneAction(action, payload, label)} onClick={() => runAction(action, payload)}>{label}</button>)}
            </nav>
        </div>
    );
}
