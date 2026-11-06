import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';

export function Home({ logout, user, notificationsStatus, enableNotifications }) {
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [challenger, setChallenger] = useState(null);
    const [challengerLevel, setChallengerLevel] = useState(null);
    const [state, setState] = useState(null);
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [savingEmail, setSavingEmail] = useState(false);
    const [settingsMessage, setSettingsMessage] = useState('');

    useEffect(() => {
        let current = true;
        const unsubscribe = onSnapshot(collection(db, 'Games'), async (snapshot) => {
            const invitation = snapshot.docs
                .map(gameDoc => ({ id: gameDoc.id, ...gameDoc.data() }))
                .find(item => item.Player2 === user.id && item.State === 'waiting');
            if (!invitation) {
                if (current) {
                    setGame(null);
                    setChallenger(null);
                    setChallengerLevel(null);
                    setState(null);
                }
                return;
            }
            try {
                const p1Snap = await getDoc(doc(db, 'Users', invitation.Player1));
                if (current && p1Snap.exists()) {
                    setGame(invitation.id);
                    setChallenger(invitation.P1Name || 'A fellow beekeeper');
                    setChallengerLevel(p1Snap.data().level);
                    setState(invitation.State);
                }
            } catch (error) {
                console.error('Unable to load the challenger profile:', error);
            }
        }, (error) => console.error('Unable to load game invitations:', error));
        return () => { current = false; unsubscribe(); };
    }, [user.id]);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'Users', user.id), (snapshot) => {
            const preferences = snapshot.data()?.notificationPreferences || {};
            setEmailEnabled(preferences.email === true);
            setPushEnabled(preferences.push === true || (preferences.push !== false && notificationsStatus === 'granted'));
        }, (error) => console.error('Unable to load notification preferences:', error));
        return unsubscribe;
    }, [user.id, notificationsStatus]);

    const togglePush = async (event) => {
        const enabled = event.target.checked;
        setSettingsMessage('');
        if (!enabled) {
            try {
                await updateDoc(doc(db, 'Users', user.id), { 'notificationPreferences.push': false });
                setPushEnabled(false);
            } catch (error) {
                setSettingsMessage('Could not save your push preference. Please try again.');
                console.error('Unable to update push preference:', error);
            }
            return;
        }

        const status = notificationsStatus === 'granted' ? 'granted' : await enableNotifications();
        if (status === 'granted') {
            try {
                await updateDoc(doc(db, 'Users', user.id), { 'notificationPreferences.push': true });
                setPushEnabled(true);
            } catch (error) {
                setSettingsMessage('Push is enabled on this device, but your preference could not be saved.');
                console.error('Unable to update push preference:', error);
            }
        } else {
            setPushEnabled(false);
        }
    };

    const toggleEmail = async (event) => {
        const enabled = event.target.checked;
        setEmailEnabled(enabled);
        setSavingEmail(true);
        setSettingsMessage('');
        try {
            await updateDoc(doc(db, 'Users', user.id), {
                email: user.email || '',
                'notificationPreferences.email': enabled,
            });
            setSettingsMessage(enabled ? 'Email notifications enabled.' : 'Email notifications disabled.');
        } catch (error) {
            setEmailEnabled(!enabled);
            setSettingsMessage('Could not save your email preference. Please try again.');
            console.error('Unable to update email notification preference:', error);
        } finally {
            setSavingEmail(false);
        }
    };

    const startGame = async (gameId) => {
        try {
            await updateDoc(doc(db, 'Games', gameId), { State: 'accepted' });
            navigate(`/game/${gameId}`);
        } catch (error) {
            console.error('Error updating game state:', error);
        }
    };

    const cancelGame = async (gameId) => {
        try {
            await deleteDoc(doc(db, 'Games', gameId));
            setGame(null);
        } catch (error) {
            console.error('Error canceling game:', error);
        }
    };

    return (
        <div className="page home-lobby">
            <header className="lobby-topbar">
                <div className="lobby-wordmark">
                    <img src="/icons/hive.png" alt="" />
                    <span>GO BEE</span>
                </div>
                <div className="lobby-profile">
                    <span className="lobby-player-name">{user.username}</span>
                    <span className="lobby-rating"><img src="/icons/trophy.png" alt="" />{user.level}</span>
                </div>
                <button className="lobby-logout" onClick={logout}>Sign out</button>
            </header>

            <main className="home-content lobby-content">
                <section className="lobby-hero" aria-labelledby="lobby-title">
                    <div className="lobby-hero-copy">
                        <span className="lobby-kicker">THE HIVE IS YOURS TO COMMAND</span>
                        <h1 id="lobby-title">Think in hexes.<br /><em>Move like a bee.</em></h1>
                        <p>Outmaneuver your rival, protect your queen, and claim the sweetest victory.</p>
                    </div>
                    <div className="lobby-hero-art" aria-hidden="true">
                        <div className="hero-halo" />
                        <img src="/icons/bees/queen_yellow.png" alt="" />
                    </div>
                </section>

                <nav className="lobby-menu" aria-label="Game modes">
                    <button className="lobby-mode online-mode" onClick={() => navigate('/active')}>
                        <span className="mode-index">01</span>
                        <span className="mode-icon"><img src="/icons/bees/queen_blue.png" alt="" /></span>
                        <span className="mode-copy"><strong>Play online</strong><small>Find a rival or return to a match</small></span>
                        <span className="mode-arrow" aria-hidden="true">→</span>
                    </button>
                    <button className="lobby-mode ai-mode" onClick={() => navigate('/aigame')}>
                        <span className="mode-index">02</span>
                        <span className="mode-icon"><img src="/icons/bees/bee_red.png" alt="" /></span>
                        <span className="mode-copy"><strong>AI challenge</strong><small>Sharpen your strategy against the hive</small></span>
                        <span className="mode-arrow" aria-hidden="true">→</span>
                    </button>
                    <button className="lobby-mode friends-mode" onClick={() => navigate('/friends')}>
                        <span className="mode-index">03</span>
                        <span className="mode-icon"><img src="/icons/person.png" alt="" /></span>
                        <span className="mode-copy"><strong>My friends</strong><small>Challenge your own crew</small></span>
                        <span className="mode-arrow" aria-hidden="true">→</span>
                    </button>
                </nav>

                {game && state === 'waiting' && (
                    <section className="lobby-invitation" aria-label="New game challenge">
                        <div className="invitation-copy">
                            <span className="lobby-kicker">NEW CHALLENGE</span>
                            <strong>{challenger} is calling you out</strong>
                            <span className="invitation-rating"><img src="/icons/trophy.png" alt="" /> {challengerLevel} rating</span>
                        </div>
                        <div className="invitation-actions">
                            <button className="decline-invite" onClick={() => cancelGame(game)} aria-label="Decline challenge">×</button>
                            <button className="accept-invite" onClick={() => startGame(game)}>Accept match</button>
                        </div>
                    </section>
                )}

                <details className="lobby-settings">
                    <summary><span>Player settings</span><small>Push and email alerts</small></summary>
                    <section className="notification-settings" aria-labelledby="notification-heading">
                        <h2 id="notification-heading">Notifications</h2>
                        <label className="email-notification-toggle">
                            <input type="checkbox" checked={pushEnabled} onChange={togglePush} disabled={notificationsStatus === 'denied' || notificationsStatus === 'unsupported' || notificationsStatus === 'insecure'} />
                            <span>Push notifications (browser permission is set per device)</span>
                        </label>
                        {notificationsStatus === 'denied' && <p className="notification-status">Push is blocked in browser settings. Update this site’s permission there to turn it on.</p>}
                        {notificationsStatus === 'unsupported' && <p className="notification-status">This browser does not support push notifications. Email notifications can still be enabled.</p>}
                        {notificationsStatus === 'insecure' && <p className="notification-status">Push notifications require a secure HTTPS connection.</p>}
                        {notificationsStatus === 'error' && <p className="notification-status" role="status">Push setup failed. Check your connection and try again.</p>}
                        <label className="email-notification-toggle">
                            <input type="checkbox" checked={emailEnabled} onChange={toggleEmail} disabled={savingEmail || !user.email} />
                            <span>Email me about friend requests and game challenges</span>
                        </label>
                        {!user.email && <p className="notification-status">No email address is on this account.</p>}
                        {settingsMessage && <p className="notification-status" role="status">{settingsMessage}</p>}
                    </section>
                </details>
            </main>
        </div>
    );
}
