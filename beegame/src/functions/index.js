import { VAPID_PUBLIC_KEY } from "../config";

export async function subscribeToPushNotifications(user) {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');

            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                return permission;
            }

            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: VAPID_PUBLIC_KEY,
                });
            }

            await sendSubscriptionToBackend(user.id, subscription);

            return permission;

        } catch (err) {
            console.error('Push notification subscription failed:', err);
        }
    } else {
        console.error('Push Notifications are not supported by this browser');
    }
}

async function sendSubscriptionToBackend(firebaseUserId, subscription) {
    const response = await fetch('/.netlify/functions/save-subscription', {
        method: 'POST',
        body: JSON.stringify({ firebaseUserId, subscription }),
        headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
        console.log('Subscription saved successfully');
    } else {
        console.error('Failed to save subscription');
    }
}
