const admin = require('firebase-admin');
const serviceAccount = require("./service-account.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
        };
    }

    try {

        const body = event.body ? JSON.parse(event.body) : null;
        if (!body) {
            throw new Error("Missing or invalid request body");
        }

        const { firebaseUserId, subscription } = JSON.parse(event.body);

        const userRef = db.collection('Users').doc(firebaseUserId);
        await userRef.set({
            subscription: subscription,
        }, { merge: true });

        console.log('Subscription saved successfully to Firestore');

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ message: 'Subscription saved successfully' }),
        };

    } catch (error) {
        console.error('Error saving subscription:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error saving subscription' }),
        };
    }
};
