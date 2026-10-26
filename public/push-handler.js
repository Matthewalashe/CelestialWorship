/* Loaded into the service worker (workbox importScripts). Shows push notifications
   sent by the send-reminders Edge Function and opens the right page when tapped. */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'CelestialWorship', body: event.data && event.data.text() }; }
  const title = data.title || 'CelestialWorship';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    tag: data.tag,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: data.url || '/' },
    // An hourly prayer set as an alarm stays until it is opened
    requireInteraction: !!data.alarm,
    vibrate: data.alarm ? [600, 300, 600, 300, 600, 300, 600] : [200, 100, 200],
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(url);
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
