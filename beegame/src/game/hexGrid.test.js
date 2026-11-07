import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { axialToWorld, BOARD_COORDS, getLegalMoveDestinations, POINTY_TOP_ROTATION } from './hexGrid.js';
import { getMoveCardHexStates } from '../three/ui/scenePanel.js';

test('axial coordinates map to pointy-top hex spacing in the X/Z plane', () => {
    const radius = 2;
    assert.deepEqual(axialToWorld(0, 0, radius), { x: 0, z: 0 });
    assert.deepEqual(axialToWorld(1, 0, radius), {
        x: 2 * Math.sqrt(3),
        z: 0,
    });
    assert.deepEqual(axialToWorld(0, 1, radius), {
        x: Math.sqrt(3),
        z: 3,
    });
});

test('hex mesh rotation puts a vertex at the pointy top of the board', () => {
    const geometry = new THREE.CylinderGeometry(1, 1, 1, 6);
    const rotation = new THREE.Matrix4().makeRotationY(POINTY_TOP_ROTATION);
    const vertices = geometry.getAttribute('position');
    let hasNorthVertex = false;

    for (let index = 0; index < vertices.count; index += 1) {
        const vertex = new THREE.Vector3().fromBufferAttribute(vertices, index);
        if (Math.abs(vertex.y - 0.5) > 1e-6) continue;
        vertex.applyMatrix4(rotation);
        if (Math.abs(vertex.x) < 1e-6 && Math.abs(vertex.z - 1) < 1e-6) {
            hasNorthVertex = true;
            break;
        }
    }

    geometry.dispose();
    assert.equal(hasNorthVertex, true);
});

test('move card hex map fades unused cells and highlights the origin and legal vectors', () => {
    const hexes = getMoveCardHexStates([{ x: 1, y: -1 }, { x: 0, y: 2 }]);
    assert.equal(hexes.length, 19);
    assert.deepEqual(hexes.map(({ q, r }) => `${q},${r}`), BOARD_COORDS.map(([q, r]) => `${q},${r}`));
    assert.equal(hexes.find(({ q, r }) => q === 0 && r === 0)?.state, 'origin');
    assert.equal(hexes.find(({ q, r }) => q === 1 && r === -1)?.state, 'move');
    assert.equal(hexes.find(({ q, r }) => q === 0 && r === 2)?.state, 'move');
    assert.equal(hexes.filter(({ state }) => state === 'faded').length, 16);
});

test('card vectors rotate 180 degrees for player one and remain unchanged for player two', () => {
    const piece = { id: 'p1', player: 1, position: { x: 0, y: 0 } };
    const card = { moves: [{ x: 1, y: -1 }] };
    assert.deepEqual(getLegalMoveDestinations({ card, piece, turn: 1 }), [[-1, 1]]);
    assert.deepEqual(getLegalMoveDestinations({ card, piece, turn: 2 }), [[1, -1]]);
});

test('destinations are limited to board cells and cannot be occupied by a friendly piece', () => {
    const piece = { id: 'active', player: 1, position: { x: 0, y: 0 } };
    const card = { moves: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 2, y: 0 }] };
    const pieces = [
        piece,
        { id: 'friend', player: 1, position: { x: -1, y: 0 } },
        { id: 'enemy', player: 2, position: { x: 0, y: -1 } },
    ];
    const moves = getLegalMoveDestinations({ card, piece, pieces, turn: 1 });
    assert.deepEqual(moves, [[0, -1], [-2, 0]]);
    assert(moves.every(([q, r]) => BOARD_COORDS.some(([bq, br]) => bq === q && br === r)));
});

test('missing card or selected piece produces no destinations', () => {
    assert.deepEqual(getLegalMoveDestinations({ card: null, turn: 1 }), []);
    assert.deepEqual(getLegalMoveDestinations({ card: { moves: [{ x: 1, y: 0 }] }, turn: 1 }), []);
});
