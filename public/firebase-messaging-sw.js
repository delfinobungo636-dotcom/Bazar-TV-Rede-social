importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDF_Q45UnAHeuclljipL3YctqY741kxFTw",
  authDomain: "bazar-tv.firebaseapp.com",
  projectId: "bazar-tv",
  storageBucket: "bazar-tv.firebasestorage.app",
  messagingSenderId: "386210431970",
  appId: "1:386210431970:web:5aac6e733172b32a6afbb"
});

const messaging = firebase.messaging();

// Trata as notificações quando a app está fechada
messaging.onBackgroundMessage((payload) => {
  console.log('Notificação em segundo plano:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png' // Coloca o caminho do teu logo aqui
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});