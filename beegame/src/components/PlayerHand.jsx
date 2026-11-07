import React from 'react';
import Card from './Card';

const PlayerHand = ({ cards, selectedCardIndex, onSelectCard, opponent, top, extraCard, turn }) => {

    return (
        <div className={`player-hand${top ? " top" : ""}`}>
            {((top && turn == 1) || (!top && turn == 2)) && <>
                <div className="bracket-label" style={{ gridColumn: "span 1" }}>On Deck</div>
                <div className="bracket-label" style={{ gridColumn: "span 2" }}>Cards</div>
                <div className="bracket" style={{ gridColumn: "span 1"}}> </div>
                <div className="bracket" style={{ gridColumn: "span 2" }}></div>
            </>}
            
            {((top && turn == 1) || (!top && turn == 2)) ? <Card
                key={extraCard?.name}
                card={extraCard}
                ignore={true}
            /> : <></>}
            {cards.map((card) => (
                <Card
                    key={card?.name}
                    card={card}
                    onSelect={opponent ? undefined : () => onSelectCard(card)}
                    isSelected={!opponent && selectedCardIndex?.name === card?.name}
                />
            ))}

            
        </div>
    );
};

export default PlayerHand;
