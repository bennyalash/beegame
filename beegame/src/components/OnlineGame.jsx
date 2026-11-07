import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useParams, useNavigate } from 'react-router-dom';

import { Game } from './Game';
import { ThreeAppCanvas } from './ThreeAppCanvas';
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

    useEffect(() => {
        if (gameData?.State === 'canceled') navigate('/active');
    }, [gameData?.State, navigate]);

    if (!gameData) return <ThreeAppCanvas view="loading" />;
    if (gameData.State === 'waiting') return <ThreeAppCanvas
        view="waiting"
        user={user}
        data={{ opponent: gameData.P2Name || 'your opponent' }}
        actions={{ active: () => navigate('/active'), home: () => navigate('/') }}
    />;
    if (gameData.State === 'canceled') return <ThreeAppCanvas view="loading" />;

    return <Game online gameData={gameData} user={user} />;
}
