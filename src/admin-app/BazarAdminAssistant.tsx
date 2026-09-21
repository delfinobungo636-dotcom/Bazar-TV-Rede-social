import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Sparkles, Activity } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Define o formato das mensagens
interface Message {
  role: 'user' | 'model';
  text: string;
}

const BazarAdminAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Bom dia, Chefia! O painel da Bazar TV está online. O que queres analisar hoje?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Faz o scroll automático para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    // Adiciona a pergunta do Administrador ao ecrã
    const newMessages: Message[] = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const functions = getFunctions();
      const callGemini = httpsCallable(functions, 'obterAssistenteGemini');

      // 🚀 CAPTURA DA TELEMETRIA DO NAVEGADOR
      let loadTime = 0;
      if (window.performance && window.performance.getEntriesByType) {
        const navEntries = window.performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
        if (navEntries.length > 0) loadTime = Math.round(navEntries[0].domContentLoadedEventEnd);
      }

      // Prepara o histórico para o Gemini ter memória da conversa
      const historyForGemini = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      // Faz a chamada à nossa "IA Deus" na nuvem
      const response: any = await callGemini({
        prompt: userText,
        history: historyForGemini,
        contextMode: 'admin', // Diz à nuvem: "Atenção, é o Delfino a falar!"
        metrics: {
          domLoadTime: `${loadTime}`,
          fps: '60' // Exemplo estático
        }
      });

      if (response.data && response.data.success) {
        setMessages([...newMessages, { role: 'model', text: response.data.respostaAi }]);
      } else {
        setMessages([...newMessages, { role: 'model', text: response.data?.respostaAi || 'Erro ao processar.' }]);
      }
    } catch (error) {
      console.error("Erro na IA:", error);
      setMessages([...newMessages, { role: 'model', text: 'A comunicação com o satélite da Google falhou. Verifica a internet ou os logs do Firebase.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      
      {/* O Botão Flutuante */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-110 flex items-center justify-center group"
        >
          <Bot size={28} className="group-hover:animate-pulse" />
        </button>
      )}

      {/* A Janela de Chat */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[500px] max-h-[80vh] bg-black border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10">
          
          {/* Cabeçalho do Chat */}
          <div className="bg-zinc-900/80 backdrop-blur-md p-4 border-b border-zinc-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
                <Sparkles size={18} className="text-blue-500" />
              </div>
              <div>
                <h3 className="font-black text-white text-sm uppercase tracking-widest">Bazar AI Core</h3>
                <p className="text-[9px] text-green-500 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online (Modo Admin)
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white p-1 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#050505]">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-zinc-900/80 border border-zinc-800 text-zinc-300 rounded-tl-sm'
                }`}>
                  {msg.role === 'model' && <Bot size={14} className="mb-2 text-blue-500 opacity-70" />}
                  {/* Se a IA mandar formatação como negrito, o React não processa markdown nativamente sem bibliotecas extras, por isso mantemos simples ou usamos Regex. Aqui usamos texto limpo. */}
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text.replace(/\*\*/g, '')}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl rounded-tl-sm flex items-center gap-3 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                  <Activity size={14} className="animate-pulse text-blue-500" /> Analisando a plataforma...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Barra de Input */}
          <div className="p-3 bg-zinc-900/50 border-t border-zinc-800">
            <form onSubmit={handleSend} className="flex items-center gap-2 bg-black border border-zinc-800 p-1.5 rounded-2xl focus-within:border-blue-500 transition-colors">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunta-me sobre a Bazar TV..."
                className="flex-1 bg-transparent text-white text-xs pl-3 outline-none"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 transition-all"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
};

export default BazarAdminAssistant;