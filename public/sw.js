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
  let data = {
    title: '🔔 Trợ lý vận hành - Tiệm ảnh Nhà Caos',
    body: 'Bạn có thông báo mới cần kiểm tra!',
    url: '/'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logocaosdt.png',
    badge: data.badge || '/logocaosdt.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    tag: data.tag || 'caos-reminder-' + Date.now(),
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle click on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
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
