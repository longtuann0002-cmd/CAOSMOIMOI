// Service Worker for Tiệm Ảnh Nhà Caos - PWA Push Notifications (iOS 16.4+ & Android)
const CACHE_NAME = 'caos-app-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        );
      })
    ])
  );
});

// Handle incoming Web Push from server / FCM / APNs
self.addEventListener('push', (event) => {
  let title = '🔔 Trợ lý vận hành - Tiệm ảnh Nhà Caos';
  let body = 'Bạn có thông báo mới cần kiểm tra!';
  let url = '/';
  let tag = 'caos-push'; // Fixed tag so duplicate pushes replace each other

  if (event.data) {
    try {
      const json = event.data.json();
      if (json.notification) {
        title = json.notification.title || title;
        body = json.notification.body || body;
      }
      if (json.data) {
        title = json.data.title || title;
        body = json.data.body || body;
        url = json.data.url || url;
      }
      if (!json.notification && !json.data) {
        title = json.title || title;
        body = json.body || body;
        url = json.url || url;
      }
      tag = json.tag || tag;
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body: body,
    icon: '/logocaosdt.png',
    badge: '/logocaosdt.png',
    vibrate: [200, 100, 200],
    data: { url },
    tag: tag,
    renotify: true
  };

  const tasks = [self.registration.showNotification(title, options)];

  if ('setAppBadge' in self.navigator) {
    tasks.push(self.navigator.setAppBadge().catch(() => {}));
  }

  event.waitUntil(Promise.all(tasks));
});

// Handle click on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle direct message from App (client-side triggers)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, url } = event.data;
    self.registration.showNotification(title || '🔔 Nhắc nhở vận hành', {
      body: body || 'Kiểm tra đơn thuê trên hệ thống',
      icon: '/logocaosdt.png',
      badge: '/logocaosdt.png',
      vibrate: [200, 100, 200],
      tag: tag || 'local-reminder-' + Date.now(),
      renotify: true,
      data: { url: url || '/' }
    });
  }
});
