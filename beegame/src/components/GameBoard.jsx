import React from 'react';
import HexTile from './HexTile';
import Piece from './Piece';
import Card from './Card';



const GameBoard = ({ previewPosition, card, piece, onSelectPiece, selectedPiece, coords, pieces, onMove, turn, extraCard }) => {


    var absoluteMoves = [];
    if (card && piece && !previewPosition) {
        absoluteMoves = card?.moves?.map(([dq, dr]) => {
            const [q, r] = piece.position;
            const turnMultiplier = turn == 1 ? -1 : 1;
            return [q + dq * turnMultiplier, r + dr * turnMultiplier];
        });
    }

    let updatedPieces = pieces;

    // Check if there's a piece to move and a preview position
    if (piece && previewPosition) {
        const targetId = piece.id;

        // Step 1: Remove any piece at the preview position (e.g., capture)
        updatedPieces = pieces.filter(p => {
            const samePosition = p.position[0] === previewPosition[0] && p.position[1] === previewPosition[1];
            const isSamePiece = p.id === targetId;
            return !samePosition || isSamePiece;
        });

        // Step 2: Move the current piece to the preview position
        updatedPieces = updatedPieces.map(p =>
            p.id === targetId
                ? { ...p, position: previewPosition }
                : p
        );
    }

    return (
        <div className="board">
            {coords.map((coord) => {

                
                
                piece = updatedPieces.find(p =>
                    p.position[0] === coord[0] &&
                    p.position[1] === coord[1]
                );

                const exists = absoluteMoves.some(
                    ([q, r]) => q === coord[0] && r === coord[1]
                );

                return (
                    <HexTile key={coord.join(',')} q={coord[0]} r={coord[1]} piece={piece} turn={turn} move={exists && (!piece || piece.player != turn)} isSelected={selectedPiece?.id == piece?.id} onSelectPiece={onSelectPiece} onMove={onMove }>
                        {piece && <Piece piece={piece} />}
                    </HexTile>
                );
            })}
            {/*<div className={`extraCard active-${turn}`} >
                <Card
                    key={extraCard?.name}
                    card={extraCard}
                    ignore={true}

                />
            </div>*/}
        </div>
    );
};

export default GameBoard;
