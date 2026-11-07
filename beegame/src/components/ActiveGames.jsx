import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ThreeAppCanvas } from './ThreeAppCanvas';
export function ActiveGames({ user }) {
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [challenger, setChallenger] = useState(null);
    const [challengerLevel, setChallengerLevel] = useState(null);
    const [state, setState] = useState(null);
    const [activeGames, setActiveGames] = useState(null);
    const [recentGames, setRecentGames] = useState(null);


    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'Games'), (snapshot) => {
            const games = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const activeGames = games.filter(
                g => (g.Player1 === user.id || g.Player2 === user.id) && g.State === "accepted"
            );
            setActiveGames(activeGames);

            const RecentGames = games.filter(
                g => (g.Player1 === user.id || g.Player2 === user.id) && g.State === "finished"
            );
            setRecentGames(RecentGames);


            const invitation = games.find(u => u.Player2 === user.id && u.State === "waiting");

            if (invitation) {
                (async () => {
                    const opp = doc(db, "Users", invitation.Player1);
                    const p1Snap = await getDoc(opp);

                    if (p1Snap.exists()) {
                        const gameId = invitation.id;
                        setGame(gameId);
                        setChallenger(invitation.P1Name);
                        setChallengerLevel(p1Snap.data().level);
                        setState(invitation.State);
                    }
                })();
            } else {
                setGame(null);
            }
        });

        return () => unsubscribe();
    }, [user]);

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

    const [userLevel, setUserLevel] = useState(user.level);

    useEffect(() => {
        if (!user?.id) return;

        const userRef = doc(db, "Users", user.id);
        const unsubscribe = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const updatedUser = snapshot.data();
                setUserLevel(updatedUser.level);
            }
        });

        return () => unsubscribe();
    }, [user]);


    return <ThreeAppCanvas
        view="active"
        user={{ ...user, level: userLevel }}
        data={{
            activeGames: activeGames || [],
            recentGames: recentGames || [],
            invitation: game && state === 'waiting' ? { id: game, name: challenger, level: challengerLevel } : null,
        }}
        actions={{
            home: () => navigate('/'),
            active: () => navigate('/active'),
            friends: () => navigate('/friends'),
            recent: () => navigate('/recent'),
            resumeGame: (gameId) => navigate(`/game/${gameId}`),
            openGame: (gameId) => navigate(`/game/${gameId}`),
            acceptInvite: () => game && startGame(game),
            declineInvite: () => game && cancelGame(game),
        }}
    />;
}
