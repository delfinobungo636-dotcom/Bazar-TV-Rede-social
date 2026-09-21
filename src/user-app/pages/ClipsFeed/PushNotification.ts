// ==========================================
// src/shared/services/pushNotifications.ts
//
// Chama initPushNotifications(user.uid) uma vez, depois do login
// (ex: dentro do teu AuthProvider ou logo a seguir ao ecrã de login),
// não em cada render. Chama removePushToken(user.uid) no logout, se
// quiseres parar de receber push naquele aparelho.
//
// IMPORTANTE: precisas de:
// 1) Ter public/firebase-messaging-sw.js publicado (ficheiro em anexo).
// 2) Substituir '<TUA_VAPID_KEY>' abaixo pela tua chave real:
//    Firebase Console → Definições do projeto → Cloud Messaging →
//    "Certificados Web Push" → gera/copia a chave pública.
// 3) O teu firebase.ts precisa de exportar também `app`
//    (o resultado de initializeApp(...)), não só `db`.
// ==========================================
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { app, db } from '../../../shared/services/firebase';

const VAPID_KEY = '<TUA_VAPID_KEY>';

export async function initPushNotifications(userId: string): Promise<void> {
  try {
    const supported = await isSupported();
    if (!supported || !('serviceWorker' in navigator)) {
      console.warn('Push notifications não suportadas neste navegador.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Utilizador recusou permissão de notificações.');
      return;
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      console.warn('Não foi possível gerar o token FCM.');
      return;
    }

    // Guarda o token no perfil do utilizador (merge: não apaga o resto do doc)
    await setDoc(doc(db, 'users', userId), { fcmTokens: arrayUnion(token) }, { merge: true });

    // Mensagens recebidas com a app ABERTA (primeiro plano) — o FCM não
    // mostra notificação do sistema sozinho neste caso, por isso tratamos
    // aqui manualmente (ex: um toast simples).
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || 'Bazar TV';
      const body = payload.notification?.body || '';

      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon-192.png' });
      }
    });
  } catch (err) {
    console.error('Erro ao configurar push notifications:', err);
  }
}

export async function removePushToken(userId: string, token?: string): Promise<void> {
  if (!token) return;
  try {
    await updateDoc(doc(db, 'users', userId), { fcmTokens: arrayRemove(token) });
  } catch (err) {
    console.error('Erro ao remover token de push:', err);
  }
}