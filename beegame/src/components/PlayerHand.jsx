import React from 'react';
import Card from './Card';

const PlayerHand = ({ cards, selectedCardIndex, onSelectCard, opponent, top, extraCard, turn }) => {

    if (top) {
        console.log(top && turn == 1);
    }
    
    return (
        <div className="player-hand">
            <div style={{ gridColumn: "span 2" }}>
            Your Cards
            </div>
            <div style={{ gridColumn: "span 1" }}>
                On Deck
            </div>
            <div style={{ gridColumn: "span 2", height: "4px", border: "2px solid black", borderBottom: 0 }}>
            
            </div>
            <div style={{ gridColumn: "span 1", height: "4px", border: "2px solid black", borderBottom: 0 }}>
                
            </div>
            {cards.map((card, index) => (
                <Card
                    key={card?.name}
                    card={card}
                    onSelect={opponent ? undefined : () => onSelectCard(card)}
                    isSelected={!opponent && selectedCardIndex?.name === card?.name}
                />
            ))}

            {((top && turn == 1) || (!top && turn == 2)) && <Card
                key={extraCard?.name}
                card={extraCard}
                ignore={true}
            />}
        </div>
    );
};

export default PlayerHand;
