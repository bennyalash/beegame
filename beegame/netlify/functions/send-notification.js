const webPush = require('web-push');
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require("./service-account.json");

// Set the VAPID keys from environment variables
webPush.setVapidDetails(
    'mailto:bennyalash@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}
const db = admin.firestore();

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
        };
    }

    try {
        const { ToFireBaseUserId, Title, Message, URL } = JSON.parse(event.body);
        console.log(URL);
        const userRef = db.collection('Users').doc(ToFireBaseUserId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'User not found' }),
            };
        }

        const subscription = userDoc.data().subscription;

        if (!subscription) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'No subscription found for user' }),
            };
        }

        const notificationPayload = {
            title: Title,
            body: Message,
            target: URL
        };

        await webPush.sendNotification(subscription, JSON.stringify(notificationPayload));

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };

    } catch (err) {
        console.error('Error sending notification:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
};
