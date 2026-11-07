import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, provider, signInWithPopup, signOut, db } from './firebase';

import { Home } from './components/Home';
import { Friends } from './components/Friends';
import { Game } from './components/Game';
import { AIGame } from './components/AIGame';
import { OnlineGame } from './components/OnlineGame';
import { ActiveGames } from './components/ActiveGames';
import { RecentGames } from './components/RecentGames';
import { subscribeToPushNotifications, refreshPushNotificationStatus } from './functions/index';
import { sendNotification } from './functions/sendNotification';
import { Accept } from './components/Accept';
import { ThreeAppCanvas } from './components/ThreeAppCanvas';

import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notificationsStatus, setNotificationsStatus] = useState('default');
    const [gameKey, setGameKey] = useState(0);
    const [loginError, setLoginError] = useState('');

    const addUserIfNotExists = useCallback(async (fbuser) => {
        const userDocRef = doc(db, 'Users', fbuser.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {
            id: fbuser.uid,
            name: fbuser.displayName || '',
            email: fbuser.email || '',
            photoURL: fbuser.photoURL || '',
            friends: [],
            level: 1000,
            username: fbuser.email?.split('@')[0] || fbuser.displayName || 'bee',
            createdAt: new Date().toISOString(),
        };

        if (!userDoc.exists()) {
            await setDoc(userDocRef, userData);
        }
        setUser(userData);
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (fbuser) => {
            try {
                if (fbuser) {
                    await addUserIfNotExists(fbuser);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error('Unable to load your account:', error);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        });
        return unsubscribe;
    }, [addUserIfNotExists]);

    useEffect(() => {
        if (!user) return;
        let active = true;
        refreshPushNotificationStatus(user).then((status) => {
            if (active) setNotificationsStatus(status);
        });
        return () => { active = false; };
    }, [user]);

    const enableNotifications = async () => {
        const result = await subscribeToPushNotifications(user);
        setNotificationsStatus(result);
        return result;
    };

    const login = async () => {
        setLoginError('');
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Login failed:', error);
            setLoginError(error?.code === 'auth/popup-blocked'
                ? 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.'
                : 'Sign-in could not be completed. Please try again.');
        }
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
    };

    if (isLoading) return <ThreeAppCanvas view="loading" />;

    return (
        <Router>
            {user ? null : <ThreeAppCanvas view="login" actions={{ login }} loginError={loginError} />}

            <Routes>
                <Route path="/game" element={user ? <Game key={gameKey} onRematch={() => setGameKey(key => key + 1)} user={user} /> : <Navigate to="/" />} />
                <Route path="/aigame" element={user ? <AIGame key={gameKey} onRematch={() => setGameKey(key => key + 1)} /> : <Navigate to="/" />} />
                <Route path="/game/:gameId" element={user ? <OnlineGame key={gameKey} user={user} onRematch={() => setGameKey(key => key + 1)} /> : <Navigate to="/" />} />
                <Route path="/friends" element={user ? <Friends user={user} sendNotification={sendNotification} /> : <Navigate to="/" />} />
                <Route path="/active" element={user ? <ActiveGames user={user} /> : <Navigate to="/" />} />
                <Route path="/recent" element={user ? <RecentGames user={user} /> : <Navigate to="/" />} />
                <Route path="/accept/:gameId" element={user ? <Accept user={user} /> : <Navigate to="/" />} />
                <Route path="/" element={user ? <Home enableNotifications={enableNotifications} notificationsStatus={notificationsStatus} user={user} logout={logout} /> : null} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;
