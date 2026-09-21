import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// ============================================================================
// MOTOR DE ESTATÍSTICAS DO PAINEL ADMIN (OTIMIZADO PARA MILHÕES DE REGISTOS)
// ============================================================================
export const obterEstatisticasBazar = onCall(async (request) => {
  // 1. Barreira de Segurança Super Rigorosa
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Acesso negado. Sessão inválida.');
  }

  // Verifica as "Custom Claims" que foram injetadas pelo auth/users.ts
  // Isto garante que nenhum hacker ou utilizador normal consegue ver as finanças da empresa
  if (request.auth.token.role !== 'admin') {
    console.warn(`[TENTATIVA DE INVASÃO] UID ${request.auth.uid} tentou aceder ao painel.`);
    throw new HttpsError('permission-denied', 'Acesso restrito à administração da Bazar TV.');
  }

  try {
    // 2. Consultas de Agregação Paralelas (O Segredo para poupar dinheiro e tempo)
    // Promise.all executa as duas contagens ao mesmo tempo, reduzindo o tempo de espera pela metade
    const [usersSnap, moviesSnap] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('movies').count().get()
    ]);

    return {
      success: true,
      totalUsers: usersSnap.data().count,
      totalMovies: moviesSnap.data().count,
      lastUpdate: Date.now()
    };
  } catch (error) {
    console.error("[ERRO ADMIN] Falha ao processar telemetria:", error);
    throw new HttpsError('internal', 'Falha ao gerar as estatísticas do painel.');
  }
});