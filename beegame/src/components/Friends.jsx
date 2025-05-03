import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import "../online.css";

export function Friends({ logout, user }) {
    const navigate = useNavigate();
    const [allUsers, setAllUsers] = useState([]);
    const [userData, setUserData] = useState(null);

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

            console.log('Friend request sent to', targetid);
        }/* catch (error) {
            console.error('Error sending friend request:', error);
        }*/
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

    return (
        <div className="online">
            <button onClick={() => navigate('/')}>Back to Menu</button>

            <div className="online-section">
                <h1>Challenge a Friend</h1>
                <div className="friends">
                    {(userData?.friends || []).map(friendid => {
                        const friend = allUsers.find(u => u.id === friendid);
                        if (!friend) return null;
                        return (
                            <div key={friend.id} className="friend">
                                <div className="username">{friend.name || friend.email}</div>
                                <div className="challenge">
                                    <button onClick={() => sendChallenge(friend.id, friend.username) }>Challenge</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="online-section">
                <h1>Pending Requests</h1>
                <div className="friends">
                    {(userData?.friendRequestsReceived || []).map(requestid => {
                        const requester = allUsers.find(u => u.id === requestid);
                        if (!requester) return null;
                        return (
                            <div key={requester.id} className="friend">
                                <div className="username">{requester.name || requester.email}</div>
                                <div className="challenge">
                                    <button onClick={() => acceptFriendRequest(requester.id)}>Accept</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="online-section">
                <h1>User Search</h1>
                <input type="text" placeholder="Search by name..." />
                <br /><br />
                <div className="friends">
                    {allUsers.map(u => {
                        if (
                            (userData?.friends || []).includes(u.id) ||
                            (userData?.friendRequestsSent || []).includes(u.id) ||
                            (userData?.friendRequestsReceived || []).includes(u.id)
                        ) {
                            return null;
                        }
                        return (
                            <div key={u.id} className="friend">
                                <div className="username">{u.name || u.email}</div>
                                <div className="challenge">
                                    <button onClick={() => sendFriendRequest(u.id)}>Add Friend</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
