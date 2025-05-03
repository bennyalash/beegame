import React from 'react';

const hexCoords = [
    [0, 0],
    [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1],
    [2, -2], [2, -1], [1, 1], [0, 2], [-1, 2],
    [-2, 2], [-2, 1], [-1, -1], [0, -2], [1, -2], [-2, 0], [2, 0]
];

const Card = ({ card, onSelect, isSelected, ignore = false }) => {
    const tileSize = 25; // smaller hexes for cards


    return (
        <div
            className={`card ${isSelected ? 'selected' : ''} ${ignore ? 'ignore' : ''}`}
            onClick={onSelect}
        >
            {hexCoords.map(([q, r]) => {
                const isCenter = (q === 0 && r === 0);

                const isMove = card?.moves.some(move => move.x === q && move.y === r);

                const xSpacing = tileSize * 0.75;
                const ySpacing = (Math.sqrt(3) / 2 * tileSize);

                const x = q * xSpacing;
                const y = (r + q / 2) * ySpacing;

                return (
                    <div
                        key={`${q},${r}`}
                        className={`card-hex ${isCenter ? 'center' : ''} ${isMove ? 'move' : ''}`}
                        style={{ transform: `translate(${x}px, ${y}px)` }}
                    />
                );
            })}
        </div>
    );
};

export default Card;
