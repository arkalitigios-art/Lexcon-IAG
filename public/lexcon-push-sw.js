self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'LEXCON IAG', {
    body: data.body || 'Tiene una actuación pendiente.',
    icon: '/lexcon-icon.svg',
    badge: '/lexcon-icon.svg',
    data: { url: data.url || '/dashboard' },
    tag: data.tag || 'lexcon-alert',
    renotify: true,
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/dashboard'));
});