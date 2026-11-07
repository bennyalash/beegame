import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, addDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ThreeAppCanvas } from './ThreeAppCanvas';

export function Friends({ user, sendNotification }) {
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
                .filter(user => (user.username || user.name || '').toLowerCase().includes(search))
                .sort((a, b) => {
                    const aName = (a.username || a.name || '').toLowerCase();
                    const bName = (b.username || b.name || '').toLowerCase();

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

            await sendNotification(targetid, "New Friend Request!", user.username + " has sent you a friend request", "friends")
                .catch(error => console.error('Friend request notification failed:', error));
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
            

            const cards = [
                { name: "1", moves: [{ x: 0, y: -2 }, { x: 0, y: 1 }] },
                { name: "2", moves: [{ x: -2, y: 0 }, { x: -1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: -2 }] },
                { name: "3", moves: [{ x: 0, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 0 }] },
                { name: "4", moves: [{ x: 0, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 0 }] },
                { name: "5", moves: [{ x: 0, y: -1 }, { x: 2, y: -1 }, { x: -2, y: 1 }] },
                { name: "6", moves: [{ x: -2, y: 1 }, { x: -1, y: 0 }, { x: 1, y: -1 }, { x: 2, y: -1 }] },
                { name: "7", moves: [{ x: -1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: -1 }] },
                { name: "8", moves: [{ x: 0, y: -1 }, { x: 0, y: 1 }] },
                { name: "9", moves: [{ x: -1, y: 0 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: 1, y: 0 }] },
                { name: "10", moves: [{ x: -1, y: -1 }, { x: 1, y: -2 }] }
            ];

            function shuffle(array) {
                const arr = [...array];
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
                return arr;
            }

            // Shuffle and pick the first 5
            const shuffled = shuffle(cards);
            const defaultCards = shuffled.slice(0, 5);

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
            await sendNotification(challengedUid, "You've been challenged!", user.username + " has challenged you to a game", `accept/${gameRef.id}`)
                .catch(error => console.error('Game challenge notification failed:', error));
            console.log(`active/${gameRef.id}`);
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

    const friends = (userData?.friends || [])
        .map((friendId) => allUsers.find((candidate) => candidate.id === friendId))
        .filter(Boolean);
    const requests = (userData?.friendRequestsReceived || [])
        .map((requestId) => allUsers.find((candidate) => candidate.id === requestId))
        .filter((requester) => requester && !(userData?.friends || []).includes(requester.id));
    const receivedIds = userData?.friendRequestsReceived || [];
    const filtered = filteredUsers
        .filter((candidate) => !(userData?.friends || []).includes(candidate.id) && !receivedIds.includes(candidate.id))
        .map((candidate) => ({
            ...candidate,
            requestSent: (userData?.friendRequestsSent || []).includes(candidate.id),
        }));

    return <ThreeAppCanvas
        view="friends"
        user={user}
        searchValue={userSearch}
        onSearchChange={setUserSearch}
        data={{
            friendUsers: friends,
            requestUsers: requests,
            filteredUsers: filtered,
            invitation: game && state === 'waiting' ? { id: game, name: challenger } : null,
        }}
        actions={{
            home: () => navigate('/'),
            active: () => navigate('/active'),
            friends: () => navigate('/friends'),
            recent: () => navigate('/recent'),
            sendFriendRequest: (payload) => sendFriendRequest(payload?.id),
            acceptFriendRequest,
            sendChallenge: (payload) => sendChallenge(payload?.id, payload?.name),
            acceptInvite: () => game && startGame(game),
            declineInvite: () => game && cancelGame(game),
        }}
    />;
}
