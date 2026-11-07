import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { ThreeAppCanvas } from './ThreeAppCanvas';

export function Accept({ user }) {
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [challenger, setChallenger] = useState(null);
    const [challengerLevel, setChallengerLevel] = useState(null);
    const [state, setState] = useState(null);
    const { gameId } = useParams();

    useEffect(() => {
        let active = true;
        const unsubscribe = onSnapshot(collection(db, 'Games'), async (snapshot) => {
            const invitation = snapshot.docs
                .map(gameDoc => ({ id: gameDoc.id, ...gameDoc.data() }))
                .find(item => item.id === gameId && item.State === 'waiting');

            if (!invitation) {
                if (active) {
                    setGame(null);
                    navigate('/friends');
                }
                return;
            }

            try {
                const challengerDoc = await getDoc(doc(db, 'Users', invitation.Player1));
                if (active && challengerDoc.exists()) {
                    setGame(invitation.id);
                    setChallenger(invitation.P1Name || 'A fellow beekeeper');
                    setChallengerLevel(challengerDoc.data().level);
                    setState(invitation.State);
                }
            } catch (error) {
                console.error('Unable to load the challenger profile:', error);
            }
        }, (error) => console.error('Unable to load invitation:', error));

        return () => { active = false; unsubscribe(); };
    }, [gameId, navigate]);

    const startGame = async (gameId) => {
        try {
            const gameRef = doc(db, 'Games', gameId);
            await updateDoc(gameRef, {
                State: "accepted"
            });
            navigate(`/game/${gameId}`);
        } catch (error) {
            console.error("Error updating game state:", error);
        }
    }

    const cancelGame = async (gameId) => {
        try {
            const gameRef = doc(db, 'Games', gameId);
            await deleteDoc(gameRef);

        } catch (error) {
            console.error("Error updating game state:", error);
        }
    }


    if (!game) return <ThreeAppCanvas view="loading" user={user} />;

    return <ThreeAppCanvas
        view="accept"
        user={user}
        data={{ invitation: game && state === 'waiting' ? { id: game, name: challenger, level: challengerLevel } : null }}
        actions={{
            home: () => navigate('/'),
            active: () => navigate('/active'),
            friends: () => navigate('/friends'),
            recent: () => navigate('/recent'),
            acceptInvite: () => game && startGame(game),
            declineInvite: () => game && cancelGame(game),
        }}
    />;
}
