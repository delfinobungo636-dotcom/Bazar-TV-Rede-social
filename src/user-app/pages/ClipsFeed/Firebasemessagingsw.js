// ==========================================
// public/firebase-messaging-sw.js
//
// Este ficheiro TEM de ficar em public/ (raiz do site, acessível em
// https://teudominio.com/firebase-messaging-sw.js) — não pode ir para
// dentro de src/, senão o browser não o encontra.
//
// IMPORTANTE: substitui os valores abaixo pelos MESMOS que usas no teu
// src/shared/services/firebase.ts. Um service worker não consegue
// importar o teu ficheiro de config normal, por isso duplicamos aqui
// (são valores públicos do Firebase, não são segredo).
// ==========================================
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '<A_TUA_API_KEY>',
  authDomain: '<TEU_PROJETO>.firebaseapp.com',
  projectId: '<TEU_PROJETO>',
  storageBucket: '<TEU_PROJETO>.appspot.com',
  messagingSenderId: '<O_TEU_MESSAGING_SENDER_ID>',
  appId: '<O_TEU_APP_ID>'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Bazar TV';
  const body = payload.notification?.body || '';

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    data: payload.data || {}
  });
});

// Clique na notificação → abre/foca a app nos Cortes
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clipId = event.notification?.data?.clipId;
  const url = clipId ? `/clips?clip=${clipId}` : '/clips';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});