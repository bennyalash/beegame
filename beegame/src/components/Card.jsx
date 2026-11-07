import React from 'react';
import { BOARD_COORDS } from '../game/hexGrid.js';

const Card = ({ card, onSelect, isSelected, ignore = false }) => {
    const tileSize = 25; // smaller hexes for cards


    return (
        <div
            className={`card ${isSelected ? 'selected' : ''} ${ignore ? 'ignore' : ''}`}
            onClick={onSelect}
        >
            {BOARD_COORDS.map(([q, r]) => {
                const isCenter = (q === 0 && r === 0);

                const isMove = card?.moves.some(move => move.x === q && move.y === r);

                const radius = tileSize / 2;
                const x = Math.sqrt(3) * radius * (q + r / 2);
                const y = 1.5 * radius * r;

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
