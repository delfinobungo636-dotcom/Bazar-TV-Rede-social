import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

// ============================================================================
// 1. VALIDADOR DE ACESSO AO VÍDEO (ANTIPIRATARIA E LIMITES DE ECRÃ)
// ============================================================================
export const solicitarAcessoVideo = onCall({
  concurrency: 80,
  timeoutSeconds: 300,
  // DICA FUTURA: Quando ativares o Firebase App Check na Vercel,
  // podes descomentar a linha abaixo para proibir acessos fora do teu site oficial:
  // enforceAppCheck: true
}, async (request) => {
  // 1. Autenticação Básica
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Utilizador não autenticado.');
  }

  const uid = request.auth.uid;
  const movieId = request.data?.movieId;
  const currentDeviceId = request.data?.deviceId;

  if (!movieId || !currentDeviceId) {
    throw new HttpsError('invalid-argument', 'O ID do filme e o ID do dispositivo são obrigatórios.');
  }

  const userAgent = request.rawRequest.headers['user-agent'] || '';
  
  // 2. Leitura Rápida do Perfil
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'Perfil de utilizador não encontrado.');
  }

  const userData = userDoc.data();
  const role = userData?.role || 'user';
  const status = userData?.status || 'waiting_payment';

  // Administradores (tu) têm passe livre absoluto
  if (role === 'admin') return { status: 'authorized', message: 'Acesso Admin concedido.' };

  // 3. Bloqueio por Falta de Pagamento
  if (status === 'expired' || status === 'waiting_payment' || status === 'canceled') {
    throw new HttpsError('permission-denied', 'BLOCK_PAYMENT');
  }

  // 4. Mapeamento do Plano Contratado
  const planoLido = String(userData?.plan || userData?.activePlan || '1000').toLowerCase().trim();
  const planMap: Record<string, string> = {
    '1000': 'mobile', '2999': 'standard', '3999': 'premium', '4999': 'familia',
    'mobile': 'mobile', 'standard': 'standard', 'premium': 'premium', 'familia': 'familia'
  };
  const planoReal = planMap[planoLido] || 'mobile';

  // 5. Bloqueio Restrito de Dispositivo (Plano 1000 Kz só no Telemóvel)
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  if (planoReal === 'mobile' && !isMobileDevice) {
    throw new HttpsError('permission-denied', 'BLOCK_DEVICE');
  }

  // 6. Motor de Gestão de Ecrãs Simultâneos
  const limits: Record<string, number> = { mobile: 1, standard: 1, premium: 2, familia: 4 };
  const maxAllowed = limits[planoReal] || 1;
  
  // Garante que active_sessions é sempre um array válido
  let activeSessions: string[] = Array.isArray(userData?.active_sessions) 
    ? userData!.active_sessions 
    : [];

  // Se o aparelho atual não está registado e a conta já atingiu o limite, bloqueia!
  if (!activeSessions.includes(currentDeviceId) && activeSessions.length >= maxAllowed) {
    throw new HttpsError('resource-exhausted', 'BLOCK_LIMIT');
  }

  // Se há vaga, regista este aparelho como ativo no momento
  if (!activeSessions.includes(currentDeviceId)) {
    activeSessions.push(currentDeviceId);
    // Atualização rápida assíncrona (não bloqueia a resposta ao cliente)
    db.doc(`users/${uid}`).update({ active_sessions: activeSessions }).catch(console.error);
  }

  // Autorização concedida com sucesso
  return { 
    status: 'authorized',
    device: currentDeviceId,
    plan: planoReal
  };
});

// ============================================================================
// 2. DESCONEXÃO FORÇADA (QUANDO O CLIENTE QUER DERRUBAR QUEM ESTÁ A USAR A CONTA)
// ============================================================================
export const forcarDesconexao = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Acesso negado.');

  const uid = request.auth.uid;
  const currentDeviceId = request.data?.deviceId;

  if (!currentDeviceId) {
     throw new HttpsError('invalid-argument', 'ID do dispositivo atual é obrigatório.');
  }

  try {
    // Apaga todos os outros aparelhos da lista e regista APENAS este novo
    await db.doc(`users/${uid}`).update({ 
      active_sessions: [currentDeviceId] 
    });
    
    return { success: true, message: 'Outros aparelhos foram desconectados com sucesso.' };
  } catch (error) {
    console.error("[ERRO] forcarDesconexao:", error);
    throw new HttpsError('internal', 'Erro ao processar o derrube das sessões.');
  }
});