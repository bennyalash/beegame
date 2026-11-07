import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildGameHud } from '../three/ui/gameHud.js';

function makeCanvas() {
    const context = {
        clearRect() {},
        createLinearGradient() { return { addColorStop() {} }; },
        beginPath() {},
        moveTo() {},
        lineTo() {},
        arcTo() {},
        arc() {},
        closePath() {},
        fill() {},
        stroke() {},
        fillText() {},
        measureText(text) { return { width: String(text).length * 8 }; },
    };
    return {
        width: 0,
        height: 0,
        getContext(type) {
            assert.equal(type, '2d');
            return context;
        },
    };
}

function targetActions(targets) {
    return targets.map((target) => target.userData.action).filter(Boolean);
}

test('Three.js HUD provides raycastable card and state-dependent match controls', () => {
    const previousDocument = globalThis.document;
    globalThis.document = { createElement: (name) => {
        assert.equal(name, 'canvas');
        return makeCanvas();
    } };

    try {
        const group = new THREE.Group();
        const base = {
            mode: 'local',
            turn: 1,
            cards1: [{ name: 'HOP', moves: [{ x: 1, y: 0 }] }],
            cards2: [{ name: 'SKIP', moves: [{ x: 0, y: 1 }] }],
        };
        const activeTargets = buildGameHud(group, base, 1.6, 9.6);
        const card = activeTargets.find((target) => target.userData.action === 'selectCard');
        assert(card, 'active turn should expose a selectable move card');

        group.updateMatrixWorld(true);
        const ray = new THREE.Raycaster();
        ray.set(card.position.clone().add(new THREE.Vector3(0, 0, 5)), new THREE.Vector3(0, 0, -1));
        const hit = ray.intersectObject(card, true).find((entry) => entry.object.userData.action === 'selectCard');
        assert(hit, 'the visible move-card face should receive a Three.js raycast');
        assert.equal(hit.object.userData.payload.name, 'HOP');

        const confirmTargets = buildGameHud(group, { ...base, isConfirming: true }, 1.6, 9.6);
        assert(targetActions(confirmTargets).includes('cancelMove'));
        assert(targetActions(confirmTargets).includes('confirmMove'));

        const menuTargets = buildGameHud(group, { ...base, menuOpen: true }, 1.6, 9.6);
        assert(targetActions(menuTargets).includes('resume'));
        assert(targetActions(menuTargets).includes('requestLeave'));
    } finally {
        if (previousDocument === undefined) delete globalThis.document;
        else globalThis.document = previousDocument;
    }
});
