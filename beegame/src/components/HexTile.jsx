import React from 'react';

const HexTile = ({ q, r, children, piece, onSelectPiece, isSelected, move, onMove, turn, highlight, online, p }) => {
    const hexWidth = 79; // width of each hex
    const hexHeight = Math.sqrt(3) / 2 * hexWidth; // perfect hexagon proportions

    const xSpacing = hexWidth * 0.75;
    const ySpacing = hexHeight;

    const x = q * xSpacing*.99;
    const y = (r + q / 2) * ySpacing;

    const start = q == 0 && r * r == 4;
    const player = r > 0 ? 1 : 2; 

    return (
        <div
            onClick={move ? () => onMove([q, r]) : () => onSelectPiece(piece)}
            className={`hex-tile${piece?.player == turn && (!online || turn == p) && (online || turn == 1) ? " active-player" : ""}${isSelected && piece ? " selected" : ""}${move ? " move" : ""}${start ? " start start-" + player : ""}${highlight ? " highlight" : ""}`}
            style={{
                transform: `translate(${x}px, ${y}px)`
            }}
        >
{/*            {q}, {r }
*/}            {children}
        </div>
    );
};

export default HexTile;
