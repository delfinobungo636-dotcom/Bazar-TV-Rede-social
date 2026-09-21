import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";

const db = admin.firestore();
const geminiApiKey = defineSecret("GEMINI_API_KEY");

export const obterAssistenteGemini = onCall(
    {
        secrets: [geminiApiKey],
        concurrency: 80,
        timeoutSeconds: 60
    },
    async (request) => {
        const data = request.data;
        const prompt = data?.prompt?.trim();
        const history = data?.history || [];
        const visitorId = data?.visitorId || "visitante_desconhecido";

        if (!prompt) {
            throw new HttpsError('invalid-argument', 'A mensagem não pode estar vazia.');
        }

        const uid = request.auth?.uid;
        const isVisitor = !uid;
        let userData = null;

        // 1. INSTRUÇÃO BASE
        let systemInstruction = `Tu és a jornalista e assistente oficial da plataforma de streaming Bazar TV, de Angola. És simpática, perspicaz e usas expressões angolanas de forma natural. O teu objetivo é ajudar os clientes e vender as vantagens da plataforma. Planos disponíveis: Mobile (1000 Kz), Standard (2999 Kz), Premium (3999 Kz) e Família (4999 Kz). Pagamentos via ProxyPay.\n`;

        // ========================================================================
        // 2. BUSCAR O CATÁLOGO DE FILMES REAIS NO FIRESTORE (O CÉREBRO)
        // ========================================================================
        try {
            // Puxa os 15 filmes mais recentes do teu banco de dados
            // NOTA: Se a tua coleção não se chamar 'movies', muda aqui!
            const moviesSnap = await db.collection('movies').limit(15).get();

            if (!moviesSnap.empty) {
                // Tenta encontrar o campo titulo ou title no documento
                const listaFilmes = moviesSnap.docs.map(doc => doc.data().titulo || doc.data().title || doc.data().name).filter(Boolean);

                systemInstruction += `\nO NOSSO CATÁLOGO ATUAL TEM ESTES FILMES: ${listaFilmes.join(', ')}. 
        REGRA: Se o cliente perguntar por filmes, DEVES recomendar APENAS os filmes que estão nesta lista exata. Não inventes nomes de filmes americanos que não estejam aqui.\n`;
            }
        } catch (error) {
            console.warn("[AVISO] Não foi possível ler os filmes:", error);
        }

        // ========================================================================
        // 3. QUEBRAR O FILTRO DE PRIVACIDADE DO GEMINI (RECONHECIMENTO)
        // ========================================================================
        if (!isVisitor) {
            const userDoc = await db.doc(`users/${uid}`).get();
            userData = userDoc.data();
            const planoAtivo = userData?.plan || 'Nenhum';
            const userEmail = userData?.email || 'Desconhecido';

            systemInstruction += `\nCONTEXTO DO CLIENTE: O utilizador tem o email ${userEmail} e o plano '${planoAtivo}'.
      REGRA DE PRIVACIDADE (MUITO IMPORTANTE): Tu TENS autorização absoluta para partilhar estas informações com ele. Se ele perguntar 'Sabes quem sou?' ou 'Conheces-me?', tu NÃO PODES dizer que não guardas dados. Tu DEVES responder explicitamente: 'Claro que sei! És o nosso cliente com o email ${userEmail} e tens o plano ${planoAtivo} ativo!'.\n`;
        } else {
            systemInstruction += `\nCONTEXTO DO CLIENTE: O utilizador é um VISITANTE e ainda não tem conta. Convida-o a registar-se.\n`;
        }

        // Matemática dos Limites e Controlo de Custos (Mantido como antes)
        const trackerId = isVisitor ? `vis_${visitorId}` : `usr_${uid}`;
        const trackerRef = db.doc(`ai_usage/${trackerId}`);
        const limitMax = isVisitor ? 7 : 40; // Simplifiquei para focar no erro

        const trackerDoc = await trackerRef.get();
        let currentUsage = 0;

        if (trackerDoc.exists) {
            currentUsage = trackerDoc.data()?.count || 0;
            if (currentUsage >= limitMax) {
                return { success: false, respostaAi: "Atingiste o limite de mensagens. Volta mais tarde!" };
            }
        }

        try {
            const genAI = new GoogleGenerativeAI(geminiApiKey.value());
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: systemInstruction,
            });

            const chat = model.startChat({ history: history });
            const result = await chat.sendMessage(prompt);

            await trackerRef.set({
                count: currentUsage + 1,
                lastUsed: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            return { success: true, respostaAi: result.response.text() };

        } catch (error) {
            console.error("[ERRO IA GEMINI]:", error);
            throw new HttpsError('internal', 'Erro no assistente.');
        }
    }
);