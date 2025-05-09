import React from 'react';

const Piece = ({ piece }) => {
    var color = piece.player == 1 ? "red" : "blue";
    return (
        <div
            className={`piece player${piece.player} ${piece.type}`}
            
        >

            {piece.type === 'queen' ? <img src={`/icons/bees/queen_${color}.png`} alt={`${color} Queen`} title={`${color} Queen`} /> : <img src={`/icons/bees/bee_${color}.png`} alt={`${color} Bee`} title={`${color} Bee`} />}
        </div>
    );
};

export default Piece;
