// GroupsPage.tsx — Lógica Avançada de Grupos e Mensagens (Bazar TV)
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../shared/services/firebase';
import { useAuth } from '../../../modules/auth/auth.hooks';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, serverTimestamp 
} from 'firebase/firestore';
import { ArrowLeft, Users, Search, Send, Loader2, MessageCircle, MoreVertical, Plus } from 'lucide-react';

// --- Tipagens (TypeScript) ---
interface Group {
  id: string;
  name: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: any;
  members: string[];
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: any;
}

interface GroupsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- Hook Dia/Noite (O mesmo do resto da App) ---
const useTimeBasedTheme = (): boolean => {
  const [isDayTime, setIsDayTime] = useState<boolean>(true);
  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      setIsDayTime(hour >= 6 && hour < 19);
    };
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);
  return isDayTime;
};

export const GroupsPage: React.FC<GroupsPageProps> = ({ isOpen, onClose }) => {
  const isDay = useTimeBasedTheme();
  const { user, userData } = useAuth();
  const myUid = user?.uid || '';

  // Estados da Lista de Grupos
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(true);

  // Estados da Sala de Chat Ativa
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. CARREGAR OS GRUPOS DO UTILIZADOR (Real-time)
  useEffect(() => {
    if (!isOpen || !myUid) return;

    // Busca grupos onde o utilizador é membro
    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', myUid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Group[];
      
      setGroups(groupsData);
      setLoadingGroups(false);
    });

    return () => unsubscribe();
  }, [isOpen, myUid]);

  // 2. CARREGAR MENSAGENS DO GRUPO ATIVO (Real-time)
  useEffect(() => {
    if (!activeGroup) return;

    const q = query(
      collection(db, `groups/${activeGroup.id}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      setMessages(msgs);
      // Fazer scroll para a última mensagem
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [activeGroup]);

  // 3. ENVIAR NOVA MENSAGEM
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeGroup || !myUid) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const senderName = userData?.name || user?.displayName || 'Eu';
      const senderAvatar = userData?.profileImage || user?.photoURL || '';

      await addDoc(collection(db, `groups/${activeGroup.id}/messages`), {
        text: messageText,
        senderId: myUid,
        senderName,
        senderAvatar,
        timestamp: serverTimestamp()
      });

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  // --- Classes Estéticas de Tema (Dia/Noite) ---
  const bgClass = isDay ? 'bg-white text-black' : 'bg-[#121214] text-white';
  const borderClass = isDay ? 'border-zinc-200' : 'border-zinc-800/80';
  const inputBgClass = isDay ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900 border-zinc-800';
  const mutedClass = isDay ? 'text-zinc-500' : 'text-zinc-400';
  const hoverClass = isDay ? 'hover:bg-zinc-100' : 'hover:bg-white/5';

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // ==========================================
  // VISTA 2: SALA DE CHAT (MENSAGENS DO GRUPO)
  // ==========================================
  if (activeGroup) {
    return (
      <div className={`fixed inset-0 z-[500] ${bgClass} flex flex-col`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        
        {/* Cabeçalho do Chat */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${borderClass} shrink-0 bg-opacity-95 backdrop-blur-md`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveGroup(null)} className={`p-2 rounded-full ${isDay ? 'bg-zinc-100 text-black' : 'bg-zinc-900 text-white'}`}>
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-white shadow-sm border border-zinc-500/20">
                {activeGroup.avatarUrl ? <img src={activeGroup.avatarUrl} alt={activeGroup.name} className="w-full h-full object-cover" /> : activeGroup.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-bold text-sm leading-tight">{activeGroup.name}</h2>
                <p className={`text-[10px] ${mutedClass}`}>{activeGroup.members.length} membros</p>
              </div>
            </div>
          </div>
          <button className={`p-2 ${mutedClass}`}><MoreVertical size={20} /></button>
        </div>

        {/* Área de Mensagens (Scroll) */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDay ? 'bg-[#f0f2f5]' : 'bg-black/40'}`}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-50">
              <MessageCircle size={40} className="mb-2" />
              <p className="text-xs font-bold">Sem mensagens ainda.</p>
              <p className="text-[10px]">Sê o primeiro a dizer olá ao grupo!</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.senderId === myUid;
              const showAvatar = !isMe && (i === 0 || messages[i - 1].senderId !== msg.senderId);

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showAvatar && (
                    <span className={`text-[10px] font-bold ml-11 mb-1 ${mutedClass}`}>
                      {msg.senderName}
                    </span>
                  )}
                  <div className="flex gap-2 max-w-[85%]">
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-zinc-700 shrink-0 overflow-hidden flex items-center justify-center text-white text-[10px] font-bold mt-auto">
                        {showAvatar ? (msg.senderAvatar ? <img src={msg.senderAvatar} className="w-full h-full object-cover" alt="" /> : msg.senderName.charAt(0)) : null}
                      </div>
                    )}
                    <div className={`p-3 rounded-2xl text-xs shadow-sm ${isMe ? 'bg-red-600 text-white rounded-br-sm' : (isDay ? 'bg-white text-black rounded-bl-sm border border-zinc-200' : 'bg-zinc-800 text-white rounded-bl-sm border border-zinc-700')}`}>
                      <p className="whitespace-pre-wrap word-break">{msg.text}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input de Envio de Mensagem */}
        <form onSubmit={handleSendMessage} className={`p-3 border-t ${borderClass} shrink-0 bg-transparent flex items-end gap-2`}>
          <div className={`flex-1 flex items-center min-h-[44px] rounded-2xl border px-3 ${inputBgClass}`}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
              placeholder="Escreve uma mensagem..."
              className="flex-1 bg-transparent text-xs outline-none resize-none max-h-24 py-3 scrollbar-none"
              rows={1}
            />
          </div>
          <button 
            type="submit" 
            disabled={!newMessage.trim() || sending}
            className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg disabled:opacity-50 disabled:scale-100 active:scale-90 transition-transform"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-1" />}
          </button>
        </form>
      </div>
    );
  }

  // ==========================================
  // VISTA 1: LISTA DOS MEUS GRUPOS
  // ==========================================
  return (
    <div className={`fixed inset-0 z-[500] ${bgClass} flex flex-col`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      
      {/* Cabeçalho */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${borderClass} shrink-0`}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className={`p-2 rounded-full ${isDay ? 'bg-zinc-100' : 'bg-zinc-900'}`} aria-label="Voltar">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-black flex items-center gap-2"><Users size={18} className="text-red-500" /> Grupos</h1>
        </div>
        
        {/* NOVO: Botão '+' Vermelho para criar grupo no lado direito */}
        <button 
          onClick={() => alert("A lógica de criar grupo será integrada a seguir!")}
          className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      </div>

      {/* Pesquisa */}
      <div className={`px-4 py-3 border-b ${borderClass} shrink-0`}>
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${inputBgClass}`}>
          <Search size={16} className={mutedClass} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Procurar grupos..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {/* Lista de Grupos */}
      <div className="flex-1 overflow-y-auto">
        {loadingGroups ? (
          <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-red-500" /></div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-60">
            <Users size={48} className="mb-3 text-zinc-500" />
            <p className="text-sm font-bold">Nenhum grupo encontrado.</p>
            <p className="text-xs text-center mt-1 px-8">Ainda não fazes parte de nenhum grupo ou a tua pesquisa não encontrou resultados.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-500/10">
            {filteredGroups.map(group => (
              <div 
                key={group.id} 
                onClick={() => setActiveGroup(group)}
                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${hoverClass}`}
              >
                <div className="w-14 h-14 rounded-full bg-zinc-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xl text-white shadow-sm border border-zinc-500/20">
                  {group.avatarUrl ? <img src={group.avatarUrl} alt={group.name} className="w-full h-full object-cover" /> : group.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-bold text-sm truncate">{group.name}</h3>
                  </div>
                  <p className={`text-xs truncate ${mutedClass}`}>
                    {group.lastMessage ? group.lastMessage : 'Grupo criado recentemente.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupsPage;