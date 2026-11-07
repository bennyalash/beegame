export const BOARD_COORDS = Object.freeze([
    [0, 0],
    [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1],
    [2, -2], [2, -1], [1, 1], [0, 2], [-1, 2],
    [-2, 2], [-2, 1], [-1, -1], [0, -2], [1, -2], [-2, 0], [2, 0],
]);

export const POINTY_TOP_ROTATION = 0;

/** Convert pointy-top axial coordinates to an X/Z plane. */
export function axialToWorld(q, r, radius = 0.72) {
    return {
        x: Math.sqrt(3) * radius * (q + r / 2),
        z: 1.5 * radius * r,
    };
}

/**
 * Resolve card vectors using Go Bee's existing side convention:
 * turn 1 applies a 180-degree vector flip; turn 2 uses the card as printed.
 */
export function getLegalMoveDestinations({ coords = BOARD_COORDS, card, piece, pieces = [], turn }) {
    if (!card?.moves?.length || !piece?.position || !turn) return [];
    const multiplier = turn === 1 ? -1 : 1;
    const board = new Set(coords.map(([q, r]) => `${q},${r}`));
    const occupiedByFriend = new Set(
        pieces
            .filter((candidate) => candidate.id !== piece.id && candidate.player === turn)
            .map((candidate) => `${candidate.position.x},${candidate.position.y}`),
    );

    return card.moves
        .map(({ x, y }) => [piece.position.x + x * multiplier, piece.position.y + y * multiplier])
        .filter(([q, r]) => board.has(`${q},${r}`) && !occupiedByFriend.has(`${q},${r}`));
}

export function axialKey(q, r) {
    return `${q},${r}`;
}
