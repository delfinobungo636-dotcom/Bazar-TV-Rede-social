// ProfileInboxModal.tsx — Estilo Messenger da Meta com IDs Únicos e Modo Dia/Noite
import { Loader2 } from 'lucide-react'; 
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, ChevronLeft, CheckCheck, Sun, Moon, Info } from 'lucide-react';
import { db } from '../../../shared/services/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

export interface MessageItem { id: string; senderId: string; senderName: string; senderAvatar?: string; receiverId: string; text: string; read: boolean; createdAt?: any; }

const useTimeBasedTheme = (): boolean => {
  const [isDayTime, setIsDayTime] = useState<boolean>(true);
  useEffect(() => {
    const checkTime = () => { const hour = new Date().getHours(); setIsDayTime(hour >= 6 && hour < 19); };
    checkTime();
    const interval = setInterval(checkTime, 30000);
    return () => clearInterval(interval);
  }, []);
  return isDayTime;
};

interface ConversationGroup { partnerId: string; partnerName: string; partnerAvatar?: string; messages: MessageItem[]; unreadCount: number; lastMessageTime: any; }

export const ProfileInboxModal: React.FC<any> = ({ isOpen, onClose, myUid, myName, myAvatar, onShowToast }) => {
  const autoIsDay = useTimeBasedTheme();
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);
  const isDay = manualOverride !== null ? manualOverride : autoIsDay;

  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !myUid) return;
    const fetchThreads = async () => {
      setLoading(true);
      try {
        const qReceiver = query(collection(db, 'messages'), where('receiverId', '==', myUid));
        const qSender = query(collection(db, 'messages'), where('senderId', '==', myUid));
        const [snapReceiver, snapSender] = await Promise.all([getDocs(qReceiver), getDocs(qSender)]);
        const msgMap = new Map<string, MessageItem>();
        
        snapReceiver.docs.forEach(d => msgMap.set(d.id, { id: d.id, ...d.data() } as MessageItem));
        snapSender.docs.forEach(d => msgMap.set(d.id, { id: d.id, ...d.data() } as MessageItem));

        const allMsgs = Array.from(msgMap.values()).sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        const groupMap = new Map<string, ConversationGroup>();

        allMsgs.forEach(msg => {
          const isMeSender = msg.senderId === myUid;
          const partnerId = isMeSender ? msg.receiverId : msg.senderId;
          if (!partnerId) return;

          if (!groupMap.has(partnerId)) {
            groupMap.set(partnerId, { partnerId, partnerName: isMeSender ? 'Utilizador' : (msg.senderName || `ID: ${partnerId.slice(0, 6)}`), partnerAvatar: isMeSender ? undefined : msg.senderAvatar, messages: [], unreadCount: 0, lastMessageTime: msg.createdAt });
          }
          const group = groupMap.get(partnerId)!;
          group.messages.push(msg);
          group.lastMessageTime = msg.createdAt;
          if (!isMeSender && msg.senderName) { group.partnerName = msg.senderName; group.partnerAvatar = msg.senderAvatar || group.partnerAvatar; }
          if (!isMeSender && !msg.read) group.unreadCount += 1;
        });

        setConversations(Array.from(groupMap.values()).sort((a, b) => (b.lastMessageTime?.toMillis?.() || 0) - (a.lastMessageTime?.toMillis?.() || 0)));
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchThreads();
  }, [isOpen, myUid, sending]);

  useEffect(() => { if (selectedPartnerId) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selectedPartnerId, conversations]);

  const activeConversation = conversations.find(c => c.partnerId === selectedPartnerId);

  const handleOpenConversation = async (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    const targetGroup = conversations.find(c => c.partnerId === partnerId);
    if (!targetGroup) return;
    try {
      const unreadMsgs = targetGroup.messages.filter(m => m.receiverId === myUid && !m.read);
      for (const m of unreadMsgs) await updateDoc(doc(db, 'messages', m.id), { read: true });
      setConversations(prev => prev.map(g => g.partnerId === partnerId ? { ...g, unreadCount: 0, messages: g.messages.map(m => m.receiverId === myUid ? { ...m, read: true } : m) } : g));
    } catch (e) { console.error(e); }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedPartnerId) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), { senderId: myUid, senderName: myName, senderAvatar: myAvatar || '', receiverId: selectedPartnerId, text: replyText.trim(), read: false, createdAt: serverTimestamp() });
      setReplyText('');
    } catch (e) { onShowToast?.("Erro ao enviar mensagem."); } finally { setSending(false); }
  };

  if (!isOpen) return null;

  const bgModal = isDay ? 'bg-white' : 'bg-[#181818]';
  const textModal = isDay ? 'text-black' : 'text-white';
  const borderModal = isDay ? 'border-zinc-200' : 'border-zinc-800';
  const bgBubbleReceiver = isDay ? 'bg-zinc-100 text-black border-zinc-200' : 'bg-zinc-800 text-white border-zinc-700';

  return (
    <div className="fixed inset-0 backdrop-blur-md z-[500] flex items-center justify-center p-2 sm:p-6 animate-fade-in text-left transition-colors duration-300" style={{ backgroundColor: isDay ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.85)' }}>
      <div className={`w-full max-w-2xl h-[85vh] rounded-[32px] overflow-hidden shadow-2xl flex flex-col transition-all border ${bgModal} ${textModal} ${borderModal}`}>
        
        {/* Header Estilo Messenger */}
        <div className={`p-4 border-b flex items-center justify-between ${isDay ? 'bg-white border-zinc-200' : 'bg-[#181818] border-zinc-800'}`}>
          <div className="flex items-center gap-3">
            {selectedPartnerId && (
              <button onClick={() => setSelectedPartnerId(null)} className={`p-2 rounded-full flex items-center gap-1.5 font-bold transition-all ${isDay ? 'hover:bg-zinc-100' : 'hover:bg-zinc-800'}`}>
                <ChevronLeft size={20} className="text-blue-600" />
              </button>
            )}
            {selectedPartnerId && activeConversation ? (
              <div className="flex items-center gap-2">
                <img src={activeConversation.partnerAvatar || `https://ui-avatars.com/api/?name=${activeConversation.partnerName}&background=0D8ABC&color=fff`} className="w-9 h-9 rounded-full object-cover shadow" alt="" />
                <h2 className="text-sm font-black tracking-tight">{activeConversation.partnerName}</h2>
              </div>
            ) : (
              <h2 className="text-sm font-black tracking-tight ml-2">Bate-Papos</h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setManualOverride(prev => (prev === null ? !autoIsDay : !prev))} className={`p-2.5 rounded-full ${isDay ? 'bg-zinc-100 text-black' : 'bg-zinc-800 text-white'}`}><Sun size={15} className={isDay ? 'text-amber-500' : 'text-zinc-400'} /></button>
            <button onClick={onClose} className={`p-2.5 rounded-full ${isDay ? 'bg-zinc-100 text-black' : 'bg-zinc-800 text-white'}`}><X size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedPartnerId ? (
            <div className="overflow-y-auto flex-1 space-y-1 p-2">
              {loading ? ( <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-blue-600" /></div> ) 
              : conversations.length === 0 ? ( <div className="text-center py-20 opacity-50"><MessageSquare size={36} className="mx-auto mb-2" /><p>Nenhuma mensagem.</p></div> ) 
              : conversations.map(conv => (
                  <div key={conv.partnerId} onClick={() => handleOpenConversation(conv.partnerId)} className={`p-3 rounded-2xl cursor-pointer flex items-center gap-3 ${isDay ? 'hover:bg-zinc-100' : 'hover:bg-zinc-800/60'}`}>
                    <img src={conv.partnerAvatar || `https://ui-avatars.com/api/?name=${conv.partnerName}&background=0D8ABC&color=fff`} className="w-12 h-12 rounded-full object-cover shrink-0" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{conv.partnerName}</p>
                      <p className={`text-xs truncate ${conv.unreadCount > 0 ? (isDay ? 'text-black font-bold' : 'text-white font-bold') : 'text-zinc-500'}`}>
                        {conv.messages[conv.messages.length - 1]?.text}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{conv.unreadCount}</span>}
                  </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeConversation?.messages.map((msg, i) => {
                  const isMine = msg.senderId === myUid;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[75%] ${isMine ? 'ml-auto' : 'mr-auto'}`}>
                      <div className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words border ${isMine ? 'bg-blue-600 text-white rounded-l-2xl rounded-tr-2xl border-blue-600' : `${bgBubbleReceiver} rounded-r-2xl rounded-tl-2xl`}`}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1 flex items-center gap-1">
                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'agora'}
                        {isMine && msg.read && <CheckCheck size={11} className="text-blue-500" />}
                      </span>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendReply} className={`p-3 border-t flex gap-2 items-center ${isDay ? 'border-zinc-200' : 'border-zinc-800'}`}>
                <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Mensagem..." className={`flex-1 rounded-full px-4 py-2.5 text-sm focus:outline-none ${isDay ? 'bg-zinc-100 text-black' : 'bg-zinc-800 text-white'}`} />
                <button type="submit" disabled={sending || !replyText.trim()} className="bg-blue-600 disabled:opacity-50 text-white p-2.5 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95">
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};