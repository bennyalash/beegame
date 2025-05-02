import { useState, useEffect } from 'react';
import './App.css';
import { Game } from './components/Game';
import { auth, provider, signInWithPopup, signOut } from './firebase';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './components/Home';

function App() {
    const [user, setUser] = useState(null);

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
    return (
        <Router>
            <div className="auth-buttons">
                {user ? (
null                ): (
                    <>
                        <h1>Go Bee</h1>
                        <button onClick={login}>Google Sign In</button>
                    </>
                )}
            </div>

            <Routes>
                <Route path="/game" element={user ? <Game /> : <Navigate to="/" />} />
                <Route path="/" element={user ? <Home logout={logout} /> : <Navigate to="/" />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
}

export default App;
