import test from 'node:test';
import assert from 'node:assert/strict';
import { axialToWorld, BOARD_COORDS, getLegalMoveDestinations } from './hexGrid.js';

test('axial coordinates map to flat-top hex spacing in the X/Z plane', () => {
    const radius = 2;
    assert.deepEqual(axialToWorld(0, 0, radius), { x: 0, z: 0 });
    assert.deepEqual(axialToWorld(1, 0, radius), {
        x: 3,
        z: Math.sqrt(3),
    });
    assert.deepEqual(axialToWorld(0, 1, radius), { x: 0, z: 2 * Math.sqrt(3) });
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
