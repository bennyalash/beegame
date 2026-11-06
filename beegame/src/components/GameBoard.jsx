import React from 'react';
import HexTile from './HexTile';
import Piece from './Piece';
import { getLegalMoveDestinations } from '../game/hexGrid.js';



const GameBoard = ({ p, online, lms, lme, previewPosition, card, piece, onSelectPiece, selectedPiece, coords, pieces, onMove, turn }) => {

    const absoluteMoves = previewPosition
        ? []
        : getLegalMoveDestinations({ coords, card, piece, pieces, turn });

    let updatedPieces = pieces;

    // Check if there's a piece to move and a preview position
    if (piece && previewPosition) {
        const targetId = piece.id;

        // Step 1: Remove any piece at the preview position (e.g., capture)
        updatedPieces = pieces.filter(p => {
            const samePosition = p.position.x === previewPosition[0] && p.position.y === previewPosition[1];
            const isSamePiece = p.id === targetId;
            return !samePosition || isSamePiece;
        });

        // Step 2: Move the current piece to the preview position
        updatedPieces = updatedPieces.map(p =>
            p.id === targetId
                ? {
                    ...p,
                    position: {
                        x: previewPosition[0],
                        y: previewPosition[1]
                    }
                }
                : p
        );
    }

    
    return (
        <div className="board">
            {coords.map((coord) => {

                const highlight = piece != 0 && piece?.position.x === coord[0] && piece?.position.y === coord[1];

                const temppiece = updatedPieces.find(p =>
                    p.position.x === coord[0] &&
                    p.position.y === coord[1]
                );

                const exists = absoluteMoves.some(
                    ([q, r]) => q === coord[0] && r === coord[1]
                );

                const lastMove = lms && lms[0] == coord[0] && lms[1] == coord[1];
                const lastMove2 = lme && lme[0] == coord[0] && lme[1] == coord[1];

                return (
                    <HexTile key={coord.join(',')} p={p} online={online} highlight={highlight || lastMove || lastMove2} q={coord[0]} r={coord[1]} piece={temppiece} turn={turn} move={exists && (!temppiece || temppiece.player != turn)} isSelected={selectedPiece?.id == temppiece?.id} onSelectPiece={onSelectPiece} onMove={onMove }>
                        {temppiece && <Piece piece={temppiece} />}
                    </HexTile>
                );
            })}
        </div>
    );
};

export default GameBoard;
