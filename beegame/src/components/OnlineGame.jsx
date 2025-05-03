import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useParams } from 'react-router-dom';
import { Game } from './Game';
export function OnlineGame({user }) {
    const { gameId } = useParams();
    const [gameData, setGameData] = useState(null);

    useEffect(() => {
        if (!gameId) return;

        const gameRef = doc(db, "Games", gameId);

        const unsubscribe = onSnapshot(gameRef, (gameDoc) => {
            if (gameDoc.exists()) {
                setGameData(gameDoc.data());
            } else {
                console.error("Game not found");
            }
        }, (error) => {
            console.error("Error fetching game data:", error);
        });

        // Clean up the listener when component unmounts
        return () => unsubscribe();

    }, [gameId]);

    const startGame = async () => {
        if (gameData?.State === "accepted") {
            const gameRef = doc(db, "Games", gameId);
            await updateDoc(gameRef, { State: "started" });
        }
    };

    return (
        <div className="game-room">
            
            {gameData ? (
                <>
                    {gameData.State === "waiting" && <><h1>Game Room</h1><p>Player 1: {gameData.P1Name}</p>
                    <p>Player 2: {gameData.P2Name || "Waiting for Player 2..."}</p>
                    <p>Status: {gameData.State}</p>

                     <p>Waiting for the other player to accept...</p></>}
                    {gameData.State !== "waiting" && (
                        <Game online={true} p1={gameData.P1Name} p2={gameData.P2Name} gameData={gameData} user={user} />
                    )}
                </>
            ) : (
                <p>Loading game...</p>
            )}
        </div>
    );
}
