// FriendsPage.tsx — ecrã inteiro de Amigos (Bazar TV)
// Abre como página própria (sem sobreposição escura tipo modal) — fundo opaco claro/escuro
// consoante a hora do dia, para parecer parte nativa da app. Segue a mesma stack e padrões
// (Firestore arrayUnion/arrayRemove, writeBatch) já usados no resto do projeto.
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../shared/services/firebase';
import { useAuth } from '../../../modules/auth/auth.hooks';
import {
  doc, getDoc, getDocs, collection, query, limit,
  arrayUnion, arrayRemove, writeBatch
} from 'firebase/firestore';
import { ArrowLeft, UserPlus, UserCheck, UserX, Users, Search, Loader2, Clock } from 'lucide-react';

interface FriendUser {
  id: string;
  name?: string;
  profileImage?: string;
}

interface FriendsPageProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

type FriendsTab = 'sugestoes' | 'recebidos' | 'enviados' | 'amigos';

// Mesmo hook de tema dia/noite usado no Profile, ClipFeed e Mensagens — automático, por hora.
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

export const FriendsPage: React.FC<FriendsPageProps> = ({ isOpen, onClose, onShowToast }) => {
  const isDay = useTimeBasedTheme();
  const { user } = useAuth();
  const myUid = user?.uid || '';

  const [activeTab, setActiveTab] = useState<FriendsTab>('sugestoes');
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [myFriendIds, setMyFriendIds] = useState<string[]>([]);
  const [incomingIds, setIncomingIds] = useState<string[]>([]);
  const [outgoingIds, setOutgoingIds] = useState<string[]>([]);

  const [suggestions, setSuggestions] = useState<FriendUser[]>([]);
  const [incomingUsers, setIncomingUsers] = useState<FriendUser[]>([]);
  const [outgoingUsers, setOutgoingUsers] = useState<FriendUser[]>([]);
  const [friendUsers, setFriendUsers] = useState<FriendUser[]>([]);

  const showToast = (msg: string) => onShowToast?.(msg);

  const fetchUsersByIds = async (ids: string[]): Promise<FriendUser[]> => {
    if (ids.length === 0) return [];
    const snaps = await Promise.all(ids.map(id => getDoc(doc(db, 'users', id))));
    return snaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() } as FriendUser));
  };

  const loadAll = useCallback(async () => {
    if (!myUid) return;
    setLoading(true);
    try {
      const meSnap = await getDoc(doc(db, 'users', myUid));
      const data = meSnap.exists() ? meSnap.data() : {};
      const friends: string[] = data.friends || [];
      const inReq: string[] = data.incomingRequests || [];
      const outReq: string[] = data.outgoingRequests || [];
      setMyFriendIds(friends);
      setIncomingIds(inReq);
      setOutgoingIds(outReq);

      const [incomingList, outgoingList, friendsList] = await Promise.all([
        fetchUsersByIds(inReq),
        fetchUsersByIds(outReq),
        fetchUsersByIds(friends)
      ]);
      setIncomingUsers(incomingList);
      setOutgoingUsers(outgoingList);
      setFriendUsers(friendsList);

      // Sugestões: alguns utilizadores que ainda não são amigos nem têm pedido pendente.
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(20)));
      const excluded = new Set([myUid, ...friends, ...inReq, ...outReq]);
      const sugg = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as FriendUser))
        .filter(u => !excluded.has(u.id))
        .slice(0, 10);
      setSuggestions(sugg);
    } catch (e) {
      console.error('Erro ao carregar amigos:', e);
    } finally {
      setLoading(false);
    }
  }, [myUid]);

  useEffect(() => {
    if (isOpen) loadAll();
  }, [isOpen, loadAll]);

  const handleSendRequest = async (targetId: string) => {
    if (!myUid) return;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', myUid), { outgoingRequests: arrayUnion(targetId) });
      batch.update(doc(db, 'users', targetId), { incomingRequests: arrayUnion(myUid) });
      await batch.commit();
      setOutgoingIds(prev => [...prev, targetId]);
      const target = suggestions.find(u => u.id === targetId);
      if (target) setOutgoingUsers(prev => [...prev, target]);
      setSuggestions(prev => prev.filter(u => u.id !== targetId));
      showToast('Pedido de amizade enviado!');
    } catch (e) { console.error(e); showToast('Erro ao enviar pedido.'); }
  };

  const handleCancelRequest = async (targetId: string) => {
    if (!myUid) return;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', myUid), { outgoingRequests: arrayRemove(targetId) });
      batch.update(doc(db, 'users', targetId), { incomingRequests: arrayRemove(myUid) });
      await batch.commit();
      setOutgoingIds(prev => prev.filter(id => id !== targetId));
      setOutgoingUsers(prev => prev.filter(u => u.id !== targetId));
      showToast('Pedido cancelado.');
    } catch (e) { console.error(e); }
  };

  const handleAcceptRequest = async (targetId: string) => {
    if (!myUid) return;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', myUid), { incomingRequests: arrayRemove(targetId), friends: arrayUnion(targetId) });
      batch.update(doc(db, 'users', targetId), { outgoingRequests: arrayRemove(myUid), friends: arrayUnion(myUid) });
      await batch.commit();
      setIncomingIds(prev => prev.filter(id => id !== targetId));
      setMyFriendIds(prev => [...prev, targetId]);
      const acceptedUser = incomingUsers.find(u => u.id === targetId);
      setIncomingUsers(prev => prev.filter(u => u.id !== targetId));
      if (acceptedUser) setFriendUsers(prev => [...prev, acceptedUser]);
      showToast('Agora são amigos!');
    } catch (e) { console.error(e); showToast('Erro ao aceitar pedido.'); }
  };

  const handleDeclineRequest = async (targetId: string) => {
    if (!myUid) return;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', myUid), { incomingRequests: arrayRemove(targetId) });
      batch.update(doc(db, 'users', targetId), { outgoingRequests: arrayRemove(myUid) });
      await batch.commit();
      setIncomingIds(prev => prev.filter(id => id !== targetId));
      setIncomingUsers(prev => prev.filter(u => u.id !== targetId));
    } catch (e) { console.error(e); }
  };

  if (!isOpen) return null;

  const bgClass = isDay ? 'bg-white text-black' : 'bg-[#141414] text-white';
  const borderClass = isDay ? 'border-zinc-200' : 'border-zinc-800';
  const cardClass = isDay ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800';
  const mutedClass = isDay ? 'text-zinc-500' : 'text-zinc-400';

  const visibleSuggestions = searchText.trim()
    ? suggestions.filter(u => u.name?.toLowerCase().includes(searchText.trim().toLowerCase()))
    : suggestions;

  const renderUserRow = (u: FriendUser, action: React.ReactNode) => (
    <div key={u.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${cardClass}`}>
      <div className="w-11 h-11 rounded-full bg-zinc-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm text-white">
        {u.profileImage ? <img src={u.profileImage} className="w-full h-full object-cover" alt="" /> : (u.name?.charAt(0).toUpperCase() || '?')}
      </div>
      <span className="flex-1 min-w-0 font-bold text-sm truncate">{u.name || 'Utilizador'}</span>
      {action}
    </div>
  );

  return (
    <div
      className={`fixed inset-0 z-[500] ${bgClass} flex flex-col`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${borderClass} shrink-0`}>
        <button onClick={onClose} className={`p-2 rounded-full ${isDay ? 'bg-zinc-100' : 'bg-zinc-900'}`} aria-label="Voltar">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-black flex items-center gap-2"><Users size={18} className="text-red-500" /> Amigos</h1>
      </div>

      <div className={`px-4 py-3 border-b ${borderClass} shrink-0`}>
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isDay ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
          <Search size={16} className={mutedClass} />
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Encontrar amigos pelo nome..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className={`flex items-center gap-1 px-4 py-2 overflow-x-auto shrink-0 border-b ${borderClass}`}>
        {[
          { id: 'sugestoes', label: 'Sugestões' },
          { id: 'recebidos', label: `Recebidos${incomingIds.length ? ` (${incomingIds.length})` : ''}` },
          { id: 'enviados', label: 'Enviados' },
          { id: 'amigos', label: `Amigos (${myFriendIds.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FriendsTab)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id ? 'bg-red-600 text-white' : (isDay ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-900 text-zinc-400')
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-red-500" /></div>
        ) : activeTab === 'sugestoes' ? (
          visibleSuggestions.length === 0 ? (
            <p className={`text-center text-xs py-16 ${mutedClass}`}>Sem sugestões por agora.</p>
          ) : visibleSuggestions.map(u => renderUserRow(u,
            <button onClick={() => handleSendRequest(u.id)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shrink-0">
              <UserPlus size={13} /> Adicionar
            </button>
          ))
        ) : activeTab === 'recebidos' ? (
          incomingUsers.length === 0 ? (
            <p className={`text-center text-xs py-16 ${mutedClass}`}>Nenhum pedido recebido.</p>
          ) : incomingUsers.map(u => renderUserRow(u,
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => handleAcceptRequest(u.id)} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full" aria-label="Aceitar"><UserCheck size={14} /></button>
              <button onClick={() => handleDeclineRequest(u.id)} className={`p-2 rounded-full ${isDay ? 'bg-zinc-200 text-zinc-600' : 'bg-zinc-800 text-zinc-400'}`} aria-label="Recusar"><UserX size={14} /></button>
            </div>
          ))
        ) : activeTab === 'enviados' ? (
          outgoingUsers.length === 0 ? (
            <p className={`text-center text-xs py-16 ${mutedClass}`}>Nenhum pedido enviado.</p>
          ) : outgoingUsers.map(u => renderUserRow(u,
            <button onClick={() => handleCancelRequest(u.id)} className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shrink-0 ${isDay ? 'bg-zinc-200 text-zinc-700' : 'bg-zinc-800 text-zinc-300'}`}>
              <Clock size={13} /> Cancelar
            </button>
          ))
        ) : (
          friendUsers.length === 0 ? (
            <p className={`text-center text-xs py-16 ${mutedClass}`}>Ainda não tens amigos adicionados.</p>
          ) : friendUsers.map(u => renderUserRow(u, <UserCheck size={16} className="text-green-500 shrink-0" />))
        )}
      </div>
    </div>
  );
};

export default FriendsPage;