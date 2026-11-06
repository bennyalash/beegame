const webPush = require('web-push');
const { getAdmin, getAuthenticatedUser, jsonResponse } = require('./admin');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed.' });

    try {
        const caller = await getAuthenticatedUser(event);
        const { targetUserId, title, message, targetPath } = JSON.parse(event.body || '{}');
        if (!targetUserId || !title || !message || typeof targetPath !== 'string') {
            return jsonResponse(400, { error: 'Target, title, message, and target path are required.' });
        }
        const path = targetPath.replace(/^\/+/, '');
        if (path.includes('..') || path.startsWith('http') || path.includes('\\')) {
            return jsonResponse(400, { error: 'Invalid notification target.' });
        }

        const admin = getAdmin();
        const db = admin.firestore();
        const recipientRef = db.collection('Users').doc(targetUserId);
        const [recipientDoc, callerDoc] = await Promise.all([
            recipientRef.get(), db.collection('Users').doc(caller.uid).get(),
        ]);
        if (!recipientDoc.exists || !callerDoc.exists) return jsonResponse(404, { error: 'User not found.' });
        if (caller.uid === targetUserId) return jsonResponse(403, { error: 'You cannot notify yourself.' });

        const recipient = recipientDoc.data();
        const validChallengePath = /^accept\/([^/]+)$/.exec(path);
        let authorized = false;
        if (validChallengePath) {
            const game = await db.collection('Games').doc(validChallengePath[1]).get();
            authorized = game.exists && game.data().Player1 === caller.uid
                && game.data().Player2 === targetUserId && game.data().State === 'waiting';
        } else if (path === 'friends') {
            authorized = (recipient.friendRequestsReceived || []).includes(caller.uid);
        }
        if (!authorized) return jsonResponse(403, { error: 'This notification does not match an active game invitation or friend request.' });

        const outcomes = { push: 'skipped', email: 'skipped' };
        const subscriptions = recipient.subscriptions?.length
            ? recipient.subscriptions
            : (recipient.subscription ? [recipient.subscription] : []);
        if (subscriptions.length && recipient.notificationPreferences?.push !== false) {
            try {
                if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
                    throw new Error('Push delivery is not configured.');
                }
                webPush.setVapidDetails(
                    process.env.VAPID_SUBJECT || 'mailto:bennyalash@gmail.com',
                    process.env.VAPID_PUBLIC_KEY,
                    process.env.VAPID_PRIVATE_KEY,
                );
                const payload = JSON.stringify({
                    title: String(title).slice(0, 100),
                    body: String(message).slice(0, 300),
                    target: path,
                });
                const activeSubscriptions = [];
                for (const subscription of subscriptions) {
                    try {
                        await webPush.sendNotification(subscription, payload);
                        activeSubscriptions.push(subscription);
                    } catch (error) {
                        console.error('Push delivery failed for one device:', error);
                        if (error.statusCode === 404 || error.statusCode === 410) {
                            const expiredUpdate = {
                                subscriptions: admin.firestore.FieldValue.arrayRemove(subscription),
                            };
                            if (recipient.subscription?.endpoint === subscription.endpoint) {
                                expiredUpdate.subscription = admin.firestore.FieldValue.delete();
                            }
                            await recipientRef.update(expiredUpdate);
                            outcomes.push = 'expired';
                        } else {
                            activeSubscriptions.push(subscription);
                            outcomes.push = 'failed';
                        }
                    }
                }
                if (activeSubscriptions.length) {
                    outcomes.push = outcomes.push === 'failed' ? 'partial' : 'sent';
                } else if (outcomes.push !== 'expired') {
                    outcomes.push = 'failed';
                }
            } catch (error) {
                console.error('Push delivery failed:', error);
                outcomes.push = 'failed';
            }
        }

        if (recipient.notificationPreferences?.email === true) {
            if (!recipient.email) {
                outcomes.email = 'no-address';
            } else if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM_EMAIL || !process.env.APP_URL) {
                console.error('Email notifications are opted in but RESEND_API_KEY, NOTIFICATION_FROM_EMAIL, or APP_URL is not configured.');
                outcomes.email = 'not-configured';
            } else {
                try {
                    const appOrigin = new URL(process.env.APP_URL);
                    if (appOrigin.protocol !== 'https:' || appOrigin.pathname !== '/') {
                        throw new Error('APP_URL must be an HTTPS origin without a path.');
                    }
                    const emailResponse = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            from: process.env.NOTIFICATION_FROM_EMAIL,
                            to: [recipient.email],
                            subject: String(title).slice(0, 100),
                            text: `${String(message).slice(0, 1000)}\n\nOpen Go Bee: ${appOrigin.origin}/${path}`,
                        }),
                    });
                    if (!emailResponse.ok) throw new Error(`Resend returned HTTP ${emailResponse.status}.`);
                    outcomes.email = 'sent';
                } catch (error) {
                    console.error('Email delivery failed:', error);
                    outcomes.email = 'failed';
                }
            }
        }

        const success = outcomes.push === 'sent' || outcomes.email === 'sent';
        return jsonResponse(success ? 200 : 503, {
            success,
            channels: outcomes,
            ...(!success ? { error: 'No notification channel could deliver this message.' } : {}),
        });
    } catch (error) {
        console.error('Error sending notification:', error);
        return jsonResponse(error.statusCode || 500, { error: error.statusCode ? error.message : 'Unable to send notification.' });
    }
};
