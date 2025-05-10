// netlify/functions/save-subscription.js
let subscriptions = []; // In-memory storage for simplicity

exports.handler = async function (event) {
    const sub = JSON.parse(event.body); // Parse the incoming subscription object
    subscriptions.push(sub); // Store the subscription (replace with DB storage in production)

    console.log('Saved subscription:', sub);

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
    };
};