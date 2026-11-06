const { getAdmin, getAuthenticatedUser, jsonResponse } = require('./admin');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed.' });

    try {
        const caller = await getAuthenticatedUser(event);
        const body = JSON.parse(event.body || '{}');
        const subscription = body.subscription;
        if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
            return jsonResponse(400, { error: 'A valid push subscription is required.' });
        }
        const db = getAdmin().firestore();
        await db.collection('Users').doc(caller.uid).set({
            subscription,
            subscriptions: getAdmin().firestore.FieldValue.arrayUnion(subscription),
        }, { merge: true });
        return jsonResponse(200, { success: true });
    } catch (error) {
        console.error('Error saving push subscription:', error);
        return jsonResponse(error.statusCode || 500, { error: error.statusCode ? error.message : 'Unable to save push subscription.' });
    }
};
