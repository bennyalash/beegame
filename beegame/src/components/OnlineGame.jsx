import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useParams, useNavigate } from 'react-router-dom';

import { Game } from './Game';
export function OnlineGame({user }) {
    const { gameId } = useParams();
    const navigate = useNavigate();

    const [gameData, setGameData] = useState(null);
    const gameDataRef = useRef(null);
    useEffect(() => {
        gameDataRef.current = gameData;
    }, [gameData]);
    useEffect(() => {
        if (!gameId) return;

        const gameRef = doc(db, "Games", gameId);

        const unsubscribe = onSnapshot(gameRef, (gameDoc) => {
            if (gameDoc.exists()) {
                setGameData(gameDoc.data());
            } else {
                navigate('/friends');
            }
        }, (error) => {
            console.error("Error fetching game data:", error);
        });

        const handleBeforeUnload = async () => {
            const data = gameDataRef.current;
            if (
                data?.State === "waiting" &&
                data?.Player1 === user.id
            ) {
                try {
                    await deleteDoc(gameRef);

                } catch (e) {
                    console.error("Failed to cancel game on unload", e);
                }
            }
        };

        const onUnload = () => {
            handleBeforeUnload();
        };

        window.addEventListener("beforeunload", onUnload);

        return () => {
            window.removeEventListener("beforeunload", onUnload);
            handleBeforeUnload(); // Still uses up-to-date ref
            unsubscribe();
        };
    }, [gameId, user.id, navigate]);

    return (
        <div className="game-room">
            
            {gameData ? (
                <>
                    {gameData.State === "waiting" && <>
                        <div className="game-room-popup">
                        <h1>Game Room</h1>
                        
                            <p>Waiting for {gameData.P2Name || "Other Player"}...</p>
                            <br></br>
                            <button onClick={() => navigate('/friends')}>Return</button>
                        </div>
                    </>}
                    {gameData.State !== "waiting" && gameData.State !== "canceled" && (
                        <Game online={true} p1={gameData.P1Name} p2={gameData.P2Name} gameData={gameData} user={user} />
                    )}
                </>
            ) : (
                <p>Loading game...</p>
            )}
        </div>
    );
}
