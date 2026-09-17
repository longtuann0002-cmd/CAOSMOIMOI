// Firebase Messaging Service Worker for Tiệm Ảnh Nhà Caos
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

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

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || '🔔 Tiệm Ảnh Nhà Caos';
    const body = payload.notification?.body || payload.data?.body || 'Bạn có thông báo mới!';
    
    self.registration.showNotification(title, {
      body: body,
      icon: '/logocaosdt.png',
      badge: '/logocaosdt.png',
      vibrate: [200, 100, 200],
      data: { url: payload.data?.url || '/' },
      tag: 'caos-fcm-' + Date.now(),
      renotify: true
    });
  });
} catch (e) {
  console.warn('[firebase-messaging-sw] Init error:', e);
}

// Also import base sw.js logic
importScripts('/sw.js');
