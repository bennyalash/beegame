import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { BOARD_COORDS } from '../game/hexGrid.js';
import { useNavigate } from 'react-router-dom';
import { getBestAIMove } from '../ai/ai';
import { ThreeAppCanvas } from './ThreeAppCanvas';

const ThreeGameBoard = lazy(() => import('./ThreeGameBoard.jsx').then(module => ({ default: module.ThreeGameBoard })));

export function AIGame({ onRematch }) {

    const [pieces, setPieces] = useState([]);
    const [cards1, setCards1] = useState([]);
    const [cards2, setCards2] = useState([]);
    const [turn, setTurn] = useState(1);
    const [extraCard, setExtraCard] = useState(null);
    const [lastMoveStart, setLMS] = useState(null);
    const [lastMoveEnd, setLME] = useState(null);

    useEffect(() => {
        
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
                { name: "5", moves: [{ x: 0, y: -1 }, { x: 2, y: -1 }, { x: -2, y: 1 }] },
                { name: "6", moves: [{ x: -2, y: 1 }, { x: -1, y: 0 }, { x: 1, y: -1 }, { x: 2, y: -1 }] },
                { name: "7", moves: [{ x: -1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: -1 }] },
                { name: "8", moves: [{ x: 0, y: -1 }, { x: 0, y: 1 }] },
                { name: "9", moves: [{ x: -1, y: 0 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: 1, y: 0 }] },
                { name: "10", moves: [{ x: -1, y: -1 }, { x: 1, y: -2 }] }
            ];

            function shuffle(array) {
                const arr = [...array];
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
                return arr;
            }

            // Shuffle and pick the first 5
            const shuffled = shuffle(cards);
            setCards1(shuffled.slice(0, 2));
            setCards2(shuffled.slice(2, 4));
            setExtraCard(shuffled[4]);
    }, []);



    const [previewPosition, setPreviewPosition] = useState(null);
    const [isConfirming, setIsConfirming] = useState(false);

    const [card, setCard] = useState(0);
    const [piece, setPiece] = useState(0);

    const [winner, setWinner] = useState(null);
    const [winType, setWinType] = useState(null);
    const navigate = useNavigate();

    const coords = BOARD_COORDS;

    const previewMove = (newPosition) => {

        setPreviewPosition(newPosition);
        setIsConfirming(true);
    };

    const finalizeMove = async (newPosition, thispiece = piece, thiscard = card) => {

        const occupyingPiece = pieces.find(p =>
            p.position.x === newPosition[0] && p.position.y === newPosition[1]
        );

        setLMS([thispiece.position.x, thispiece.position.y]);
        setLME(newPosition);

        if (thispiece.type === "queen" && turn === 1 && newPosition[0] === 0 && newPosition[1] === 2) {
            setWinner("Red");
            setWinType("Infest");
        }
        if (thispiece.type === "queen" && turn === 2 && newPosition[0] === 0 && newPosition[1] === -2) {
            setWinner("Blue");
            setWinType("Infest");
        }

        let updatedPieces;
        if (occupyingPiece) {
            if (occupyingPiece.type === 'queen') {
                setWinType("Sting");
                if (turn === 1) {
                    setWinner("Red");
                } else {
                    setWinner("Blue");
                }
            }

            updatedPieces = pieces
                .filter(p => p.id !== occupyingPiece.id)
                .map(p =>
                    p.id === thispiece.id
                        ? {
                            ...p,
                            position: { x: newPosition[0], y: newPosition[1] }
                        }
                        : p
                );
        } else {
            updatedPieces = pieces.map(p =>
                p.id === thispiece.id
                    ? {
                        ...p,
                        position: { x: newPosition[0], y: newPosition[1] }
                    }
                    : p
            );
        }

        setPieces(updatedPieces);

        setExtraCard(thiscard);
        let updatedCards1 = cards1;
        let updatedCards2 = cards2;

        if (turn === 1) {
            const cardIndex = cards1.findIndex(c => c.name === thiscard.name);
            if (cardIndex !== -1) {
                updatedCards1 = [...cards1];
                updatedCards1[cardIndex] = extraCard;
                setCards1(updatedCards1);
            }
        } else {
            const cardIndex = cards2.findIndex(c => c.name === thiscard.name);
            if (cardIndex !== -1) {
                updatedCards2 = [...cards2];
                updatedCards2[cardIndex] = extraCard;
                setCards2(updatedCards2);
            }
        }

        setCard(null);
        setPiece(null);
        setTurn(turn == 1 ? 2 : 1);
    };

    const finalizeMoveRef = useRef(finalizeMove);
    finalizeMoveRef.current = finalizeMove;



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

   /* const handlers = useSwipeable({
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
    });*/

    const quit = async () => {
        setLeaveConfirm(false);
        setMenuOpen(false);
        navigate('/');
    };

    const [aiMove, setAiMove] = useState(null);
    const [leaveConfirm, setLeaveConfirm] = useState(false);

    useEffect(() => {
        if (turn === 2 && !winner) {
            const runAi = async () => {
                const move = getBestAIMove(pieces, cards2, extraCard, cards1);
                setAiMove(move); // store the move
            };
            runAi();
        }
    }, [turn, pieces, cards1, cards2, extraCard, winner]);

    // When AI move is chosen, step through it
    useEffect(() => {
        if (!aiMove || menuOpen) return undefined;
        let cancelled = false;

        const runSteps = async () => {
            const delay = (ms) => new Promise(res => setTimeout(res, ms));

            setPiece(aiMove.piece);
            await delay(500);
            if (cancelled) return;
            setCard(aiMove.card);
            
            previewMove(aiMove.to);
            await delay(500);
            if (cancelled) return;

            finalizeMoveRef.current(aiMove.to, aiMove.piece, aiMove.card);
            setPreviewPosition(null);
            setIsConfirming(false);
            setAiMove(null); // clear so it doesn't rerun


        };

        runSteps();
        return () => { cancelled = true; };
    }, [aiMove, menuOpen]);

    const handleCanvasAction = (action, payload) => {
        if (action === 'selectCard') onSelectCard(payload);
        else if (action === 'confirmMove') confirm();
        else if (action === 'cancelMove') cancel();
        else if (action === 'openMenu') setMenuOpen(true);
        else if (action === 'resume') { setMenuOpen(false); setLeaveConfirm(false); }
        else if (action === 'requestLeave') setLeaveConfirm(true);
        else if (action === 'cancelLeave') setLeaveConfirm(false);
        else if (action === 'confirmLeave') quit();
        else if (action === 'exitMatch') navigate('/');
        else if (action === 'rematch') onRematch?.();
    };

    return <Suspense fallback={<ThreeAppCanvas view="loading" />}>
        <ThreeGameBoard
            p={1}
            mode="ai"
            humanPlayer={1}
            viewFlipped
            lms={lastMoveStart}
            lme={lastMoveEnd}
            turn={turn}
            onMove={previewMove}
            onSelectPiece={onSelectPiece}
            onUiAction={handleCanvasAction}
            isConfirming={Boolean(isConfirming && previewPosition && piece)}
            menuOpen={menuOpen}
            leaveConfirm={leaveConfirm}
            winner={winner}
            winType={winType}
            didWin={winner === null ? null : winner === 'Red'}
            cards1={cards1}
            cards2={cards2}
            extraCard={extraCard}
            card={card}
            piece={piece}
            previewPosition={previewPosition}
            selectedPiece={piece}
            coords={coords}
            pieces={pieces}
            p1Name="YOU"
            p2Name="HIVE RIVAL"
        />
    </Suspense>;
}
