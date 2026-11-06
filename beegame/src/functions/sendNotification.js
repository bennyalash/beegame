import { auth } from '../firebase';

export async function sendNotification(targetUserId, title, message, targetPath) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sign in is required to send a notification.');

    const response = await fetch('/.netlify/functions/send-notification', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId, title, message, targetPath }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.error || 'Unable to send notification.');
    }
    return result;
}
