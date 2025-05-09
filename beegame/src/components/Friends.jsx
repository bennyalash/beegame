import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, addDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import "../online.css";

export function Friends({ logout, user }) {
    const navigate = useNavigate();
    const [allUsers, setAllUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [userSearch, setUserSearch] = useState("");
    const [userData, setUserData] = useState(null);

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
            const invitation = games.find(u => u.Player2 === user.id && u.State === "waiting");

            if (invitation) {
                const gameId = invitation.id;
                setGame(gameId);
                setChallenger(invitation.P1Name);
                setState(invitation.State);
            } else {
                setGame(null);  // Reset game if no invitation found
            }
        });

        // Cleanup the listener when the component unmounts
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const snapshot = await getDocs(collection(db, 'Users'));
                const users = snapshot.docs.map(doc => doc.data());
                const currentUser = users.find(u => u.id === user.id);
                setUserData(currentUser);
                setAllUsers(users.filter(u => u.id !== user.id));

            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };

        if (user) {
            fetchData();
        }
    }, [user]);

    useEffect(() => {
        if (userSearch.length > 0) {
            const search = userSearch.toLowerCase();

            const filtered = allUsers
                .filter(user => user.username?.toLowerCase().includes(search))
                .sort((a, b) => {
                    const aName = a.username.toLowerCase();
                    const bName = b.username.toLowerCase();

                    // Prioritize exact match > startsWith > includes
                    if (aName === search) return -1;
                    if (bName === search) return 1;
                    if (aName.startsWith(search) && !bName.startsWith(search)) return -1;
                    if (!aName.startsWith(search) && bName.startsWith(search)) return 1;
                    return 0;
                })
                .slice(0, 3); // Get top 3

            setFilteredUsers(filtered);
        } else {
            setFilteredUsers([]);
        }
    }, [userSearch, allUsers]);


    const sendFriendRequest = async (targetid) => {
         {
            const userDocRef = doc(db, 'Users', user.id);
            console.log(targetid);
            const targetDocRef = doc(db, 'Users', targetid);

            // Defensive fallback to avoid 'undefined'
            const sent = user.friendRequestsSent || [];
            const received = user.friendRequestsReceived || [];
            const confirmed = user.friends || [];

            if (
                sent.includes(targetid) ||
                received.includes(targetid) ||
                confirmed.includes(targetid)
            ) {
                console.log('Request already exists or you are already friends.');
                return;
            }

            // Update sender
            await updateDoc(userDocRef, {
                friendRequestsSent: arrayUnion(targetid)
            });

            // Update receiver
            await updateDoc(targetDocRef, {
                friendRequestsReceived: arrayUnion(user.id)
            });

            setUserData(prev => ({
                ...prev,
                friendRequestsSent: [...(prev.friendRequestsSent || []), targetid]
            }));
        }
    };

    const acceptFriendRequest = async (fromid) => {
        try {
            const currentRef = doc(db, 'Users', user.id);
            const fromRef = doc(db, 'Users', fromid);

            await updateDoc(currentRef, {
                friends: arrayUnion(fromid),
                friendRequestsReceived: arrayRemove(fromid)
            });

            await updateDoc(fromRef, {
                friends: arrayUnion(user.id),
                friendRequestsSent: arrayRemove(user.id)
            });

            setUserData(prev => ({
                ...prev,
                friends: [...(prev.friends || []), fromid],
                friendRequestsReceived: (prev.friendRequestsReceived || []).filter(id => id !== fromid)
            }));
        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    };
    const sendChallenge = async (challengedUid, challengedName) => {
        try {
            const defaultCards = [
                { name: "1", moves: [{ x: 0, y: -2 }, { x: 0, y: 1 }] },
                { name: "2", moves: [{ x: -2, y: 0 }, { x: -1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: -2 }] },
                { name: "3", moves: [{ x: 0, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 0 }] },
                { name: "4", moves: [{ x: 0, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 0 }] },
                { name: "5", moves: [{ x: 0, y: -1 }, { x: 2, y: -1 }, { x: -2, y: 1 }] }
            ];

            const defaultPieces = [
                { id: 'p1-queen', player: 1, type: 'queen', position: { x: 0, y: -2 } },
                { id: 'p1-pawn1', player: 1, type: 'pawn', position: { x: -1, y: -1 } },
                { id: 'p1-pawn2', player: 1, type: 'pawn', position: { x: 1, y: -2 } },
                { id: 'p2-queen', player: 2, type: 'queen', position: { x: 0, y: 2 } },
                { id: 'p2-pawn1', player: 2, type: 'pawn', position: { x: -1, y: 2 } },
                { id: 'p2-pawn2', player: 2, type: 'pawn', position: { x: 1, y: 1 } }
            ];

            const gameData = {
                Cards: defaultCards,
                Pieces: defaultPieces,
                Player1: user.id,
                P1Name: user.username,
                Player2: challengedUid,
                P2Name: challengedName,
                State: "waiting",
                Winner: "",
                Turn: 1,
                LMS: [],
                LME: [],
                WinType: ""
            };

            const gameRef = await addDoc(collection(db, "Games"), gameData);
            navigate(`/game/${gameRef.id}`);
        } catch (error) {
            console.error("Error sending challenge:", error);
        }
    };

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
            {game && state == "waiting" &&
                <div className="notification">
                    <div className="alert">
                        <div className="title">{`New Challenge!`}</div>
                        <div className="challenger">{`${challenger}`} <div className="trophies"><img width="16" height="16" src="icons/trophy.png" />800</div></div>
                    </div>
                    <div className="response">
                        <button className="dull" onClick={() => cancelGame(game)}>X</button>
                        <button onClick={() => startGame(game)}>Accept</button>
                    </div>
                </div>
            }
            <div className="page-header page-global">
                <div className="page-logo">
                    <h1 onClick={() => navigate('/')}>{"<"} Back</h1>
                </div>
                <div className="trophies"><img width="20" height="20" src="icons/trophy.png" />{user.level}</div>
                <p>{user.username}</p>
            </div>
            <div className="page-content">
                 <div className="page-section">
                    <input id="userSearch" type="text" placeholder="Search by username" value={userSearch} onInput={(e) => setUserSearch(e.target.value)} />
                    {filteredUsers.length > 0 &&<div className="friends search">
                        {filteredUsers.map(u => {
                            if (
                                (userData?.friends || []).includes(u.id) ||
                                (userData?.friendRequestsReceived || []).includes(u.id)
                            ) {
                                return null;
                            }
                            return (
                                <div key={u.id} className="friend">
                                    <div className="friendname">
                                        <div className="username">{u.username}</div>
                                        <div className="fullname">{u.name || u.email}</div>
                                        <div className="trophies"><img width="16" height="16" src="icons/trophy.png" />{u.level}</div>
                                    </div>
                                    <div className="challenge">
                                        {!(userData?.friendRequestsSent || []).includes(u.id) && <button onClick={() => sendFriendRequest(u.id)}>Add</button>}
                                        {(userData?.friendRequestsSent || []).includes(u.id) && <button className="disabledButton">Sent</button>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>}
                </div>
                <div className="page-section">
                    <h2>Friends{userData?.friends.length > 0 && <span className="friend-count">{userData?.friends.length || 0}</span>}</h2>
                    {userData?.friends.length > 0 ?
                        (<div className="friends">
                            {(userData?.friends || []).map(friendid => {
                                const friend = allUsers.find(u => u.id === friendid);
                                if (!friend) return null;
                                return (
                                    <div key={friend.id} className="friend">
                                        <div className="friendname">
                                            <div className="username">{friend.username}</div>
                                            <div className="fullname">{friend.name || friend.email}</div>
                                            <div className="trophies"><img width="16" height="16" src="icons/trophy.png" />{friend.level}</div>
                                        </div>
                                        <div className="challenge">
                                            <button onClick={() => sendChallenge(friend.id, friend.username)}><img width="30" height="30" src="icons/hive.png" /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>) : (<div className="friends empty">Add some friends.</div>)}
                </div>
            
            <div className="page-section">
                <h2>Friend Requests</h2>
                    {userData?.friendRequestsReceived.length > 0 ?
                        (<div className="friends requests">
                            {(userData?.friendRequestsReceived || []).map(requestid => {
                                const requester = allUsers.find(u => u.id === requestid);
                                if (!requester) return null;
                                if (
                                    (userData?.friends || []).includes(requester.id)
                                ) {
                                    return null;
                                }
                                return (
                                    <div key={requester.id} className="friend">
                                        <div className="friendname">
                                            <div className="username">{requester.username}</div>
                                            <div className="fullname">{requester.name || friend.email}</div>
                                            <div className="trophies"><img width="16" height="16" src="icons/trophy.png" />{requester.level}</div>
                                        </div>
                                        <div className="challenge">
                                            <button onClick={() => acceptFriendRequest(requester.id)}>Accept</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                            ): (<div className="friends request empty">No friend requests at this time.</div>)}
                
            </div>

    

            </div>
            <div className="page-footer page-global">

            </div>
        </div>
    );
}
