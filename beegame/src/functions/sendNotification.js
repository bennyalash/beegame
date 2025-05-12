export async function sendNotification(ToFireBaseUserId, Title, Message, URL) {
    const response = await fetch('/.netlify/functions/send-notification', {
        method: 'POST',
        body: JSON.stringify({ ToFireBaseUserId, Title, Message, URL }),
        headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
        console.log(response);
    } else {
        console.error('Failed to send notification');
    }
}