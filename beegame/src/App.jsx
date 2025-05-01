import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import GameBoard from './components/GameBoard'
import './App.css'
import PlayerHand from './components/PlayerHand'

function App() {
    const [count, setCount] = useState(0);
    const [card, setCard] = useState(0);
    const [piece, setPiece] = useState(0);
    const [turn, setTurn] = useState(2);

    const changeTurn = () => {
        if (turn == 2) { setTurn(1); }
        else if (turn == 1) { setTurn(2); }
    }

    const coords = [
        [0, 0],
        [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1],
        [2, -2], [2, -1], [1, 1], [0, 2], [-1, 2],
        [-2, 2], [-2, 1], [-1, -1], [0, -2], [1, -2], [-2, 0], [2, 0]
    ];

    const [pieces, setPieces] = useState([
        { id: 'p1-queen', player: 1, type: 'queen', position: [0, -2] },
        { id: 'p1-pawn1', player: 1, type: 'pawn', position: [-1, -1] },
        { id: 'p1-pawn2', player: 1, type: 'pawn', position: [1, -2] },
        { id: 'p2-queen', player: 2, type: 'queen', position: [0, 2] },
        { id: 'p2-pawn1', player: 2, type: 'pawn', position: [-1, 2] },
        { id: 'p2-pawn2', player: 2, type: 'pawn', position: [1, 1] },
    ]);

    const initialCards1 = [
        {
            name: "1",
            moves: [
                [0, -2],
                [0, 1]
            ]
        },
        {
            name: "2",
            moves: [
                [-2, 0],
                [-1, 1],
                [1, 0],
                [2, -2]
            ]
        }
    ];

    const initialCards2 = [
        {
            name: "3",
            moves: [
                [0, 1],
                [1, -1],
                [-1, 0]
            ]
        },
        {
            name: "4",
            moves: [
                [0, -1],
                [-1, 1],
                [1, 0]
            ]
        }
    ];

    const initialExtraCard = 
        {
            name: "20202",
            moves: [
                [0, -1],
                [2, -1],
                [-2, 1]
            ]
        }
    

    const [cards1, setCards1] = useState(initialCards1);
    const [cards2, setCards2] = useState(initialCards2);
    const [extraCard, setExtraCard] = useState(initialExtraCard);
    const [previewPosition, setPreviewPosition] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);

    const previewMove = (newPosition) => {
        setPreviewPosition(newPosition);
        setIsConfirming(true);
    };


    /*useEffect(() => {
        if (isConfirming && previewPosition && piece) {
            const confirmMove = window.confirm(`Move ${piece.type} to [${previewPosition[0]}, ${previewPosition[1]}]?`);
            if (confirmMove) {
                finalizeMove(previewPosition);
            }
            // Revert or clean up either way
            setPreviewPosition(null);
            setIsConfirming(false);
        }
    }, [isConfirming, previewPosition]);*/


    const finalizeMove = (newPosition) => {
        const occupyingPiece = pieces.find(p =>
            p.position[0] === newPosition[0] && p.position[1] === newPosition[1]
        );

        if (piece.type == "queen" && turn == 1 && newPosition[0] == 0 && newPosition[1] == 2) {
            alert("RED WINS");
        }
        if (piece.type == "queen" && turn == 2 && newPosition[0] == 0 && newPosition[1] == -2) {
            alert("BLUE WINS");
        }

        if (occupyingPiece) {
            if (occupyingPiece.type === 'queen') {
                alert(turn == 1 ? "RED WINS" : "BLUE WINS");
            }
            setPieces(prevPieces =>
                prevPieces
                    .filter(p => p.id !== occupyingPiece.id)
                    .map(p =>
                        p.id === piece.id
                            ? { ...p, position: newPosition }
                            : p
                    )
            );
        } else {
            setPieces(prevPieces =>
                prevPieces.map(p =>
                    p.id === piece.id
                        ? { ...p, position: newPosition }
                        : p
                )
            );
        }

        setExtraCard(card);
        if (turn === 1) {
            const cardIndex = cards1.findIndex(c => c.name === card.name);
            if (cardIndex !== -1) {
                const updatedCards1 = [...cards1];
                updatedCards1[cardIndex] = extraCard;
                setCards1(updatedCards1);
            }
        } else {
            const cardIndex = cards2.findIndex(c => c.name === card.name);
            if (cardIndex !== -1) {
                const updatedCards2 = [...cards2];
                updatedCards2[cardIndex] = extraCard;
                setCards2(updatedCards2);
            }
        }

        setCard(null);
        setPiece(null);
        changeTurn();
    };


    

    const onSelectCard = (card) => {
        if (!isConfirming) {
            setCard(card);
        }
    }
    const onSelectPiece = (piece) => {
        if (!isConfirming && piece && piece.player == turn) {
            setPiece(piece);
        }
    }

  return (
      <>
          <div className="header">
          Go Bee
          </div>
          <div className="game">
              <div className="confirmation-box">
                  {turn == 1 && isConfirming && previewPosition && piece && (<>
                      <div className="button-holder">
                          <button onClick={() => {
                              setPreviewPosition(null);
                              setIsConfirming(false);
                          }}>
                              Cancel
                          </button>
                      </div>
                      <div className="button-holder">
                          <button onClick={() => {
                              finalizeMove(previewPosition);
                              setPreviewPosition(null);
                              setIsConfirming(false);
                          }}>
                              Confirm
                          </button>
                      </div>
                  </>)}
              </div>
              <PlayerHand extraCard={extraCard} turn={turn} top={true} selectedCardIndex={card} cards={cards1} opponent={turn == 2} onSelectCard={onSelectCard} />
              <GameBoard turn={turn} onMove={previewMove} card={card} piece={piece} previewPosition={previewPosition} onSelectPiece={onSelectPiece} selectedPiece={piece} coords={coords} pieces={pieces} />
              <PlayerHand extraCard={extraCard} turn={turn} top={false} selectedCardIndex={card} cards={cards2} opponent={turn == 1} onSelectCard={onSelectCard} />

              
                  <div  className="confirmation-box">
                  {turn == 2 && isConfirming && previewPosition && piece && (<>
                      <div className="button-holder">
                      <button onClick={() => {
                          setPreviewPosition(null);
                          setIsConfirming(false);
                      }}>
                          Cancel
                          </button>
                      </div>
                      <div className="button-holder">
                      <button onClick={() => {
                          finalizeMove(previewPosition);
                          setPreviewPosition(null);
                          setIsConfirming(false);
                      }}>
                          Confirm
                          </button>
                      </div>
                      </> )}
                  </div>
             

          </div>
          <div className="footer">
                <button>Resign</button><button>Settings</button>
          </div>
    </>
  )
}

export default App
