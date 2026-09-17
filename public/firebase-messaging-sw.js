// Firebase Messaging Service Worker for Tiệm Ảnh Nhà Caos
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Cache name for PWA
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

try {
  firebase.initializeApp({
    apiKey: "AIzaSyA33_97jLHcuEz2TGHBpOeo2RS3y1VAnAE",
    authDomain: "tiem-anh-nha-caos-d827f.firebaseapp.com",
    projectId: "tiem-anh-nha-caos-d827f",
    storageBucket: "tiem-anh-nha-caos-d827f.firebasestorage.app",
    messagingSenderId: "449788423673",
    appId: "1:449788423673:web:8488b804d60d63a68d2128"
  });

  const messaging = firebase.messaging();

  // Handle background FCM push messages (app closed / in background)
  // NOTE: Do NOT importScripts('/sw.js') — that would register a duplicate 'push' listener
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || '🔔 Tiệm Ảnh Nhà Caos';
    const body = payload.notification?.body || payload.data?.body || 'Bạn có thông báo mới!';

    // Use fixed tag 'caos-push' so duplicate FCM pushes replace each other
    self.registration.showNotification(title, {
      body: body,
      icon: '/logocaosdt.png',
      badge: '/logocaosdt.png',
      vibrate: [200, 100, 200],
      data: { url: payload.data?.url || '/' },
      tag: 'caos-push',
      renotify: true
    });
  });
} catch (e) {
  console.warn('[firebase-messaging-sw] Init error:', e);
}

// Handle notification click
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
