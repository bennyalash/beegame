import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';

export function Accept() {
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [challenger, setChallenger] = useState(null);
    const [challengerLevel, setChallengerLevel] = useState(null);
    const [state, setState] = useState(null);
    const { gameId } = useParams();

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'Games'), (snapshot) => {

            const games = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Find the invitation for the current user
            const invitation = games.find(u => u.id === gameId && u.State == "waiting");

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
                setGame(null);  // Reset game if no invitation found
                navigate('/friends');
            }
        });

        // Cleanup the listener when the component unmounts
        return () => unsubscribe();
    }, []);

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


    return (
        <div className="page">
            <div className="page-content notification-page-content">
                {game && state == "waiting" &&
                    <div className="notification notification-page">
                        <div className="alert">
                            <div className="title">{`New Challenge!`}</div>
                            <div className="challenger">{`${challenger}`} <div className="trophies"><img width="16" height="16" src="icons/trophy.png" />{challengerLevel}</div></div>
                        </div>
                        <div className="response">
                            <button className="dull" onClick={() => cancelGame(game)}>X</button>
                            <button onClick={() => startGame(game)}>Accept</button>
                        </div>
                    </div>
                }
            </div>
            <div className="">

            </div>
        </div>
    );
}
