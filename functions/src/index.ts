import * as admin from "firebase-admin";

// Inicializa o Firebase APENAS UMA VEZ na raiz
if (!admin.apps.length) {
  admin.initializeApp();
}

// 1. Módulo de Autenticação
export { syncUserProfile } from "./auth/users";

// 2. Módulo de Streaming (Segurança e Sessões)
export { solicitarAcessoVideo, forcarDesconexao } from "./streaming/access";

// 3. Módulo Financeiro e de Subscrições
export { webhookPagamento, cortarExpirados } from "./billing/payments";

// 4. Módulo de Administração e Telemetria
export { obterEstatisticasBazar } from "./admin/stats";

// 5. Módulo de Inteligência Artificial
export { obterAssistenteGemini } from "./ai/gemini";

export { webhookSmsExpress } from "./billing/payments"; 