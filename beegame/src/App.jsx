import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, provider, signInWithPopup, signOut, db } from './firebase';

import { Home } from './components/Home';
import { Friends } from './components/Friends';
import { Game } from './components/Game';
import { OnlineGame } from './components/OnlineGame';

import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);


    const login = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const fbuser = result.user;

            await addUserIfNotExists(fbuser);

        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    const getUser = (u, udoc) => {
        if (!udoc.exists()) {
            return {
                id: u.uid,
                name: u.displayName || '',
                email: u.email || '',
                photoURL: u.photoURL || '',
                friends: [],
                level: 1000,
                username: u.email.split("@")[0],
                createdAt: new Date().toISOString()
            };
        }
        else {
            return udoc.data()
        }
    }

    const addUserIfNotExists = async (fbuser) => {
        const userDocRef = doc(db, "Users", fbuser.uid);
        const userDoc = await getDoc(userDocRef);
        
        const userData = getUser(fbuser, userDoc);
        setUserData(userData);
        

        setUser(userData);

        if (!userDoc.exists()) {
            await setDoc(userDocRef, userData);
            console.log("New user added to the database.");
        } else {
            console.log("User already exists in the database.");
        }
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
    };

    const [gameKey, setGameKey] = useState(0);
    const rematch = () => {
        setGameKey(prev => prev + 1);
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (fbuser) => {
            if (fbuser) {
                await addUserIfNotExists(fbuser);
            } else {
                setUser(null);
                setUserData(null);
            }
        });

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, []);

    const [mode, setMode] = useState("browser");

    useEffect(() => {
        const updateMode = () => {
            const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
            setMode(isStandalone ? "s" : "x");
        };

        updateMode(); // Initial check
        window.addEventListener("visibilitychange", updateMode); // Detects when app regains focus
        window.addEventListener("resize", updateMode); // Detects when switching to standalone or browser

        return () => {
            window.removeEventListener("visibilitychange", updateMode);
            window.removeEventListener("resize", updateMode);
        };
    }, []);

    return (
        <Router>
            <div className="auth-buttons homescreen">
                {user ? (
                    null) : (
                    <>
                        <img src="icon512.png" />
                        <h1>Go Bee</h1>
                        <button onClick={login}>Google Sign In</button>
                    </>
                )}
            </div>
            {true || mode == "s" ?
                (<Routes>
                    <Route path="/game" element={user ? <Game key={gameKey} onRematch={rematch} user={user} /> : <Navigate to="/" />} />
                    <Route path="/game/:gameId" element={user ? <OnlineGame key={gameKey} user={user} onRematch={rematch} /> : <Navigate to="/" />} />
                    <Route path="/friends" element={user ? <Friends user={user} /> : <Navigate to="/" />} />
                    <Route path="/" element={user ? <Home user={user} logout={logout} /> : <Navigate to="/" />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>) : (
                    <>
                        {user && <><h1 className="basic-instructions" >To Play Go Bee<br></br>Add to Home Screen<br></br><br></br>Watch Tutorial:</h1>
                            <iframe className="youtube" height="50%" style={{ border: "none", aspectRatio: "100/177", margin: "0 auto", borderRadius: "10px" }}
                                src="https://www.youtube.com/embed/DASaHIKKD2Q">
                            </iframe></>}
                    </>)}
        </Router>
    );
}

export default App;
