import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';

export function Home({ logout, user }) {
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [challenger, setChallenger] = useState(null);
    const [state, setState] = useState(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'Games'), (snapshot) => {
            const games = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Find the invitation for the current user
            const invitation = games.find(u => u.Player2 === user.id && (u.State === "accepted" || u.State === "waiting"));
            console.log(invitation);
            if (invitation) {
                const gameId = invitation.id;
                setGame(gameId);
                setChallenger(invitation.P2Name);
                setState(invitation.State);
            } else {
                setGame(null);  // Reset game if no invitation found
            }
        });

        // Cleanup the listener when the component unmounts
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

    return (
        <div className="auth-buttons homescreen">
            <img src="icon512.png" alt="Go Bee" />
            <h1>Go Bee</h1>
            <p>Welcome, {user.username}</p>
            {game && <button onClick={() => startGame(game)}>{state == "waiting" ? `Accept Challenge? ${challenger}` : `Resume Game`}</button>}
            <button onClick={() => navigate('/game')}>Pass & Play</button>
            <button onClick={() => navigate('/friends')}>Online</button>
            <button onClick={() => logout()}>Logout</button>
        </div>
    );
}
