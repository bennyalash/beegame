self.addEventListener('push', function (event) {
    const data = event.data.json();

    self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icons/icon180.png',
        data: {
            url: '/' + data.target
        }
    });
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';
    console.log(targetUrl);

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {

            for (let client of windowClients) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});