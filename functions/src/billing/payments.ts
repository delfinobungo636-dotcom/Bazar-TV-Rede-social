import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

// Inicializa o Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ============================================================================
// GESTÃO DE SEGREDOS (Lidos diretamente do Google Cloud Secret Manager)
// ============================================================================
const WEBHOOK_SMS_SECRET = defineSecret("WEBHOOK_SMS_SECRET");
const PROXYPAY_SECRET = defineSecret("PROXYPAY_SECRET");

// ============================================================================
// Função auxiliar: compara duas strings de forma segura contra ataques de
// temporização (timing attacks). Usada em toda a validação de segredos.
// ============================================================================
function compararComSeguranca(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    // Buffers de tamanhos diferentes não podem ser comparados por
    // timingSafeEqual (lançaria erro), e já sabemos que não são iguais.
    if (bufferA.length !== bufferB.length) {
        return false;
    }

    return crypto.timingSafeEqual(bufferA, bufferB);
}

// ============================================================================
// 1. Webhook Proxypay
// ============================================================================
export const webhookPagamento = onRequest(
    { secrets: [PROXYPAY_SECRET] },
    async (req, res) => {
        try {
            if (!req.rawBody) {
                res.status(400).send('Corpo da requisição ausente ou inválido.');
                return;
            }

            const signature = (req.headers['x-proxypay-signature'] as string) || "";

            const expectedSignature = crypto.createHmac('sha256', PROXYPAY_SECRET.value())
                .update(req.rawBody)
                .digest('hex');

            if (!compararComSeguranca(signature, expectedSignature)) {
                console.warn("🚫 [PROXYPAY] Assinatura inválida bloqueada.");
                res.status(401).send('Assinatura inválida.');
                return;
            }

            const { amount, custom_id, status } = req.body;

            if (status === 'paid' && custom_id) {
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 30);

                let novoPlano = "1000";
                if (amount >= 2999 && amount < 3999) novoPlano = "2999";
                if (amount >= 3999 && amount < 4999) novoPlano = "3999";
                if (amount >= 4999) novoPlano = "4999";

                await db.doc(`users/${custom_id}`).update({
                    subscriptionStatus: 'active',
                    status: 'active',
                    plan: novoPlano,
                    activePlan: novoPlano,
                    subscriptionEnds: expiryDate,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                console.log(`🎉 [PROXYPAY] Conta ${custom_id} ativada para o plano ${novoPlano}`);
                res.status(200).send('Pagamento validado e conta ativada.');
            } else {
                res.status(400).send('Ignorado: Status não é paid ou custom_id ausente.');
            }
        } catch (error) {
            console.error("Erro no Proxypay:", error);
            res.status(500).send('Erro interno.');
        }
    }
);

// ============================================================================
// 2. Webhook SMS / Notificação Express (Multicaixa via MacroDroid)
// ============================================================================
export const webhookSmsExpress = onRequest(
    { secrets: [WEBHOOK_SMS_SECRET] },
    async (req, res) => {
        const chaveRecebida = (req.headers['x-webhook-secret'] as string) || "";
        const chaveEsperada = WEBHOOK_SMS_SECRET.value();

        if (!chaveRecebida || !compararComSeguranca(chaveRecebida, chaveEsperada)) {
            console.warn("🚫 [WEBHOOK SMS] Pedido rejeitado: chave secreta ausente ou inválida.");
            res.status(401).send("Não autorizado.");
            return;
        }

        const textoRecebido = String(req.body.texto_notificacao || req.body.valor || "");
        console.log("🔥 [WEBHOOK SMS] Texto recebido:", textoRecebido);

        const regexAngola = /[\d\.]+[,\.][\d]{2}/;
        const match = textoRecebido.match(regexAngola);

        if (!match) {
            console.error("❌ [WEBHOOK SMS] Erro: Valor numérico não encontrado.");
            res.status(400).send("Valor não encontrado.");
            return;
        }

        let valorLimpoString = match[0];

        if (valorLimpoString.includes('.') && valorLimpoString.includes(',')) {
            valorLimpoString = valorLimpoString.replace(/\./g, '').replace(',', '.');
        } else if ((valorLimpoString.match(/\./g) || []).length > 1) {
            const ultimoPonto = valorLimpoString.lastIndexOf('.');
            valorLimpoString = valorLimpoString.substring(0, ultimoPonto).replace(/\./g, '') + valorLimpoString.substring(ultimoPonto);
        } else {
            valorLimpoString = valorLimpoString.replace(',', '.');
        }

        const valorPago = Number(valorLimpoString);
        console.log("💰 [WEBHOOK SMS] Valor decifrado e limpo:", valorPago);

        try {
            let userIdParaAtivar: string | null = null;
            let planoParaAtivar = "2999";

            if (valorPago >= 900 && valorPago < 1500) planoParaAtivar = "1000";
            else if (valorPago >= 2800 && valorPago < 3500) planoParaAtivar = "2999";
            else if (valorPago >= 3500 && valorPago < 4500) planoParaAtivar = "3999";
            else if (valorPago >= 4500) planoParaAtivar = "4999";

            const userSnapshot = await db.collection("users")
                .where("status", "==", "waiting_payment")
                .where("pendingAmount", "==", valorPago)
                .limit(1)
                .get();

            if (!userSnapshot.empty) {
                userIdParaAtivar = userSnapshot.docs[0].id;
            }

            if (!userIdParaAtivar) {
                console.warn(`⚠️ [WEBHOOK SMS] Nenhum utilizador pendente com valor exato ${valorPago}. Registado para revisão manual.`);

                await db.collection("pagamentos_nao_correspondidos").add({
                    valorRecebido: valorPago,
                    textoOriginal: textoRecebido,
                    recebidoEm: admin.firestore.FieldValue.serverTimestamp(),
                });

                res.status(404).send("Nenhum utilizador pendente com esse valor exato encontrado. Registado para revisão.");
                return;
            }

            const dataExpiracao = new Date();
            dataExpiracao.setDate(dataExpiracao.getDate() + 30);

            await db.collection("users").doc(userIdParaAtivar).update({
                subscriptionStatus: "active",
                status: "active",
                plan: planoParaAtivar,
                activePlan: planoParaAtivar,
                subscriptionEnds: dataExpiracao,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                pendingAmount: admin.firestore.FieldValue.delete()
            });

            console.log(`🎉 [WEBHOOK SMS] SUCESSO! Conta ${userIdParaAtivar} ativada para o plano ${planoParaAtivar}`);
            res.status(200).send("Conta ativada com sucesso!");
        } catch (error) {
            console.error("🚨 [WEBHOOK SMS] Erro crítico:", error);
            res.status(500).send("Erro interno.");
        }
    }
);

// ============================================================================
// 3. Cron Job para Cortar Expirados
// ============================================================================
export const cortarExpirados = onSchedule("every 24 hours", async (event) => {
    const hoje = new Date();
    const limit = 500;

    try {
        let processando = true;
        let ultimoDocumento: admin.firestore.QueryDocumentSnapshot | null = null;

        while (processando) {
            let query = db.collection('users')
                .where('subscriptionStatus', '==', 'active')
                .where('subscriptionEnds', '<', hoje)
                .limit(limit);

            if (ultimoDocumento) {
                query = query.startAfter(ultimoDocumento);
            }

            const snapshot = await query.get();

            if (snapshot.empty) {
                processando = false;
                break;
            }

            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.update(doc.ref, {
                    subscriptionStatus: 'expired',
                    status: 'expired',
                    activePlan: 'none',
                    plan: 'none',
                    active_sessions: []
                });
            });

            await batch.commit();
            ultimoDocumento = snapshot.docs[snapshot.docs.length - 1];
        }
    } catch (error) {
        console.error("[CRON] Erro ao cortar expirados:", error);
    }
});