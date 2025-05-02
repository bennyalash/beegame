import { useState, useEffect } from 'react';
import './App.css';
import { Game } from './components/Game';
import { auth, provider, signInWithPopup, signOut } from './firebase';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './components/Home';

function App() {
    const [user, setUser] = useState(null);

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


    const login = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            setUser(result.user);
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();
    }, []);
    console.log(user);
    const [gameKey, setGameKey] = useState(0);
    const rematch = () => {
        setGameKey(prev => prev + 1);
    };
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
                    <Route path="/game" element={user ? <Game key={gameKey} onRematch={rematch} /> : <Navigate to="/" />} />
                    <Route path="/" element={user ? <Home logout={logout} /> : <Navigate to="/" />} />
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
