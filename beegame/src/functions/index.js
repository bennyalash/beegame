import { VAPID_PUBLIC_KEY } from "../config";

export async function registerPush() {
    // Check if the browser supports service workers and push notifications
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log("Push notifications are not supported in this browser.");
        return;
    }

    try {
        // Register the service worker
        const registration = await navigator.serviceWorker.register('/sw.js');

        // Subscribe the user to push notifications
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true, // Allow notifications to be shown
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY), // Use the public VAPID key
        });

        console.log("Push subscription:", subscription);

        // Send the subscription object to your backend (Netlify function)
        await fetch('/.netlify/functions/save-subscription', {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error("Failed to subscribe to push notifications:", err);
    }
}

// Utility function to convert the public VAPID key to Uint8Array format
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
