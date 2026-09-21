import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore"; 
import { app, db } from "./firebase"; // Conexão direta com o teu ficheiro de inicialização

const messaging = getMessaging(app);

/**
 * Solicita permissão para notificações e guarda o token no Firestore de forma inteligente.
 * Conta com uma proteção em Cache para evitar escritas infinitas e quebras de performance no DOM.
 */
export const requestNotificationPermission = async (userId: string) => {
  try {
    if (!userId) return null;

    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BDEKub9q0pwhZkb5K_8rGp4HKQbg5Wu8dW5nQB_NCZcpJBIX-Zt-iWLE7kLEuKD3Gtgh2QZXo5GzW70e"
      });

      if (token) {
        // 🛡️ TRAVÃO DE PERFORMANCE CRÍTICO:
        // Verifica se o token gerado já é exatamente igual ao que guardámos localmente.
        // Se for igual, cancela a operação para não gerar ciclos infinitos de re-renders no Firestore.
        const savedToken = localStorage.getItem(`fcm_token_${userId}`);
        if (savedToken === token) {
          console.log("FCM: O Token já está atualizado no Firestore. Gravação evitada para poupar o DOM.");
          return token;
        }

        console.log("FCM: Novo token capturado com sucesso:", token);
        
        // Atualização real no Back-end
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          fcmToken: token
        });

        // Atualiza a cache local para trancar o loop nas próximas renderizações
        localStorage.setItem(`fcm_token_${userId}`, token);
        return token;
      }
    }
  } catch (error) {
    console.error("Erro fatal ao configurar mensagens e permissões:", error);
  }
};

/**
 * Listener ativo para escutar mensagens em tempo real com a aplicação aberta.
 * Substituída a antiga Promise única por um padrão limpo de Callback para evitar memory leaks.
 */
export const registerOnMessageListener = (onMessageReceived: (payload: any) => void) => {
  return onMessage(messaging, (payload) => {
    console.log("FCM: Nova mensagem recebida em primeiro plano:", payload);
    onMessageReceived(payload);
  });
};