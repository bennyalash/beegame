import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import AppHeader from './AppHeader';
export function RecentGames({ user }) {
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [challenger, setChallenger] = useState(null);
    const [challengerLevel, setChallengerLevel] = useState(null);
    const [state, setState] = useState(null);
    const [recentGames, setRecentGames] = useState(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'Games'), (snapshot) => {
            const games = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const RecentGames = games.filter(
                g => (g.Player1 === user.id || g.Player2 === user.id) && g.State === "finished"
            );
            console.log(RecentGames);
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


    return (
        <div className="page games-page recent-games-page">
            <AppHeader user={user} level={userLevel} pageTitle="Recent games" onHome={() => navigate('/')} />
            <div className="page-content games-content recent-games-content">
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
                <section className="page-section game-list-section">
                <h2>Recent Games</h2>
                <div className="game-list">
                    {recentGames && recentGames?.length > 0 ?
                        (<>{recentGames.map(g => {

                            const win = (g.Player1 === user.id && g.Winner === "Red")
                                || (g.Player2 === user.id && g.Winner === "Blue");
                            const ratingChange = Number(win ? g.WinnerChange : g.LoserChange) || 0;

                            return (
                                <div key={g.id} className="recent-game-list-item">
                                    <div className="opponent">
                                        <div className="result">
                                            <div className={`winorlose ${win ? "win" : "lose"}`}>{win ? "+" : "-"}</div>
                                        </div>
                                        <div className="info">
                                            <div className="username">{g.Player1 == user.id ? g.P2Name : g.P1Name}</div>
                                        </div>
                                        <div className="reason">
                                            <div className="">By {g.WinType}</div>
                                        </div>
                                        
                                        <div className="trophies">
                                            <div>{ratingChange > 0 ? "+" : ""}{ratingChange}</div> <img src="/icons/trophy.png" width="20" alt="" />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}</>) : (<><div className="empty">You haven't finished any games yet.<br></br><br></br><button onClick={() => navigate(`/active`)}>View Games</button></div></>)
                    }
                </div>
                </section>
            </div>
            <div className="">

            </div>
        </div>
    );
}
