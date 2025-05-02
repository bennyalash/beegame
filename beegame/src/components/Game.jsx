import { useState, useEffect } from 'react'
import GameBoard from './GameBoard'
import '../App.css'
import PlayerHand from './PlayerHand'
import { Confirmation } from './Confirmation'
import { useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';

export function Game({ onRematch }) {

    const generateInitialPieces = () => ([
        { id: 'p1-queen', player: 1, type: 'queen', position: [0, -2] },
        { id: 'p1-pawn1', player: 1, type: 'pawn', position: [-1, -1] },
        { id: 'p1-pawn2', player: 1, type: 'pawn', position: [1, -2] },
        { id: 'p2-queen', player: 2, type: 'queen', position: [0, 2] },
        { id: 'p2-pawn1', player: 2, type: 'pawn', position: [-1, 2] },
        { id: 'p2-pawn2', player: 2, type: 'pawn', position: [1, 1] },
    ]);

    const generateInitialCards1 = () => ([
        { name: "1", moves: [[0, -2], [0, 1]] },
        { name: "2", moves: [[-2, 0], [-1, 1], [1, 0], [2, -2]] },
    ]);

    const generateInitialCards2 = () => ([
        { name: "3", moves: [[0, 1], [1, -1], [-1, 0]] },
        { name: "4", moves: [[0, -1], [-1, 1], [1, 0]] },
    ]);

    const generateExtraCard = () => ({
        name: "20202", moves: [[0, -1], [2, -1], [-2, 1]]
    });

    const [pieces, setPieces] = useState(generateInitialPieces);
    const [cards1, setCards1] = useState(generateInitialCards1);
    const [cards2, setCards2] = useState(generateInitialCards2);
    const [extraCard, setExtraCard] = useState(generateExtraCard);


    const [previewPosition, setPreviewPosition] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [lastMoveStart, setLMS] = useState(null);
    const [lastMoveEnd, setLME] = useState(null);
    const [count, setCount] = useState(0);
    const [card, setCard] = useState(0);
    const [piece, setPiece] = useState(0);
    const [turn, setTurn] = useState(2);
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState(null);
    const [winType, setWinType] = useState(null);
    const [boardFlips, setBoardFlips] = useState(false);
    const navigate = useNavigate();

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

    const previewMove = (newPosition) => {
        setPreviewPosition(newPosition);
        setIsConfirming(true);
    };

    const finalizeMove = (newPosition) => {
        const occupyingPiece = pieces.find(p =>
            p.position[0] === newPosition[0] && p.position[1] === newPosition[1]
        );

        setLMS(piece.position);
        setLME(newPosition);

        if (piece.type == "queen" && turn == 1 && newPosition[0] == 0 && newPosition[1] == 2) {
            setWinner("Red");
            setWinType("Infest");
        }
        if (piece.type == "queen" && turn == 2 && newPosition[0] == 0 && newPosition[1] == -2) {
            setWinner("Blue");
            setWinType("Infest");
        }

        

        if (occupyingPiece) {
            if (occupyingPiece.type === 'queen') {
                setWinType("Sting");
                if (turn == 1) {
                    setWinner("Red");
                }
                else {
                    setWinner("Blue");
                }
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
        
        if (!winner && !isConfirming) {
            setCard(card);
        }
    }
    const onSelectPiece = (piece) => {
        if (!winner && !isConfirming && piece && piece.player == turn) {
            setPiece(piece);
        }
    }

    const cancel = () => {
        setPreviewPosition(null);
        setIsConfirming(false);
    }

    const confirm = () => {
        finalizeMove(previewPosition);
        setPreviewPosition(null);
        setIsConfirming(false);
    }

    const [menuOpen, setMenuOpen] = useState(false);

    const handlers = useSwipeable({
        onSwipedRight: () => setMenuOpen(false),
        onSwipedLeft: (eventData) => {
            console.log(eventData.initial[1] - window.innerWidth);
            if (eventData.initial[0] > window.innerWidth - 60) {
                // Only open if swipe starts from right edge
                setMenuOpen(true);
            }
        },
        delta: 30, // minimum distance(px) to count as swipe
        trackTouch: true,
        trackMouse: true
    });

    return (
        <div style={{ display: "contents" }} className="gameWrapper" {...handlers} >
            <div className="header">
            </div>
            {!winner && <div className={`popup menu ${menuOpen ? "open" : "closed"}`}>
                <h1>Settings</h1>
                <br></br>
                <div className="settings-buttons">
                    <label>Board Flips: </label><button onClick={() => setBoardFlips(!boardFlips)} className={`${boardFlips ? "on" : "off"}`}>{boardFlips ? "On" : "Off"}</button>
                </div>
                <div className="auth-buttons">
                    <button onClick={() => navigate("/")}>Exit</button>
                </div>
            </div>}
            {winner && <div className="popup">
                <h1>{winner} Wins!</h1>
                {winType && <p>By {winType}</p>}
                <img src={`/queen_${winner?.toLowerCase() || "red"}.png`} />
                <div className="auth-buttons">
                    <button onClick={() => onRematch()} >Rematch</button>
                    <button onClick={() => navigate("/")}>Exit</button>
                </div>
            </div>}
            <div className={`game ${boardFlips ? "flips" : ""}`}>

                <PlayerHand extraCard={extraCard} turn={turn} top={true} selectedCardIndex={card} cards={cards1} opponent={turn == 2} onSelectCard={onSelectCard} />

                <Confirmation cancel={cancel} confirm={confirm} top={true} good={turn == 1 && isConfirming && previewPosition && piece} />
                <GameBoard lms={lastMoveStart} lme={lastMoveEnd} turn={turn} onMove={previewMove} card={card} piece={piece} previewPosition={previewPosition} onSelectPiece={onSelectPiece} selectedPiece={piece} coords={coords} pieces={pieces} />
                <Confirmation cancel={cancel} confirm={confirm} good={turn == 2 && isConfirming && previewPosition && piece} />
                <PlayerHand extraCard={extraCard} turn={turn} top={false} selectedCardIndex={card} cards={cards2} opponent={turn == 1} onSelectCard={onSelectCard} />


            </div>
            <div className="footer">
                <div>
                    {/*<img src="flag.png" />Resign*/}
                </div>
                <div onClick={() => navigate('/')}>
                    {/*<img src="flag.png" />Exit*/}
                </div>
                <div>
                    {/*<img src="person.png" />Profile*/}
                </div>
            </div>
        </div>
    )
}
