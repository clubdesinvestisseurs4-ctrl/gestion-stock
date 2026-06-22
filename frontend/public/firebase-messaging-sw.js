/* eslint-disable no-undef */
// Service worker dédié à Firebase Cloud Messaging, enregistré sur un scope distinct
// (/firebase-cloud-messaging-push-scope) du service worker Workbox généré par
// vite-plugin-pwa, pour coexister sans conflit.
//
// Ce fichier n'est PAS traité par Vite : la config Firebase ne peut donc pas venir
// de import.meta.env. Elle est passée en query string par l'appelant lors de
// l'enregistrement (voir usePushNotifications.js) — ce sont des valeurs publiques
// côté client (protégées par les règles Firestore/App Check, pas par la
// confidentialité), pas des secrets.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const params = new URL(location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Gestion des Stocks', {
    body: body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data || {},
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        return existing.navigate(url);
      }
      return self.clients.openWindow(url);
    })
  );
});
