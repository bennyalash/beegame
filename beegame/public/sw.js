self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data?.text() || '' };
    }
    const title = data.title || 'Go Bee';
    const target = typeof data.target === 'string' ? data.target.replace(/^\/+/, '') : '';
    let targetUrl = new URL(target || '/', self.location.origin);
    if (targetUrl.origin !== self.location.origin) targetUrl = new URL('/', self.location.origin);
    event.waitUntil(self.registration.showNotification(title, {
        body: data.body || 'You have a new Go Bee update.',
        icon: '/icons/icon180.png',
        badge: '/icons/icon180.png',
        data: { url: targetUrl.href },
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    let targetUrl = new URL(event.notification.data?.url || '/', self.location.origin);
    if (targetUrl.origin !== self.location.origin) targetUrl = new URL('/', self.location.origin);

    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
        const existingClient = windowClients.find((client) => {
            try {
                return new URL(client.url).origin === targetUrl.origin;
            } catch {
                return false;
            }
        });
        if (existingClient) {
            await existingClient.navigate(targetUrl.href);
            return existingClient.focus();
        }
        return self.clients.openWindow(targetUrl.href);
    }));
});
