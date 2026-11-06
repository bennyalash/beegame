import { auth } from '../firebase';
import { VAPID_PUBLIC_KEY } from '../config';

export async function subscribeToPushNotifications(user) {
    if (!user?.id) return 'error';
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return 'unsupported';
    }
    if (!window.isSecureContext) return 'insecure';

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return permission;
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
        }
        await saveSubscription(user.id, subscription);
        return 'granted';
    } catch (error) {
        console.error('Push notification subscription failed:', error);
        return 'error';
    }
}

export async function refreshPushNotificationStatus(user) {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
    if (!window.isSecureContext) return 'insecure';
    if (Notification.permission !== 'granted') return Notification.permission;
    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const readyRegistration = await navigator.serviceWorker.ready;
        const subscription = await (registration || readyRegistration).pushManager.getSubscription();
        if (!subscription) return 'default';
        await saveSubscription(user.id, subscription);
        return 'granted';
    } catch (error) {
        console.error('Unable to refresh push subscription:', error);
        return 'error';
    }
}

async function saveSubscription(userId, subscription) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Please sign in again before enabling notifications.');
    const response = await fetch('/.netlify/functions/save-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, subscription: subscription.toJSON() }),
    });
    if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Unable to save your push subscription.');
    }
}

function urlBase64ToUint8Array(value) {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return Uint8Array.from(raw, character => character.charCodeAt(0));
}
