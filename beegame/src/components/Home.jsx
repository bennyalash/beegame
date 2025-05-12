import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';

export function Home({ logout, user, sendNotification, notificationsDenied, enableNotifications }) {
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [challenger, setChallenger] = useState(null);
    const [challengerLevel, setChallengerLevel] = useState(null);
    const [state, setState] = useState(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'Games'), (snapshot) => {
            const games = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Find the invitation for the current user
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


    return (
        <div className="page">
            <div className="page-header page-global">
                <div className="page-logo">
                    <h1>Go Bee</h1>
                </div>
                <div className="trophies"><img width="20" height="20" src="icons/trophy.png" />{userLevel}</div>
            <p>{user.username}</p>
            </div>
            <div className="auth-buttons homescreen">
                <div className="warning">
                    {notificationsDenied == "denied" && <div className="notificationsDenied">Please turn on Notifications for this App</div>}
                </div>
                {notificationsDenied && notificationsDenied != "denied" && notificationsDenied != "granted" && <button onClick={() => enableNotifications()}>Enable Notifications</button>}
                <br></br>
                <button onClick={() => navigate('/active')}>Play</button>
                <button onClick={() => navigate('/friends')}>Friends</button>
                <button onClick={() => navigate('/game')}>Pass & Play</button>
                <div className="button-holder dull">
                    <button onClick={() => logout()}>Logout</button>
                </div>
                {game && state == "waiting" &&
                    <div className="notification">
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
