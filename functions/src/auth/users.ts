import { beforeUserCreated } from "firebase-functions/v2/identity";
import * as admin from "firebase-admin";

const db = admin.firestore();

// Emails com super-poderes de administração na Bazar TV
const ADMIN_EMAILS = ["geral@bazartv-ao.com", "delfinobungo636@gmail.com"];

// ============================================================================
// 1. CRIAÇÃO DE UTILIZADOR E ATRIBUIÇÃO DE ROLES (BLOCKING FUNCTION V2)
// ============================================================================
export const syncUserProfile = beforeUserCreated(async (event): Promise<any> => {
  const user = event.data;
  if (!user) return {};

  const email = user.email?.toLowerCase() ?? "";
  const isAdmin = ADMIN_EMAILS.includes(email);
  const role = isAdmin ? "admin" : "user";

  try {
    // Escreve o documento do utilizador no Firestore ANTES do registo terminar
    await db.doc(`users/${user.uid}`).set({
      uid: user.uid,
      email: email,
      role: role,
      status: isAdmin ? "active" : "waiting_payment", // Admin entra ativo, cliente espera pagamento
      plan: "1000", // Plano base inicial (Mobile)
      activePlan: "1000",
      active_sessions: [], // Começa sem nenhum aparelho pendurado
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`[AUTH] Perfil criado com sucesso no Firestore para: ${user.uid} | Role: ${role}`);

    // injeta "Custom Claims" diretamente no token de autenticação do Firebase.
    // Isto é 100% seguro porque o token é encriptado pela Google. O utilizador não consegue alterar.
    return {
      customClaims: { role: role }
    };
  } catch (error) {
    console.error("[ERRO CRÍTICO] Falha catastrófica no syncUserProfile:", error);
    // Retorna vazio para não bloquear completamente o registo do utilizador no Firebase Auth
    return {};
  }
});