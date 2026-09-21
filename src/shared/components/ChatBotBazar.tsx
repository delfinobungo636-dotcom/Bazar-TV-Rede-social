// ChatBotBazar.tsx — V4 (Restrito exclusivamente ao Home/Landing Page Pública + Bolinha Limpa)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useLocation } from 'react-router-dom';

interface Message {
  role: 'ai' | 'user';
  text: string;
  timestamp: number;
}

interface ChatBotProps {
  provider?: 'claude' | 'gemini';
  accentColor?: string;
  side?: 'right' | 'left';
  botName?: string;
  embedded?: boolean; // True se for dentro do modal do botão (+)
}

const SUGGESTIONS = [
  { emoji: '🎬', label: 'Conteúdos', q: 'Como gravar e publicar um Corte na Bazar TV?' },
  { emoji: '💳', label: 'Planos',    q: 'Quais são os planos e preços em Kwanzas?' },
  { emoji: '🚀', label: 'Recursos',  q: 'Como funcionam os grupos e perfis?' },
];

const FUNCTION_NAMES: Record<'claude' | 'gemini', string> = {
  claude: 'obterAssistentePublico',
  gemini: 'obterAssistenteGemini',
};

export default function ChatBotBazar({
  provider = 'gemini',
  accentColor = '#e63946',
  side = 'right',
  botName = 'Bazar TV AI',
  embedded = false,
}: ChatBotProps) {
  const location = useLocation();

  // Bloqueia e esconde o modo flutuante se estivermos dentro de rotas internas da app (exceto se embedded=true)
  const isInternalAppRoute = location.pathname.startsWith('/clips') || 
                             location.pathname.startsWith('/profile') || 
                             location.pathname.startsWith('/perfil') || 
                             location.pathname.startsWith('/dashboard') || 
                             location.pathname.startsWith('/friends') || 
                             location.pathname.startsWith('/create-group') || 
                             location.pathname.startsWith('/upload');

  const [panelOpen, setPanelOpen] = useState(embedded);
  const [greeted, setGreeted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [position, setPosition] = useState({ x: 28, y: 28 });
  const wasDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const functions = getFunctions();

  useEffect(() => {
    if (embedded && !greeted) {
      setMessages([{
        role: 'ai',
        text: `Olá! 👋 Sou o ${botName}.\nComo posso ajudar-te a criar ou navegar na Bazar TV hoje?`,
        timestamp: Date.now()
      }]);
      setGreeted(true);
    }
  }, [embedded, greeted, botName]);

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    wasDragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const currentXFromEdge = side === 'right' ? (window.innerWidth - clientX) : clientX;
    const currentYFromBottom = window.innerHeight - clientY;

    let newX = currentXFromEdge - dragOffset.current.x;
    let newY = currentYFromBottom - dragOffset.current.y;

    setPosition({ x: Math.max(10, Math.min(newX, window.innerWidth - 60)), y: Math.max(10, Math.min(newY, window.innerHeight - 60)) });
  }, [side]);

  const handleMouseUp = useCallback(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchmove', handleMouseMove);
    document.removeEventListener('touchend', handleMouseUp);
    setTimeout(() => { wasDragging.current = false; }, 80);
  }, [handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (embedded) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = {
      x: (side === 'right' ? (window.innerWidth - clientX) : clientX) - position.x,
      y: (window.innerHeight - clientY) - position.y,
    };
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove, { passive: false });
    document.addEventListener('touchend', handleMouseUp);
  };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    setError(null);
    setIsThinking(true);
    setShowSuggestions(false);
    setInputVal('');
    setMessages(prev => [...prev, { role: 'user', text: trimmed, timestamp: Date.now() }]);

    try {
      const fn = httpsCallable<{ prompt: string }, { respostaAi: string }>(functions, FUNCTION_NAMES[provider]);
      const res = await fn({ prompt: trimmed });
      const reply = res.data?.respostaAi || 'Não consegui processar a resposta.';
      setMessages(prev => [...prev, { role: 'ai', text: reply, timestamp: Date.now() }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sem ligação ao servidor da Bazar TV AI. Tente novamente.', timestamp: Date.now() }]);
    } finally {
      setIsThinking(false);
    }
  }, [isThinking, provider, functions]);

  // Conteúdo do Chat embutido
  const chatBody = (
    <div className={`flex flex-col h-full ${embedded ? 'h-[320px]' : 'h-[460px]'} bg-[#0d0d14] rounded-2xl overflow-hidden border border-white/10 shadow-2xl`}>
      <div className="p-3 bg-white/5 border-b border-white/10 flex items-center gap-2">
        <span className="text-lg">✨</span>
        <div>
          <h4 className="text-xs font-bold text-white">{botName}</h4>
          <p className="text-[10px] text-zinc-400">{isThinking ? 'A pensar...' : 'Online'}</p>
        </div>
      </div>

      <div ref={msgsRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] p-2.5 rounded-2xl text-xs leading-relaxed ${m.role === 'ai' ? 'bg-white/10 text-white self-start rounded-tl-xs' : 'bg-red-600 text-white self-end rounded-tr-xs ml-auto'}`}
          >
            {m.text}
          </div>
        ))}
        {isThinking && (
          <div className="bg-white/10 text-white p-2.5 rounded-2xl text-xs self-start w-16 flex justify-center gap-1">
            <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        )}
      </div>

      {showSuggestions && (
        <div className="p-2 flex gap-1.5 overflow-x-auto">
          {SUGGESTIONS.map(sg => (
            <button
              key={sg.q}
              onClick={() => sendMessage(sg.q)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors shrink-0"
            >
              {sg.emoji} {sg.label}
            </button>
          ))}
        </div>
      )}

      <div className="p-2 border-t border-white/10 bg-white/5 flex gap-2">
        <input
          ref={inputRef}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(inputVal)}
          placeholder="Pergunta à IA..."
          disabled={isThinking}
          className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
        />
        <button
          onClick={() => sendMessage(inputVal)}
          disabled={isThinking || !inputVal.trim()}
          className="bg-red-600 disabled:bg-white/10 text-white px-3 rounded-xl text-xs font-bold transition-colors"
        >
          ↑
        </button>
      </div>
    </div>
  );

  // Se estiver em modo embutido (dentro do modal do +), retorna direto o chatBody
  if (embedded) return chatBody;

  // Se estiver numa rota interna da app, bloqueia completamente a renderização da bolinha flutuante pública
  if (isInternalAppRoute) return null;

  // Renderização flutuante pública limpa (sem efeito de pontinhos estranhos)
  return (
    <>
      <button
        onClick={() => !wasDragging.current && setPanelOpen(!panelOpen)}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        style={{ position: 'fixed', bottom: position.y, [side]: position.x, zIndex: 9999 }}
        className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg cursor-grab text-lg border border-white/15 active:scale-95 transition-transform"
      >
        {panelOpen ? '✕' : '✨'}
      </button>

      {panelOpen && (
        <div style={{ position: 'fixed', bottom: position.y + 56, [side]: position.x, zIndex: 9998 }} className="w-80">
          {chatBody}
        </div>
      )}
    </>
  );
}