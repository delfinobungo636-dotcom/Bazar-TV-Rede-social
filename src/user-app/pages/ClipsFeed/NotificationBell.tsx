// ==========================================
// src/features/notifications/NotificationBell.tsx
//
// Componente autossuficiente: mete <NotificationBell /> algures no
// teu cabeçalho (ex: ao lado do logo "BAZAR TV") e ele trata de tudo —
// escuta em tempo real, mostra badge de não-lidas, abre o painel.
// ==========================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../../shared/services/firebase';
import { useAuth } from '../../../modules/auth/auth.hooks';
import { Bell, X, Heart, MessageCircle, CornerDownRight, Loader2 } from 'lucide-react';

interface NotificationItem {
  id: string;
  recipientId: string;
  type: 'comment' | 'reply' | 'clip_like' | 'comment_like';
  actorId: string;
  actorName: string;
  actorImage?: string;
  clipId: string;
  commentId?: string;
  textPreview?: string;
  createdAt: any;
  read: boolean;
}

const ICONS_BY_TYPE: Record<NotificationItem['type'], React.ReactNode> = {
  comment: <MessageCircle size={14} className="text-blue-400" />,
  reply: <CornerDownRight size={14} className="text-blue-400" />,
  clip_like: <Heart size={14} className="text-red-500 fill-red-500" />,
  comment_like: <Heart size={14} className="text-red-500 fill-red-500" />
};

const TEXT_BY_TYPE: Record<NotificationItem['type'], string> = {
  comment: 'comentou no teu corte',
  reply: 'respondeu-te',
  clip_like: 'gostou do teu corte',
  comment_like: 'gostou do teu comentário'
};

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items: NotificationItem[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotificationItem));
        setNotifications(items);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar notificações:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Agora';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInSeconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Agora mesmo';
    if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)}h`;
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  const handleOpenNotification = async (notif: NotificationItem) => {
    if (!notif.read) {
      try {
        await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      } catch (err) {
        console.error('Erro ao marcar como lida:', err);
      }
    }
    setIsOpen(false);
    // Leva o utilizador para os Cortes; para abrir já o corte e o
    // comentário exatos, passa notif.clipId/notif.commentId na querystring
    // e trata isso no ClipFeed quando estiveres pronto para essa parte.
    navigate(`/clips?clip=${notif.clipId}${notif.commentId ? `&comment=${notif.commentId}` : ''}`);
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }));
      await batch.commit();
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative text-white p-2 rounded-full hover:bg-white/10 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 border border-black">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-[#141414] w-full max-w-lg h-[85vh] max-h-[88vh] rounded-t-3xl border-t border-zinc-800 flex flex-col shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-[#141414] select-none flex-shrink-0 z-10">
              <span className="font-black text-xs uppercase tracking-wider text-white">
                Notificações {unreadCount > 0 && `(${unreadCount})`}
              </span>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-bold text-zinc-400 hover:text-white"
                  >
                    Marcar todas como lidas
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-[#141414] pb-safe">
              {loading ? (
                <div className="text-center text-zinc-500 text-xs font-bold uppercase tracking-widest py-10 flex flex-col items-center gap-2">
                  <Loader2 size={18} className="animate-spin text-red-500" />
                  <span>A carregar notificações...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center text-zinc-500 text-xs py-10">
                  Ainda não tens notificações. Quando alguém comentar, responder ou gostar do teu conteúdo, aparece aqui.
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleOpenNotification(n)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${
                      n.read ? 'bg-transparent hover:bg-zinc-900' : 'bg-zinc-900/80 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-black text-red-500 border border-zinc-700 relative">
                      {n.actorImage ? (
                        <img src={n.actorImage} alt={n.actorName} className="w-full h-full object-cover" />
                      ) : (
                        n.actorName?.charAt(0)?.toUpperCase() || '?'
                      )}
                      <span className="absolute -bottom-1 -right-1 bg-zinc-950 rounded-full p-0.5 border border-zinc-800">
                        {ICONS_BY_TYPE[n.type]}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-200 leading-snug">
                        <span className="font-bold text-white">{n.actorName}</span>{' '}
                        {TEXT_BY_TYPE[n.type]}
                      </p>
                      {n.textPreview && (
                        <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{n.textPreview}</p>
                      )}
                      <span className="text-[10px] text-zinc-600 font-medium mt-0.5 block">{formatTime(n.createdAt)}</span>
                    </div>

                    {!n.read && <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;