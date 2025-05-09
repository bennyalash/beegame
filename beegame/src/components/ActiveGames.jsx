import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { Game } from './Game';
export function ActiveGames({ user }) {
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [challenger, setChallenger] = useState(null);
    const [challengerLevel, setChallengerLevel] = useState(null);
    const [state, setState] = useState(null);
    const [activeGames, setActiveGames] = useState(null);

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


    return (
        <div className="page">
            <div className="page-header page-global">
                <div className="page-logo">
                    <h1 onClick={() => navigate('/')}>{"<"} Back</h1>
                </div>
                <div className="trophies"><img width="20" height="20" src="icons/trophy.png" />{userLevel}</div>
                <p>{user.username}</p>
            </div>
            <div className="page-content">
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
                <br></br>
                <h2>Active Games</h2>
                <div className="game-list">
                    {activeGames && activeGames.length > 0 ? 
                        (<>{activeGames.map(g => {
                            return (
                                <div key={g.id} className="game-list-item">
                                    <div className={`min-game-board${g.Player1 == user.id ? " flip-staged" : ""}`} onClick={() => navigate(`/game/${g.id}`)}>

                                        <Game online={true} p1={g.P1Name} p2={g.P2Name} gameData={g} user={user.id} staged={true} />
                                    </div>
                                    <div className="opponent">
                                        <div className="info">
                                            <div className="username">{g.Player1 == user.id ? g.P2Name : g.P1Name}</div>
                                            <div className="turn">{(g.Player1 == user.id && g.Turn == 1) || (g.Player2 == user.id && g.Turn == 2) ? "Your Turn" : "Waiting for Opponent"}</div>
                                        </div>
                                        <div className="resume">
                                            <button onClick={() => navigate(`/game/${g.id}`)}>Resume Game</button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}</>) : (<><div className="empty">You have no active games.<br></br><br></br><button onClick={() => navigate(`/friends`)}>Challenge a Friend</button></div></>)
                    }
                </div>
            </div>
            <div className="">

            </div>
        </div>
    );
}
