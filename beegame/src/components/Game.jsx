import { useState, useEffect } from 'react'
import GameBoard from './GameBoard'
import '../App.css'
import PlayerHand from './PlayerHand'
import { Confirmation } from './Confirmation'
import { useNavigate, useParams } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function Game({ onRematch, online = false, p1, p2, gameData, user, resignGame = null, staged = false }) {

    const player = !user || user.username == p1 ? 1 : 2;
    const { gameId: gameId } = useParams();

    const [pieces, setPieces] = useState([]);
    const [cards1, setCards1] = useState([]);
    const [cards2, setCards2] = useState([]);
    const [turn, setTurn] = useState(1);
    const [extraCard, setExtraCard] = useState(null);
    const [lastMoveStart, setLMS] = useState(null);
    const [lastMoveEnd, setLME] = useState(null);
    const [winnerChange, setWinnerChange] = useState(null);
    const [loserChange, setLoserChange] = useState(null);

    useEffect(() => {
        if (online && gameData) {
            const cards = gameData.Cards || [];
            const cardsPerPlayer = 2;
            const extraCardIndex = cardsPerPlayer * 2;
            setTurn(gameData.Turn);

            // Ensure position arrays are converted if needed
            const convertedPieces = (gameData.Pieces || []).map(piece => ({
                ...piece,
                position: Array.isArray(piece.position)
                    ? { x: piece.position[0], y: piece.position[1] }
                    : piece.position
            }));

            const convertedCards = cards.map(card => ({
                ...card,
                moves: (card.moves || []).map(move =>
                    Array.isArray(move) ? { x: move[0], y: move[1] } : move
                )
            }));

            setLMS(gameData.LMS);
            setLME(gameData.LME);
            setWinner(gameData.Winner);
            setWinType(gameData.WinType);
            setPieces(convertedPieces);
            setCards1(convertedCards.slice(0, cardsPerPlayer));
            setCards2(convertedCards.slice(cardsPerPlayer, cardsPerPlayer * 2));
            setExtraCard(convertedCards[extraCardIndex]);
            setWinnerChange(gameData.WinnerChange);
            setLoserChange(gameData.LoserChange);
        } else if (!online) {
            // Fallback to local game setup
            setPieces([
                { id: 'p1-queen', player: 1, type: 'queen', position: { x: 0, y: -2 } },
                { id: 'p1-pawn1', player: 1, type: 'pawn', position: { x: -1, y: -1 } },
                { id: 'p1-pawn2', player: 1, type: 'pawn', position: { x: 1, y: -2 } },
                { id: 'p2-queen', player: 2, type: 'queen', position: { x: 0, y: 2 } },
                { id: 'p2-pawn1', player: 2, type: 'pawn', position: { x: -1, y: 2 } },
                { id: 'p2-pawn2', player: 2, type: 'pawn', position: { x: 1, y: 1 } }
            ]);

            const cards = [
                { name: "1", moves: [{ x: 0, y: -2 }, { x: 0, y: 1 }] },
                { name: "2", moves: [{ x: -2, y: 0 }, { x: -1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: -2 }] },
                { name: "3", moves: [{ x: 0, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 0 }] },
                { name: "4", moves: [{ x: 0, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 0 }] },
                { name: "5", moves: [{ x: 0, y: -1 }, { x: 2, y: -1 }, { x: -2, y: 1 }] }
            ];

            setCards1(cards.slice(0, 2));
            setCards2(cards.slice(2, 4));
            setExtraCard(cards[4]);
        }
    }, [gameData, online]);



    const [previewPosition, setPreviewPosition] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);
    
    const [count, setCount] = useState(0);
    const [card, setCard] = useState(0);
    const [piece, setPiece] = useState(0);
    
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState(null);
    const [winType, setWinType] = useState(null);
    const [boardFlips, setBoardFlips] = useState(!online);
    const navigate = useNavigate();

    const changeTurn = () => {
        if (turn == 2) {
            setTurn(1);
            return 1;
        }
        else if (turn == 1) {
            setTurn(2);
            return 2;
        }

        
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

    const finalizeMove = async (newPosition) => {

        const occupyingPiece = pieces.find(p =>
            p.position.x === newPosition[0] && p.position.y === newPosition[1]
        );

        setLMS([piece.position.x, piece.position.y]);
        setLME(newPosition);

        let winnerUpdate = null;
        let winTypeUpdate = null;

        if (piece.type === "queen" && turn === 1 && newPosition[0] === 0 && newPosition[1] === 2) {
            setWinner("Red");
            setWinType("Infest");
            winnerUpdate = "Red";
            winTypeUpdate = "Infest";
        }
        if (piece.type === "queen" && turn === 2 && newPosition[0] === 0 && newPosition[1] === -2) {
            setWinner("Blue");
            setWinType("Infest");
            winnerUpdate = "Blue";
            winTypeUpdate = "Infest";
        }

        let updatedPieces;
        if (occupyingPiece) {
            if (occupyingPiece.type === 'queen') {
                setWinType("Sting");
                winTypeUpdate = "Sting";
                if (turn === 1) {
                    setWinner("Red");
                    winnerUpdate = "Red";
                } else {
                    setWinner("Blue");
                    winnerUpdate = "Blue";
                }
            }

            updatedPieces = pieces
                .filter(p => p.id !== occupyingPiece.id)
                .map(p =>
                    p.id === piece.id
                        ? {
                            ...p,
                            position: { x: newPosition[0], y: newPosition[1] }
                        }
                        : p
                );
        } else {
            updatedPieces = pieces.map(p =>
                p.id === piece.id
                    ? {
                        ...p,
                        position: { x: newPosition[0], y: newPosition[1] }
                    }
                    : p
            );
        }

        setPieces(updatedPieces);

        setExtraCard(card);
        let updatedCards1 = cards1;
        let updatedCards2 = cards2;

        if (turn === 1) {
            const cardIndex = cards1.findIndex(c => c.name === card.name);
            if (cardIndex !== -1) {
                updatedCards1 = [...cards1];
                updatedCards1[cardIndex] = extraCard;
                setCards1(updatedCards1);
            }
        } else {
            const cardIndex = cards2.findIndex(c => c.name === card.name);
            if (cardIndex !== -1) {
                updatedCards2 = [...cards2];
                updatedCards2[cardIndex] = extraCard;
                setCards2(updatedCards2);
            }
        }

        setCard(null);
        setPiece(null);
        const turner = changeTurn();

        if (online && gameId) {
            try {

                if (winnerUpdate) {
                    let winner = "";
                    let loser = "";
                    if (winnerUpdate === "Red") {
                        winner = gameData.Player1;
                        loser = gameData.Player2;
                    }
                    if (winnerUpdate === "Blue") {
                        loser = gameData.Player1;
                        winner = gameData.Player2;
                    }

                    const { winnerChange, loserChange } = await setLevel(winner, loser);
                    console.log(winnerChange);

                    await updateDoc(doc(db, "Games", gameId), {
                        Pieces: updatedPieces.map(p => ({
                            ...p,
                            position: { x: p.position.x, y: p.position.y }
                        })),
                        Cards: [...updatedCards1, ...updatedCards2, card].map(c => ({
                            ...c,
                            moves: c.moves.map(m => ({ x: m.x, y: m.y }))
                        })),
                        Winner: winnerUpdate ?? "",
                        State: "finished",
                        Turn: turner,
                        LMS: [piece.position.x, piece.position.y],
                        LME: newPosition,
                        WinType: winTypeUpdate,
                        WinnerChange: winnerChange,
                        LoserChange: loserChange
                    });
                } else {
                    await updateDoc(doc(db, "Games", gameId), {
                        Pieces: updatedPieces.map(p => ({
                            ...p,
                            position: { x: p.position.x, y: p.position.y }
                        })),
                        Cards: [...updatedCards1, ...updatedCards2, card].map(c => ({
                            ...c,
                            moves: c.moves.map(m => ({ x: m.x, y: m.y }))
                        })),
                        Winner: "",
                        State: "accepted",
                        Turn: turner,
                        LMS: [piece.position.x, piece.position.y],
                        LME: newPosition,
                        WinType: winTypeUpdate
                    });
                }


                

            } catch (error) {
                console.error("Failed to update game in Firestore:", error);
            }
        }
    };

    const eloRating = (winnerLevel, loserLevel, k = 32) => {
        const expectedWinner = 1 / (1 + Math.pow(10, (loserLevel - winnerLevel) / 400));
        const expectedLoser = 1 / (1 + Math.pow(10, (winnerLevel - loserLevel) / 400));

        let newWinnerLevel = Math.round(winnerLevel + k * (1 - expectedWinner));
        let newLoserLevel = Math.round(loserLevel + k * (0 - expectedLoser));

        // Clamp to a minimum of 100
        newWinnerLevel = Math.max(100, newWinnerLevel);
        newLoserLevel = Math.max(100, newLoserLevel);

        return { newWinnerLevel, newLoserLevel };
    };

    
    const setLevel = async (winnerId, loserId) => {
        const winnerRef = doc(db, "Users", winnerId);
        const loserRef = doc(db, "Users", loserId);

        const [winnerSnap, loserSnap] = await Promise.all([
            getDoc(winnerRef),
            getDoc(loserRef),
        ]);

        if (!winnerSnap.exists() || !loserSnap.exists()) {
            console.error("One or both users do not exist.");
            return;
        }

        const winnerLevel = winnerSnap.data().level;

        const loserLevel = loserSnap.data().level;

        const { newWinnerLevel, newLoserLevel } = eloRating(winnerLevel, loserLevel);

        await Promise.all([
            updateDoc(winnerRef, { level: newWinnerLevel }),
            updateDoc(loserRef, { level: newLoserLevel }),
        ]);
        
        const cw = newWinnerLevel * 1 - winnerLevel*1;
        const cl = newLoserLevel * 1 - loserLevel * 1;
        console.log(cw + " " + cl);
        return { winnerChange: cw, loserChange: cl };


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
        onSwipedRight: (eventData) => {
            setMenuOpen(false)
            if (eventData.initial[0] < 60 && online) {
                // Only open if swipe starts from right edge
                navigate('/active');
            }
        },
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
    const resign = async () => {
        if (window.confirm("Are you sure you want to resign?")) {
            let winner = "";
            let loser = "";
            let winnerUpdate = "";
            let winTypeUpdate = "Resignation";

            if (player === 2) {
                winnerUpdate = "Red";
                winner = gameData.Player1;
                loser = gameData.Player2;
                setWinner("Red");
            }
            if (player === 1) {
                winnerUpdate = "Blue";
                loser = gameData.Player1;
                winner = gameData.Player2;
                setWinner("Blue");
            }

            setWinType(winTypeUpdate);

            const { winnerChange, loserChange } = await setLevel(winner, loser);

            await updateDoc(doc(db, "Games", gameId), {
                Winner: winnerUpdate ?? "",
                State: "finished",
                WinType: winTypeUpdate,
                WinnerChange: winnerChange,
                LoserChange: loserChange
            });
        }
    };

    const quit = async () => {
        if (window.confirm("Are you sure you want to Quit?")) {
            navigate("/");
        }
    };

    return (
        <div style={{ display: "contents" }} className="gameWrapper" {...handlers} >
            <div className="header">
            </div>
            {!winner && !online && <div className={`popup menu ${menuOpen ? "open" : "closed"}`}>
                <h1>Settings</h1>
                <br></br>
                <div className="settings-buttons">
                    <label>Board Flips: </label><button onClick={() => setBoardFlips(!boardFlips)} className={`${boardFlips ? "on" : "off"}`}>{boardFlips ? "On" : "Off"}</button>
                </div>
                <div className="auth-buttons">
                    <button onClick={() => quit()}>Quit Game</button>
                </div>
            </div>}
            {winner && <div className="popup">
                <h1>{winner} Wins!</h1>
                {winType && <p>By {winType}</p>}
                {winner && winnerChange && ((winner == "Red" && player == 1) || (winner == "Blue" && player == 1)) && <h2>+ {winnerChange} <img width="24" height="24" src="../icons/trophy.png" /></h2>}
                {winner && loserChange && ((winner == "Red" && player == 2) || (winner == "Blue" && player == 2)) && <h2>- {-1*loserChange} <img width="24" height="24" src="../icons/trophy.png" /></h2>}
                <img className="winner-bee" src={`/icons/bees/queen_${winner?.toLowerCase() || "red"}.png`} />
                <div className="auth-buttons">
                    {!online && <button onClick={() => onRematch()} >Rematch</button>}
                    <button onClick={() => navigate("/")}>Exit</button>
                </div>
            </div>}
            <div className={`game${winner ? " gameOver" : ""}${boardFlips ? " flips" : ""}${online ? " online-game" : ""}${player == 1 ? " p1" : " p2"}${turn == 1 ? " t1" : " t2"}`}>
                {!staged && <PlayerHand extraCard={extraCard} player={player} online={online} turn={turn} top={true} selectedCardIndex={card} cards={cards1} opponent={online ? player == 2 || turn == 2 : turn != 1} onSelectCard={onSelectCard} />}
                {!staged && <Confirmation cancel={cancel} confirm={confirm} top={true} onlineHide={online && player == 2} good={(turn == 1) && isConfirming && previewPosition && piece} />}
                <GameBoard online={online} lms={lastMoveStart} lme={lastMoveEnd} turn={turn} onMove={previewMove} card={card} piece={piece} previewPosition={previewPosition} onSelectPiece={onSelectPiece} selectedPiece={piece} coords={coords} pieces={pieces} online={online} p={player} />
                {!staged && <Confirmation cancel={cancel} confirm={confirm} onlineHide={online && player == 1} good={(turn == 2 || (online && player == 2)) && isConfirming && previewPosition && piece} />}
                {!staged && <PlayerHand extraCard={extraCard} player={player} online={online} turn={turn} top={false} selectedCardIndex={card} cards={cards2} opponent={online ? player == 1 || turn == 1 : turn != 2} onSelectCard={onSelectCard} />}
            </div>
            {online && !staged  && <div className="page-footer">
                <div>
                </div>
                <div >
                    <div className="footer-button" onClick={() => resign()}>
                        <img width="20" src="/icons/flag.png" />
                        
                    </div>
                </div>
                <div>
                </div>
            </div>}
        </div>
    )
}
