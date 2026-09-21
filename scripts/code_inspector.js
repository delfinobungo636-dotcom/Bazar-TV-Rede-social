// scripts/code_inspector.js
const { GoogleGenAI } = require("@google/genai");
const fs = require('fs');
const path = require('path');

// Inicializa a inteligência do robô com a sua chave existente
const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

async function executarCorrecaoRobotica() {
  // Caminho do arquivo que gerencia os logins
  const caminhoAuthService = path.resolve(__dirname, '../src/modules/auth/auth.service.ts'); 
  
  if (!fs.existsSync(caminhoAuthService)) {
    console.error("❌ Erro: Não encontrei o ficheiro auth.service.ts no caminho especificado.");
    return;
  }

  const codigoOriginal = fs.readFileSync(caminhoAuthService, 'utf8');
  console.log("🤖 Robô Ativo: Iniciando inspeção do gerenciador de autenticação...");

  const comandoAosAgentes = `
    Atue como Arquiteto de Software Sénior da Bazar TV.
    Identificamos que o sistema aceita múltiplas conexões porque os dispositivos não geram um ID único local (device_id) no login.
    
    Modifique a função de 'login' para que ela:
    1. Verifique se existe um 'bazar_device_id' no localStorage. Se não existir, gere um usando um padrão único (ex: crypto.randomUUID() ou Date.now().toString()).
    2. Ao gravar os dados do utilizador ou iniciar a sessão, certifique-se de que este ID seja retornado ou registrado.
    
    Aqui está o código atual:
    ${codigoOriginal}
    
    Retorne APENAS o código TypeScript completo e corrigido, pronto para substituir o arquivo. Não escreva textos explicativos.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: comandoAosAgentes
    });

    const codigoCorrigido = response.text.replace(/```typescript|```tsx|```/g, '').trim();
    fs.writeFileSync(caminhoAuthService, codigoCorrigido);
    console.log("✅ Sucesso: O robô corrigiu o auth.service.ts e injetou o rastreador de dispositivos!");
  } catch (erro) {
    console.error("❌ Falha na execução do agente do robô:", erro);
  }
}

executarCorrecaoRobotica();