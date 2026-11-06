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
        if (window.confirm('Are you sure you want to log out?')) {
            await signOut(auth);
            setUser(null);
        }
    };

    if (isLoading) return <main className="app-loading" aria-live="polite">
        <img className="loading-hive" src="/icons/hive.png" alt="" />
        <div className="loading-title">GO BEE</div>
        <div className="loading-subtitle">Setting up the hive</div>
        <div className="loading-track" aria-hidden="true"><span /></div>
    </main>;

    return (
        <Router>
            {user ? null : (
                <div className="page login-screen">
                    <header className="login-topbar">
                        <div className="login-wordmark"><img src="/icons/hive.png" alt="" /><span>GO BEE</span></div>
                        <span className="login-topline">A STRATEGY GAME FOR YOUR NEXT MOVE</span>
                    </header>
                    <main className="login-stage">
                        <section className="login-copy">
                            <span className="login-kicker">WELCOME TO THE HIVE</span>
                            <h1>Outthink your rival.<br /><em>Own the board.</em></h1>
                            <p>Every bee has a purpose. Every card changes the map. Protect your queen and close in for the win.</p>
                            <button className="login-google-button" onClick={login}>
                                <span className="google-mark" aria-hidden="true">G</span>
                                <span>Continue with Google</span>
                                <span className="login-arrow" aria-hidden="true">→</span>
                            </button>
                            {loginError && <p className="login-error" role="alert">{loginError}</p>}
                            <span className="login-secure-note">Secure sign-in · Your progress follows your account</span>
                        </section>
                        <div className="login-art" aria-hidden="true">
                            <div className="login-orbit orbit-one" />
                            <div className="login-orbit orbit-two" />
                            <div className="login-hex hex-one" />
                            <div className="login-hex hex-two" />
                            <img className="login-queen" src="/icons/bees/queen_yellow.png" alt="" />
                            <div className="login-board-chip"><span className="login-chip-dot" /> THE HIVE AWAITS</div>
                        </div>
                    </main>
                    <footer className="login-footer">
                        <span>Play right in your browser</span>
                        <span className="login-footer-divider" />
                        <span>No desktop download required</span>
                        <span className="login-footer-divider" />
                        <span>Add to your home screen whenever you like</span>
                    </footer>
                </div>
            )}

            <Routes>
                <Route path="/game" element={user ? <Game key={gameKey} onRematch={() => setGameKey(key => key + 1)} user={user} /> : <Navigate to="/" />} />
                <Route path="/aigame" element={user ? <AIGame key={gameKey} /> : <Navigate to="/" />} />
                <Route path="/game/:gameId" element={user ? <OnlineGame key={gameKey} user={user} onRematch={() => setGameKey(key => key + 1)} /> : <Navigate to="/" />} />
                <Route path="/friends" element={user ? <Friends user={user} sendNotification={sendNotification} /> : <Navigate to="/" />} />
                <Route path="/active" element={user ? <ActiveGames user={user} /> : <Navigate to="/" />} />
                <Route path="/recent" element={user ? <RecentGames user={user} /> : <Navigate to="/" />} />
                <Route path="/accept/:gameId" element={user ? <Accept /> : <Navigate to="/" />} />
                <Route path="/" element={user ? <Home enableNotifications={enableNotifications} notificationsStatus={notificationsStatus} user={user} logout={logout} /> : null} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;
