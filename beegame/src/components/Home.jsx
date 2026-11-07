import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ThreeAppCanvas } from './ThreeAppCanvas';

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

    const togglePush = async () => {
        const enabled = !pushEnabled;
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

    const toggleEmail = async () => {
        const enabled = !emailEnabled;
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

    return <ThreeAppCanvas
        view="home"
        user={user}
        data={{
            invitation: game && state === 'waiting' ? { id: game, name: challenger, level: challengerLevel } : null,
            notificationsStatus,
            pushEnabled,
            emailEnabled,
            savingEmail,
            settingsMessage,
        }}
        actions={{
            home: () => navigate('/'),
            active: () => navigate('/active'),
            friends: () => navigate('/friends'),
            recent: () => navigate('/recent'),
            playOnline: () => navigate('/active'),
            playAI: () => navigate('/aigame'),
            playLocal: () => navigate('/game'),
            togglePush,
            toggleEmail,
            acceptInvite: () => game && startGame(game),
            declineInvite: () => game && cancelGame(game),
            logout,
        }}
    />;
}
