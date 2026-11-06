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
        const unsubscribe = onSnapshot(collection(db, 'Games'), (snapshot) => {
            const invitation = snapshot.docs
                .map(gameDoc => ({ id: gameDoc.id, ...gameDoc.data() }))
                .find(item => item.Player2 === user.id && item.State === 'waiting');
            if (!invitation) {
                setGame(null);
                return;
            }
            (async () => {
                const p1Snap = await getDoc(doc(db, 'Users', invitation.Player1));
                if (p1Snap.exists()) {
                    setGame(invitation.id);
                    setChallenger(invitation.P1Name);
                    setChallengerLevel(p1Snap.data().level);
                    setState(invitation.State);
                }
            })();
        }, (error) => console.error('Unable to load game invitations:', error));
        return unsubscribe;
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
        } catch (error) {
            console.error('Error canceling game:', error);
        }
    };

    return (
        <div className="page">
            <div className="page-header page-global">
                <div className="page-logo"><h1>Go Bee</h1></div>
                <div className="trophies"><img width="20" height="20" src="/icons/trophy.png" alt="" />{user.level}</div>
                <p>{user.username}</p>
            </div>
            <div className="home-content">
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

                {game && state === 'waiting' && (
                    <div className="notification">
                        <div className="alert">
                            <div className="title">New Challenge!</div>
                            <div className="challenger">{challenger} <div className="trophies"><img width="16" height="16" src="/icons/trophy.png" alt="" />{challengerLevel}</div></div>
                        </div>
                        <div className="response">
                            <button className="dull" onClick={() => cancelGame(game)} aria-label="Decline challenge">X</button>
                            <button onClick={() => startGame(game)}>Accept</button>
                        </div>
                    </div>
                )}

                <div className="auth-buttons homescreen">
                    <button onClick={() => navigate('/active')}>Play Online</button>
                    <button onClick={() => navigate('/friends')}>My Friends</button>
                    <button onClick={() => navigate('/aigame')}>AI Challenge</button>
                    <div className="button-holder dull"><button onClick={logout}>Logout</button></div>
                </div>
            </div>
        </div>
    );
}
