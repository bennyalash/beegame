const admin = require('firebase-admin');

function getAdmin() {
    if (!admin.apps.length) {
        const accountValue = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!accountValue) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured.');
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(accountValue);
        } catch {
            throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid JSON.');
        }
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    return admin;
}

async function getAuthenticatedUser(event) {
    const token = event.headers?.authorization?.replace(/^Bearer\s+/i, '')
        || event.headers?.Authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw Object.assign(new Error('Authentication required.'), { statusCode: 401 });
    try {
        return await getAdmin().auth().verifyIdToken(token);
    } catch {
        throw Object.assign(new Error('Invalid or expired sign-in. Please sign in again.'), { statusCode: 401 });
    }
}

function jsonResponse(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify(body),
    };
}

module.exports = { getAdmin, getAuthenticatedUser, jsonResponse };
