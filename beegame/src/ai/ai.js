const findPieceAt = (pieces, [x, y]) =>
    pieces.find(p => p.position.x === x && p.position.y === y) || null;

const isFriendlyAt = (pieces, [x, y], player) =>
    pieces.some(p => p.position.x === x && p.position.y === y && p.player === player);

const coords = [
    [0, 0],
    [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1],
    [2, -2], [2, -1], [1, 1], [0, 2], [-1, 2],
    [-2, 2], [-2, 1], [-1, -1], [0, -2], [1, -2], [-2, 0], [2, 0]
];

const getMovesForPiece = (piece, hand, pieces) => {
    let moves = [];

    hand.forEach(card => {
        card.moves.forEach(move => {
            let dx = move.x;
            let dy = move.y;

            // Mirror moves for player 2
            if (piece.player === 1) dy = -dy;
            if (piece.player === 1) dx = -dx;

            const toCoord = [piece.position.x + dx, piece.position.y + dy];

            const tileExists = coords.some(c => c[0] === toCoord[0] && c[1] === toCoord[1]);
            const occupiedByFriend = isFriendlyAt(pieces, toCoord, piece.player);

            if (tileExists && !occupiedByFriend) {
                moves.push({ card, to: toCoord });
            }
        });
    });

    return moves;
};

const getAllValidMoves = (player, hand, pieces) => {
    const playerPieces = pieces.filter(p => p.player === player);
    let moves = [];
    playerPieces.forEach(piece => {
        getMovesForPiece(piece, hand, pieces).forEach(m => {
            moves.push({
                piece,
                card: m.card,
                from: [piece.position.x, piece.position.y],
                to: m.to
            });
        });
    });
    return moves;
};
// --- Configurable Weights ---
const WEIGHTS = {
    pawnVal: 1000,
    queenVal: 10000000,
    queenThreaten: 50,
    pawnThreaten: 10,
    mobility: 1,
    queenReachGoal: 100
};

// --- Helpers ---
const evaluateMoveHeuristic = (pieces, move, currentPlayer) => {
    const targetPiece = pieces.find(
        p => p.position.x === move.to[0] && p.position.y === move.to[1]
    );
    if (!targetPiece) return 0;

    let score = 0;
    if (targetPiece.type === "queen") score += 1000000;
    if (targetPiece.type === "pawn") score += 1000;

    return score;
};

const clonePieces = (pieces) =>
    pieces.map(p => ({ type: p.type, player: p.player, position: { ...p.position } }));

const getQueen = (pieces, player) => pieces.find(p => p.player === player && p.type === "queen");

const getReachableSquares = (piece, hand) => {
    const squares = [];
    for (const card of hand) {
        for (const move of card.moves) {
            const dx = piece.player === 2 ? move.x : -move.x;
            const dy = piece.player === 2 ? move.y : -move.y;
            squares.push([piece.position.x + dx, piece.position.y + dy]);
        }
    }
    return squares;
};

// --- Apply move safely ---
const applyMove = (pieces, move, playerHand, middleCard) => {
    let newPieces = clonePieces(pieces);
    const idx = newPieces.findIndex(
        p => p.position.x === move.from[0] && p.position.y === move.from[1]
    );
    if (idx === -1) return { pieces: newPieces, playerHand, middleCard };

    const movingPlayer = newPieces[idx].player;
    newPieces[idx].position = { x: move.to[0], y: move.to[1] };

    // Remove captured opponent
    newPieces = newPieces.filter(
        (p, i) => i === idx || !(p.position.x === move.to[0] && p.position.y === move.to[1] && p.player !== movingPlayer)
    );

    // Swap card with middle
    const newHand = playerHand.map(c => (c.name === move.card.name ? middleCard : c));
    const newMiddle = move.card;

    return { pieces: newPieces, playerHand: newHand, middleCard: newMiddle };
};



const evaluateQueenPath = (queen, goal) => {

    const coords = [
        [0, 0, 3, 2, 1],
        [0, 6, 4, 2, 1],
        [10000000, 7, 5, 2, 0],
        [6, 4, 2, 1, 0],
        [3, 2, 1, 0, 0]
    ];

    if (queen.player == 1) {
        return coords[queen.position.x * -1 + 2][queen.position.y * -1 + 2] * 100;
    }

    return coords[queen.position.x + 2][queen.position.y + 2] * 100;
}




// --- Evaluation function ---
const evaluateBoard = (pieces, aiHand, playerHand, middleCard, debug = false) => {
    let score = 0;

    const breakdown = {
        material: 0,
        threats: 0,
        queenPath: 0,
        queenPathAI: 0,
        mobility: 0
    };

    const aiStart = { x: 0, y: 2 };
    const playerStart = { x: 0, y: -2 };

    const aiQueen = getQueen(pieces, 2);
    const playerQueen = getQueen(pieces, 1);
    const oppWorkers = pieces.filter(p => p.player === 1 && p.type === "pawn");
    const aiWorkers = pieces.filter(p => p.player === 2 && p.type === "pawn");

    for (const p of pieces) {
        const multiplier = p.player === 2 ? 1 : -1;
        if (p.type === "pawn") {
            const val = multiplier * WEIGHTS.pawnVal;
            score += val;
            breakdown.material += val;
        }
        if (p.type === "queen") {
            const val = multiplier * WEIGHTS.queenVal;
            score += val;
            breakdown.material += val;
        }
    }

    // Threats
    for (const opp of pieces.filter(p => p.player === 1)) {
        const threats = getReachableSquares(opp, playerHand);
        if (aiQueen && threats.some(([x, y]) => x === aiQueen.position.x && y === aiQueen.position.y)) {
            score -= WEIGHTS.queenVal;
            breakdown.threats -= WEIGHTS.queenVal;
        }
        for (const w of aiWorkers) {
            if (threats.some(([x, y]) => x === w.position.x && y === w.position.y)) {
                score -= WEIGHTS.pawnThreaten;
                breakdown.threats -= WEIGHTS.pawnThreaten;
            }
        }
    }

    // Queen path evaluation
    if (aiQueen) {
        const val = evaluateQueenPath(aiQueen, playerStart);
        score += val;
        breakdown.queenPathAI += val;
    }

    if (playerQueen) {
        const val = evaluateQueenPath(playerQueen, aiStart);
        score -= val;
        breakdown.queenPath -= val;
    }

    // Mobility
    const myMoves = getAllValidMoves(2, aiHand, pieces).length;
    const oppMoves = getAllValidMoves(1, playerHand, pieces).length;
    const mobilityScore = WEIGHTS.mobility * (myMoves - oppMoves);
    score += mobilityScore;
    breakdown.mobility += mobilityScore;

    return { score, breakdown };
};

// --- Minimax with alpha-beta pruning ---
const minimax = (pieces, aiHand, playerHand, middleCard, depth, isMaximizing, alpha = -Infinity, beta = Infinity) => {
    const currentPlayer = isMaximizing ? 2 : 1;
    const hand = isMaximizing ? aiHand : playerHand;

    let validMoves = getAllValidMoves(currentPlayer, hand, pieces);

    // New: sort moves before recursion
    validMoves.sort((a, b) =>
        evaluateMoveHeuristic(pieces, b, currentPlayer) - evaluateMoveHeuristic(pieces, a, currentPlayer)
    );
    if (depth === 0 || validMoves.length === 0) {
        const { score, breakdown } = evaluateBoard(pieces, aiHand, playerHand, middleCard);
        return { score: score, move: null, breakdown: breakdown };
    }

    let bestMove = null;
    let breakdown = null;

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of validMoves) {
            const { pieces: newPieces, playerHand: newAIHand, middleCard: newMiddleCard } = applyMove(pieces, move, aiHand, middleCard);
            const result = minimax(newPieces, newAIHand, playerHand, newMiddleCard, depth - 1, false, alpha, beta);
            if (result.score > maxEval) {
                maxEval = result.score;
                bestMove = move;
                breakdown = result.breakdown;
            }
            alpha = Math.max(alpha, maxEval);
            if (beta <= alpha) break;
        }
        return { score: maxEval, move: bestMove, breakdown: breakdown };
    } else {
        let minEval = Infinity;
        for (const move of validMoves) {
            const { pieces: newPieces, playerHand: newPlayerHand, middleCard: newMiddleCard } = applyMove(pieces, move, playerHand, middleCard);
            const result = minimax(newPieces, aiHand, newPlayerHand, newMiddleCard, depth - 1, true, alpha, beta);
            if (result.score < minEval) {
                minEval = result.score;
                bestMove = move;
                breakdown = result.breakdown;
            }
            beta = Math.min(beta, minEval);
            if (beta <= alpha) break;
        }
        return { score: minEval, move: bestMove, breakdown: breakdown };
    }
};

// --- Get AI move ---
export const getBestAIMove = (pieces, aiHand, middleCard, playerHand, depth = 1) => {
    const { move, breakdown } = minimax(pieces, aiHand, playerHand, middleCard, depth, true);
    return move || getAllValidMoves(2, aiHand, pieces)[0] || null;
};
