// Profile/index.tsx — Bazar TV Profile System V8 (Final com Messenger Modal e Modo Dia/Noite)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { db, storage } from '../../../shared/services/firebase';
import { useAuth } from '../../../modules/auth/auth.hooks';
import {
  doc, updateDoc, getDoc, getDocs, collection, query, where,
  serverTimestamp, arrayUnion, arrayRemove, increment, writeBatch, addDoc, deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  PlusCircle, X, Users, UserPlus, UserCheck, 
  Star, MessageSquare, Play, ShieldCheck, Camera, 
  Trash2, Video, UploadCloud, CheckCircle2,
  Settings, Award, Edit3, Plus,
  Lock, Key, ShieldAlert, Smartphone, EyeOff, HelpCircle, ChevronRight, Activity, Clock, Film, BarChart2, Send, AtSign, Sparkles, Heart, MapPin, Globe, ChevronLeft, CheckCheck
} from 'lucide-react';
import { StoryViewer, StoryItem } from '../../../modules/Story/StoryViewer';
import { StoryCreator } from '../../../modules/Story/StoryCreator';
import { ProfileMediaModal } from './ProfileMediaModal';

export interface User {
  id?: string; uid?: string; name?: string; email?: string; role?: string; profileImage?: string; coverImage?: string;
  watchTimeSeconds?: number; myList?: string[]; savedClips?: string[]; favoriteClips?: string[];
  followersCount?: number; followingCount?: number; followers?: string[]; following?: string[];
  bio?: string; verified?: boolean; createdAt?: any; plan?: string; isSubscriber?: boolean;
  address?: string; country?: string;
}

export interface ContentItem { id: string; title: string; coverUrl: string; thumbnailUrl?: string; duration?: string; progress?: number; category?: string; description?: string; isBazarExclusive?: boolean; videoUrl?: string; }
export interface ClipItem { id: string; title: string; description?: string; videoUrl: string; publisherId?: string; publisherName?: string; publisherAvatar?: string; userId?: string; likedBy?: string[]; viewedBy?: string[]; guestViewedBy?: string[]; viewsCount?: number; createdAt?: any; }
export interface MessageItem { id: string; senderId: string; senderName: string; senderAvatar?: string; receiverId: string; text: string; read: boolean; createdAt?: any; }
export interface UserProfileProps { user?: User | any; content?: ContentItem[]; onBack?: () => void; onPlay?: (item: ContentItem) => void; onUpdateUser?: (u: Partial<User>) => void; onLogout?: () => void; }

type ProfileTab = 'cortes' | 'reels' | 'mylist' | 'history' | 'mentions' | 'about';
type SettingsSectionType = 'main' | 'activity' | 'privacy' | 'notifications' | 'sessions' | 'twofa' | 'help' | 'security';

const FOLLOW_LIST_BATCH = 60;

const Toast: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-white text-black px-5 sm:px-6 py-3 rounded-full shadow-2xl z-[500] flex items-center gap-3 animate-bounce border border-zinc-200 max-w-[90vw]">
    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
    <span className="font-bold text-sm tracking-wide truncate">{message}</span>
  </div>
);

const formatCount = (num: number = 0): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + ' mi';
  if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + ' mil';
  return num.toString();
};

// Hook global de Dia/Noite
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

const useModalLifecycle = (isOpen: boolean, onClose: () => void) => {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = prevOverflow; window.removeEventListener('keydown', handleKey); };
  }, [isOpen, onClose]);
};

interface ConversationGroup { partnerId: string; partnerName: string; partnerAvatar?: string; messages: MessageItem[]; unreadCount: number; lastMessageTime: any; }

// NOVO MODAL ESTILO MESSENGER META
const ProfileInboxModal: React.FC<{ isOpen: boolean; onClose: () => void; myUid: string; myName: string; myAvatar?: string; onShowToast: (msg: string) => void; isDay: boolean; }> = ({ isOpen, onClose, myUid, myName, myAvatar, onShowToast, isDay }) => {
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useModalLifecycle(isOpen, onClose);

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
            groupMap.set(partnerId, { 
              partnerId, 
              partnerName: isMeSender ? 'Utilizador' : (msg.senderName || `ID: ${partnerId.slice(0, 6)}`), 
              partnerAvatar: isMeSender ? undefined : msg.senderAvatar, 
              messages: [], 
              unreadCount: 0, 
              lastMessageTime: msg.createdAt 
            });
          }
          const group = groupMap.get(partnerId)!;
          group.messages.push(msg);
          group.lastMessageTime = msg.createdAt;
          if (!isMeSender && msg.senderName && msg.senderName !== 'Utilizador') { 
            group.partnerName = msg.senderName; 
            group.partnerAvatar = msg.senderAvatar || group.partnerAvatar; 
          }
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
  const bgBubbleReceiver = isDay ? 'bg-zinc-100 text-black' : 'bg-zinc-800 text-white';

  return (
    <div className="fixed inset-0 backdrop-blur-md z-[500] flex items-center justify-center p-2 sm:p-4 animate-fade-in text-left transition-colors" style={{ backgroundColor: isDay ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.85)' }}>
      <div className={`w-full max-w-2xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all border ${bgModal} ${textModal} ${borderModal}`}>
        
        {/* Cabeçalho */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${borderModal}`}>
          <div className="flex items-center gap-3">
            {selectedPartnerId && (
              <button onClick={() => setSelectedPartnerId(null)} className={`p-1.5 rounded-full flex items-center transition-all ${isDay ? 'hover:bg-zinc-100 text-blue-600' : 'hover:bg-zinc-800 text-blue-500'}`}>
                <ChevronLeft size={22} />
              </button>
            )}
            {selectedPartnerId && activeConversation ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {activeConversation.partnerAvatar ? <img src={activeConversation.partnerAvatar} alt="" className="w-full h-full object-cover" /> : activeConversation.partnerName.charAt(0)}
                </div>
                <h2 className="text-sm font-black truncate">{activeConversation.partnerName}</h2>
              </div>
            ) : (
              <h2 className="text-sm font-black flex items-center gap-2"><MessageSquare size={18} className="text-blue-500" /> Bate-Papos</h2>
            )}
          </div>
          <button onClick={onClose} className={`p-2 rounded-full transition-all ${isDay ? 'bg-zinc-100 hover:bg-zinc-200 text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}><X size={16} /></button>
        </div>

        {/* Corpo principal */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedPartnerId ? (
            <div className="overflow-y-auto flex-1 p-3 space-y-1">
              {loading ? ( <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-600" /></div> ) 
              : conversations.length === 0 ? ( <div className="text-center py-20 opacity-50 text-sm font-bold">Nenhuma conversa pendente.</div> ) 
              : conversations.map(conv => (
                  <div key={conv.partnerId} onClick={() => handleOpenConversation(conv.partnerId)} className={`p-3 rounded-2xl cursor-pointer flex items-center gap-3 transition-colors ${isDay ? 'hover:bg-zinc-100' : 'hover:bg-zinc-800/60'}`}>
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden relative">
                      {conv.partnerAvatar ? <img src={conv.partnerAvatar} alt="" className="w-full h-full object-cover" /> : conv.partnerName.charAt(0)}
                      {conv.unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white" />}
                    </div>
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
                {activeConversation?.messages.map(msg => {
                  const isMine = msg.senderId === myUid;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[80%] ${isMine ? 'ml-auto' : 'mr-auto'}`}>
                      <div className={`px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${isMine ? 'bg-blue-600 text-white rounded-l-2xl rounded-tr-2xl shadow-sm' : `${bgBubbleReceiver} rounded-r-2xl rounded-tl-2xl shadow-sm border ${borderModal}`}`}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1 flex items-center gap-1 font-medium">
                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'agora'}
                        {isMine && msg.read && <CheckCheck size={11} className="text-blue-500" />}
                      </span>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendReply} className={`p-3 border-t flex gap-2 items-center ${borderModal}`}>
                <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Escreve uma mensagem..." className={`flex-1 rounded-full px-4 py-2.5 text-sm focus:outline-none ${isDay ? 'bg-zinc-100 text-black' : 'bg-zinc-900 text-white border border-zinc-800'}`} />
                <button type="submit" disabled={sending || !replyText.trim()} className="bg-blue-600 disabled:opacity-50 text-white p-2.5 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform">
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

const UserProfile: React.FC<UserProfileProps> = ({ user: parentUser, content = [], onBack, onPlay, onUpdateUser, onLogout }) => {
  const isDay = useTimeBasedTheme();
  const { userData, user: authUser } = useAuth();
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();

  const myUid: string = authUser?.uid || parentUser?.uid || parentUser?.id || '';
  const targetUserId: string = routeUserId || myUid;
  const isOwnProfile: boolean = !routeUserId || routeUserId === myUid;

  const profileImageRef = useRef<HTMLInputElement>(null);
  const coverImageRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<ProfileTab>('cortes');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [realHistory, setRealHistory] = useState<ContentItem[]>([]);
  const [otherProfileData, setOtherProfileData] = useState<User | null>(null);
  const displayUser: User = isOwnProfile ? (userData || parentUser || {}) : (otherProfileData || {});
  
  const userHasBazarSubscription = Boolean(displayUser.isSubscriber || displayUser.plan === 'bazar_vip' || displayUser.plan === 'vip' || displayUser.plan === 'Pro' || displayUser.role === 'subscriber');

  const [savedClipsList, setSavedClipsList] = useState<ClipItem[]>([]);
  const [publishedClipsList, setPublishedClipsList] = useState<ClipItem[]>([]);
  const [savedFilter, setSavedFilter] = useState<'todos' | 'favoritos'>('todos');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [historySubTab, setHistorySubTab] = useState<'viewed' | 'bazar_exclusive'>('viewed');

  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [totalLikesCount, setTotalLikesCount] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);

  const [userStories, setUserStories] = useState<StoryItem[]>([]);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState<boolean>(false);
  const [isStoryCreatorOpen, setIsStoryCreatorOpen] = useState<boolean>(false);

  const [activeMediaClipId, setActiveMediaClipId] = useState<string | null>(null);

  const [isInboxOpen, setIsInboxOpen] = useState<boolean>(false);
  const [isQuickSendOpen, setIsQuickSendOpen] = useState<boolean>(false);
  const [quickMsgText, setQuickMsgText] = useState<string>('');

  const [isFollowModalOpen, setIsFollowModalOpen] = useState<boolean>(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  const [followModalUsers, setFollowModalUsers] = useState<User[]>([]);
  const [followModalTotal, setFollowModalTotal] = useState<number>(0);
  const [loadingFollowModal, setLoadingFollowModal] = useState<boolean>(false);

  const [isLikesModalOpen, setIsLikesModalOpen] = useState<boolean>(false);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [clipTitle, setClipTitle] = useState<string>('');
  const [clipDescription, setClipDescription] = useState<string>('');
  const [clipFile, setClipFile] = useState<File | null>(null);
  const [uploadingClip, setUploadingClip] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editCountry, setEditCountry] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSectionType>('main');

  const [isInsightsOpen, setIsInsightsOpen] = useState<boolean>(false);
  const [uploadingImage, setUploadingImage] = useState<'profile' | 'cover' | null>(null);

  const showToast = useCallback((msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); }, []);
  const getRealClipViews = useCallback((clip: ClipItem): number => { const real = (clip.viewedBy?.length || 0) + (clip.guestViewedBy?.length || 0); return real > 0 ? real : (clip.viewsCount || 0); }, []);
  const sortedPublishedClips = [...publishedClipsList].sort((a, b) => getRealClipViews(b) - getRealClipViews(a));

  const loadHistory = useCallback(() => { const cached = localStorage.getItem('bazar_continue_watching'); if (cached) { try { setRealHistory(JSON.parse(cached)); } catch (e) { console.error(e); } } }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleClearAllHistory = () => { if (!window.confirm("Limpar todo o histórico?")) return; localStorage.removeItem('bazar_continue_watching'); setRealHistory([]); showToast("Histórico limpo."); };

  useEffect(() => {
    const fetchProfileAndStories = async () => {
      if (!targetUserId) return;
      try {
        let targetData: any = userData;
        if (!isOwnProfile) {
          const targetSnap = await getDoc(doc(db, 'users', targetUserId));
          if (targetSnap.exists()) { targetData = { id: targetSnap.id, role: '', ...targetSnap.data() } as User; setOtherProfileData(targetData); }
        }

        const realFollowers: string[] = targetData?.followers || [];
        const realFollowing: string[] = targetData?.following || [];
        setFollowersCount(targetData?.followers ? realFollowers.length : (targetData?.followersCount || 0));
        setFollowingCount(targetData?.following ? realFollowing.length : (targetData?.followingCount || 0));

        if (targetData?.name) setEditName(targetData.name);
        if (targetData?.bio) setEditBio(targetData.bio);
        if (targetData?.email) setEditEmail(targetData.email);
        if (targetData?.address) setEditAddress(targetData.address);
        if (targetData?.country) setEditCountry(targetData.country);

        if (!isOwnProfile && myUid) {
          const meSnap = await getDoc(doc(db, 'users', myUid));
          if (meSnap.exists()) { const myFollowing: string[] = meSnap.data().following || []; setIsFollowing(myFollowing.includes(targetUserId)); }
        }

        const storiesSnap = await getDocs(query(collection(db, 'stories'), where('userId', '==', targetUserId)));
        setUserStories(storiesSnap.docs.map(d => ({ id: d.id, ...d.data() } as StoryItem)));
      } catch (e) { console.error("Erro ao carregar perfil/stories:", e); }
    };
    fetchProfileAndStories();
  }, [targetUserId, isOwnProfile, myUid, userData, isStoryCreatorOpen]);

  useEffect(() => {
    const fetchClips = async () => {
      if (!targetUserId) return;
      try {
        const clipsSnap = await getDocs(collection(db, "clips"));
        const fetched = clipsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClipItem));
        const published = fetched.filter(c => c.userId === targetUserId || c.publisherId === targetUserId);
        setPublishedClipsList(published);

        setTotalLikesCount(published.reduce((acc, c) => acc + (c.likedBy?.length || 0), 0));

        if (isOwnProfile && myUid) {
          const meSnap = await getDoc(doc(db, 'users', myUid));
          if (meSnap.exists()) {
            const savedIds: string[] = meSnap.data().savedClips || [];
            setFavoriteIds(meSnap.data().favoriteClips || []);
            setSavedClipsList(fetched.filter(c => savedIds.includes(c.id)));
          }
        } else { setSavedClipsList([]); }
      } catch (e) { console.error(e); }
    };
    fetchClips();
  }, [targetUserId, isOwnProfile, myUid]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file || !myUid) return;
    setUploadingImage(type);
    try {
      const storageRef = ref(storage, `users/${myUid}/${type}_${Date.now()}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on('state_changed', null, () => { showToast("Erro no upload."); setUploadingImage(null); }, async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const fieldToUpdate = type === 'profile' ? 'profileImage' : 'coverImage';
        await updateDoc(doc(db, 'users', myUid), { [fieldToUpdate]: downloadURL });
        if (onUpdateUser) onUpdateUser({ [fieldToUpdate]: downloadURL });
        showToast(`${type === 'profile' ? 'Foto de Perfil' : 'Capa'} atualizada!`);
        setUploadingImage(null);
      });
    } catch (e) { showToast('Falha no upload.'); setUploadingImage(null); }
  };

  const handleToggleFollow = async () => {
    if (!myUid || isOwnProfile || !targetUserId) return;
    setFollowLoading(true);
    try {
      const myRef = doc(db, 'users', myUid); const targetRef = doc(db, 'users', targetUserId); const batch = writeBatch(db);
      if (isFollowing) {
        batch.update(myRef, { following: arrayRemove(targetUserId), followingCount: increment(-1) });
        batch.update(targetRef, { followers: arrayRemove(myUid), followersCount: increment(-1) });
      } else {
        batch.update(myRef, { following: arrayUnion(targetUserId), followingCount: increment(1) });
        batch.update(targetRef, { followers: arrayUnion(myUid), followersCount: increment(1) });
      }
      await batch.commit(); setIsFollowing(!isFollowing); setFollowersCount(prev => isFollowing ? Math.max(0, prev - 1) : prev + 1);
      showToast(isFollowing ? 'Deixaste de seguir.' : `A seguir ${displayUser.name}!`);
    } catch (err) { showToast('Erro ao atualizar.'); } finally { setFollowLoading(false); }
  };

  const handleOpenFollowersModal = async (type: 'followers' | 'following'): Promise<void> => {
    setFollowModalType(type); setIsFollowModalOpen(true); setLoadingFollowModal(true); setFollowModalUsers([]);
    try {
      const targetSnap = await getDoc(doc(db, 'users', targetUserId));
      if (!targetSnap.exists()) { setLoadingFollowModal(false); return; }
      const rawIds: string[] = targetSnap.data()[type] || [];
      const userIds = Array.from(new Set(rawIds.filter(Boolean)));
      if (type === 'followers') setFollowersCount(userIds.length); else setFollowingCount(userIds.length);
      setFollowModalTotal(userIds.length);
      if (userIds.length === 0) { setFollowModalUsers([]); setLoadingFollowModal(false); return; }
      const idsToFetch = userIds.slice(0, FOLLOW_LIST_BATCH);
      const snaps = await Promise.all(idsToFetch.map(id => getDoc(doc(db, 'users', id))));
      setFollowModalUsers(snaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() } as User)));
    } catch (e) { showToast("Erro ao carregar lista."); } finally { setLoadingFollowModal(false); }
  };

  const handleSendQuickMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMsgText.trim() || !myUid || !targetUserId) return;
    try {
      await addDoc(collection(db, 'messages'), { senderId: myUid, senderName: authUser?.displayName || displayUser.name || 'Membro', senderAvatar: authUser?.photoURL || displayUser.profileImage || '', receiverId: targetUserId, text: quickMsgText.trim(), read: false, createdAt: serverTimestamp() });
      setQuickMsgText(''); setIsQuickSendOpen(false); showToast(`Mensagem enviada para ${displayUser.name || 'utilizador'}!`);
    } catch (e) { showToast("Erro ao enviar mensagem."); }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, clipId: string) => {
    e.stopPropagation();
    if (!myUid) return;
    const isFav = favoriteIds.includes(clipId);
    try {
      await updateDoc(doc(db, 'users', myUid), { favoriteClips: isFav ? arrayRemove(clipId) : arrayUnion(clipId) });
      setFavoriteIds(prev => isFav ? prev.filter(id => id !== clipId) : [...prev, clipId]);
      showToast(isFav ? 'Removido dos favoritos.' : 'Adicionado aos favoritos!');
    } catch (err) { showToast('Erro ao atualizar favoritos.'); }
  };

  const handleDeleteClip = async (e: React.MouseEvent, clipId: string) => {
    e.stopPropagation();
    if (!isOwnProfile || !window.confirm("Eliminar este corte permanentemente?")) return;
    try {
      await deleteDoc(doc(db, 'clips', clipId)); setPublishedClipsList(prev => prev.filter(c => c.id !== clipId)); showToast("Corte eliminado.");
    } catch (err) { showToast("Erro ao eliminar."); }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myUid) return;
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', myUid), { name: editName, bio: editBio, email: editEmail, address: editAddress, country: editCountry });
      if (onUpdateUser) onUpdateUser({ name: editName, bio: editBio, email: editEmail, address: editAddress, country: editCountry });
      showToast("Perfil atualizado!"); setIsEditProfileOpen(false);
    } catch (err) { showToast("Erro ao atualizar."); } finally { setSavingProfile(false); }
  };

  const handlePublishClipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clipFile || !clipTitle.trim() || !myUid) { showToast("Preenche título e vídeo."); return; }
    setUploadingClip(true); setUploadProgress(0);
    try {
      const storageRef = ref(storage, `clips/${myUid}/${Date.now()}_${clipFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, clipFile);
      uploadTask.on('state_changed', (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)), () => { showToast("Erro no envio."); setUploadingClip(false); }, async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const newClip: ClipItem = { id: '', title: clipTitle, description: clipDescription, videoUrl: downloadURL, userId: myUid, publisherId: myUid, publisherName: displayUser.name || 'Membro Bazar', publisherAvatar: displayUser.profileImage || '', viewsCount: 0, likedBy: [], viewedBy: [], guestViewedBy: [], createdAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, 'clips'), newClip);
        setPublishedClipsList(prev => [{ ...newClip, id: docRef.id }, ...prev]); showToast("Corte publicado!");
        setClipTitle(''); setClipDescription(''); setClipFile(null); setUploadingClip(false); setIsPublishModalOpen(false);
      });
    } catch (e) { showToast("Erro ao processar."); setUploadingClip(false); }
  };

  const visibleSavedClips: ClipItem[] = savedFilter === 'favoritos' ? savedClipsList.filter(c => favoriteIds.includes(c.id)) : savedClipsList;

  useModalLifecycle(isFollowModalOpen, () => setIsFollowModalOpen(false));
  useModalLifecycle(isLikesModalOpen, () => setIsLikesModalOpen(false));
  useModalLifecycle(isQuickSendOpen, () => setIsQuickSendOpen(false));
  useModalLifecycle(isInsightsOpen, () => setIsInsightsOpen(false));
  useModalLifecycle(isSettingsModalOpen, () => setIsSettingsModalOpen(false));
  useModalLifecycle(isPublishModalOpen, () => { if (!uploadingClip) setIsPublishModalOpen(false); });
  useModalLifecycle(isEditProfileOpen, () => setIsEditProfileOpen(false));

  if (!displayUser || (!isOwnProfile && !otherProfileData)) {
    return ( <div className={`min-h-screen ${isDay ? 'bg-[#f5f5f5] text-black' : 'bg-[#141414] text-white'} flex items-center justify-center`}><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-red-600"></div></div> );
  }

  const textMutedClass = isDay ? 'text-zinc-600' : 'text-zinc-400';
  const inputBgClass = isDay ? 'bg-zinc-100 border-zinc-300 text-black' : 'bg-zinc-900 border-zinc-800 text-white';
  const hasActiveStories = userStories.length > 0;
  const activeMediaList: ClipItem[] = publishedClipsList.length > 0 ? sortedPublishedClips : savedClipsList;
  const exclusiveBazarContent: ContentItem[] = content.filter(item => item.isBazarExclusive || item.category === 'Bazar VIP' || item.duration);
  const memberSinceYear = displayUser.createdAt?.toDate ? displayUser.createdAt.toDate().getFullYear() : '2026';

  return (
    <div className={`min-h-screen transition-colors duration-500 pb-24 font-sans relative ${isDay ? 'bg-[#f5f5f5] text-black' : 'bg-[#141414] text-white'}`}>
      {toastMsg && <Toast message={toastMsg} />}
      <input type="file" ref={profileImageRef} onChange={(e) => handleImageUpload(e, 'profile')} accept="image/*" className="hidden" />
      <input type="file" ref={coverImageRef} onChange={(e) => handleImageUpload(e, 'cover')} accept="image/*" className="hidden" />

      {/* Capa */}
      <div className={`relative h-44 md:h-52 w-full group ${isOwnProfile ? 'cursor-pointer' : ''}`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} onClick={() => isOwnProfile && coverImageRef.current?.click()}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/75 z-10" />
        <img src={displayUser.coverImage || "https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=2031&auto=format&fit=crop"} alt="Capa" className="w-full h-full object-cover absolute inset-0 opacity-80 group-hover:opacity-95 transition-opacity" />
        <div className="absolute left-4 z-20" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
          <button onClick={(e) => { e.stopPropagation(); onBack ? onBack() : navigate(-1); }} className="flex items-center justify-center w-9 h-9 bg-black/55 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all active:scale-95" aria-label="Voltar">←</button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 relative z-20 -mt-32 md:-mt-36">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pb-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full sm:w-auto min-w-0">
            <div className="relative group shrink-0">
              <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 ${isDay ? 'border-white' : 'border-[#141414]'} bg-zinc-900 overflow-hidden shadow-2xl relative p-0.5 ${hasActiveStories ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 cursor-pointer animate-pulse' : 'bg-zinc-700'} ${isOwnProfile && !hasActiveStories ? 'cursor-pointer' : ''}`} onClick={() => { if (hasActiveStories) setIsStoryViewerOpen(true); else if (isOwnProfile) profileImageRef.current?.click(); }}>
                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 relative">
                  {displayUser.profileImage ? ( <img src={displayUser.profileImage} alt="Perfil" className="w-full h-full object-cover" /> ) : ( <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-600 to-black text-white text-2xl font-bold">{displayUser?.name?.charAt(0).toUpperCase() || "?"}</div> )}
                  {isOwnProfile && !hasActiveStories && ( <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera size={20} className="text-white" /></div> )}
                </div>
              </div>
              {isOwnProfile && ( <button onClick={(e) => { e.stopPropagation(); setIsStoryCreatorOpen(true); }} className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-500 text-white rounded-full p-1.5 border-2 border-current shadow-md z-30 transition-transform active:scale-95"><Plus size={13} strokeWidth={3} /></button> )}
            </div>

            <div className="flex flex-col text-left pt-8 sm:pt-20 min-w-0 w-full">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="text-xl md:text-2xl font-black tracking-tight truncate">{displayUser.name || "Bazar TV"}</h1>
                {(followersCount > 50 || displayUser.verified) && <ShieldCheck className="text-blue-500 w-4 h-4 shrink-0" fill="currentColor" />}
              </div>
              <p className={`text-[11px] ${textMutedClass} font-medium truncate`}>@{displayUser.name?.toLowerCase().replace(/\s/g, '') || "bazartv"}</p>
              
              <div className="flex items-center gap-x-3 gap-y-1 text-xs mt-2 flex-wrap">
                <button type="button" onClick={() => handleOpenFollowersModal('followers')} className="cursor-pointer hover:underline"><strong className="font-extrabold">{formatCount(followersCount)}</strong> Seguidores</button>
                <span className="opacity-50">·</span>
                <button type="button" onClick={() => handleOpenFollowersModal('following')} className="cursor-pointer hover:underline"><strong className="font-extrabold">{formatCount(followingCount)}</strong> A Seguir</button>
                <span className="opacity-50">·</span>
                <button type="button" onClick={() => setIsLikesModalOpen(true)} className="flex items-center gap-1 font-extrabold text-red-500 hover:underline"><Heart size={12} className="fill-red-500 text-red-500" /> {formatCount(totalLikesCount)} Gostos</button>
              </div>

              {displayUser.bio && ( <p className={`text-xs ${textMutedClass} mt-1.5 max-w-md line-clamp-2 leading-relaxed break-words`}>{displayUser.bio}</p> )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
            {isOwnProfile ? (
              <>
                <button onClick={() => setIsInboxOpen(true)} className={`w-full sm:w-auto px-6 py-2 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-all duration-300 shadow-sm border ${isDay ? 'bg-zinc-100 border-zinc-300 text-zinc-900 hover:bg-zinc-200' : 'bg-zinc-900/90 border-zinc-700 text-zinc-100 hover:bg-zinc-800' } active:scale-95`}>
                  <MessageSquare size={13} className="text-blue-500 animate-pulse" /> <span>Mensagem</span>
                </button>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-end w-full">
                  <button onClick={() => setIsPublishModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-5 sm:px-6 py-1.5 rounded-full font-bold text-[11px] sm:text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all whitespace-nowrap min-w-[135px] sm:min-w-[150px] justify-center"><PlusCircle size={13} /> <span>Publicar Corte</span></button>
                  <button onClick={() => { setEditName(displayUser.name || ''); setEditBio(displayUser.bio || ''); setEditEmail(displayUser.email || ''); setEditAddress(displayUser.address || ''); setEditCountry(displayUser.country || ''); setIsEditProfileOpen(true); }} className={`px-3 py-1.5 rounded-full font-bold text-[11px] sm:text-xs flex items-center gap-1 transition-all border whitespace-nowrap ${isDay ? 'bg-zinc-100 border-zinc-300 text-black hover:bg-zinc-200' : 'bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800'}`}><Edit3 size={13} /> Editar</button>
                  <button onClick={() => setIsInsightsOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-full font-bold text-[11px] sm:text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all whitespace-nowrap"><BarChart2 size={13} /> Insight</button>
                  <button onClick={() => { setSettingsSection('main'); setIsSettingsModalOpen(true); }} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border shrink-0 ${isDay ? 'bg-zinc-200 border-zinc-300 text-zinc-700 hover:bg-zinc-300' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'}`}><Settings size={13} /></button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2 justify-end w-full">
                <button onClick={handleToggleFollow} disabled={followLoading} className={`px-4 py-2 rounded-full font-bold text-xs shadow-lg active:scale-95 transition-transform flex items-center gap-1 ${isFollowing ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-red-600 hover:bg-red-700 text-white'}`}>{isFollowing ? <><UserCheck size={14} /> A Seguir</> : <><UserPlus size={14} /> Seguir</>}</button>
                <button onClick={() => setIsQuickSendOpen(true)} className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all border shadow-sm ${isDay ? 'bg-zinc-100 border-zinc-300 text-black hover:bg-zinc-200' : 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'}`}><MessageSquare size={13} className="text-blue-500" /> Mensagem</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`w-full h-px ${isDay ? 'bg-zinc-200' : 'bg-white/10'}`} />

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 flex items-center gap-5 sm:gap-6 mt-1 overflow-x-auto custom-scrollbar">
        {[ { id: 'cortes', label: 'Destaques' }, { id: 'reels', label: 'Curtas / Reels' }, { id: 'mylist', label: 'Coleção' }, { id: 'history', label: 'Histórico' }, { id: 'mentions', label: 'Menções' }, { id: 'about', label: 'Sobre' } ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as ProfileTab)} className={`py-3 text-xs md:text-sm font-bold tracking-wide transition-all whitespace-nowrap border-b-2 shrink-0 ${activeTab === tab.id ? (isDay ? 'border-black text-black' : 'border-white text-white') : (isDay ? 'border-transparent text-zinc-500 hover:text-black' : 'border-transparent text-zinc-500 hover:text-zinc-300')}`}>{tab.label}</button>
        ))}
      </div>

      {/* Conteúdo das Tabs */}
      <div className="w-full max-w-7xl mx-auto mt-1">
        {activeTab === 'cortes' && (
          <div className="w-full">
            {sortedPublishedClips.length === 0 ? (
              <div className={`p-16 text-center ${textMutedClass}`}><Video className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-xs font-medium">Nenhum destaque publicado.</p></div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-[2px] w-full bg-black">
                {sortedPublishedClips.map((clip) => {
                  const realViews = getRealClipViews(clip);
                  return (
                    <div key={clip.id} onClick={() => setActiveMediaClipId(clip.id)} className="relative aspect-[9/16] bg-zinc-900 cursor-pointer group overflow-hidden">
                      <video src={clip.videoUrl} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                      <div className="absolute bottom-2 left-2 flex items-center gap-1"><Play size={10} className="fill-white text-white drop-shadow-md" /><span className="text-[11px] font-bold text-white drop-shadow-md">{formatCount(realViews)}</span></div>
                      {isOwnProfile && ( <button onClick={(e) => handleDeleteClip(e, clip.id)} className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"><Trash2 size={11} className="text-white" /></button> )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reels' && ( <div className="p-6 md:p-10 text-center max-w-lg mx-auto space-y-4"><Sparkles className="w-12 h-12 mx-auto text-blue-500 opacity-60" /><h3 className="text-sm font-bold">Curtas e Vídeos Rápidos verticais</h3><p className={`text-xs ${textMutedClass}`}>Espaço dedicado para clipes dinâmicos com alta taxa de retenção.</p></div> )}

        {activeTab === 'mylist' && isOwnProfile && (
          <div className="p-4 md:p-6 space-y-8">
            {content && content.length > 0 && ( <div><h3 className="text-sm font-bold mb-3">Filmes e Séries Guardados</h3><div className="flex gap-[4px] overflow-x-auto custom-scrollbar pb-2">{content.map(item => ( <div key={item.id} onClick={() => onPlay && onPlay(item)} className="flex-none w-24 md:w-32 aspect-[2/3] bg-zinc-900 overflow-hidden cursor-pointer"><img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" /></div> ))}</div></div> )}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">Cortes Guardados</h3>
                <div className={`flex items-center gap-1.5 p-1 rounded-full border ${isDay ? 'bg-zinc-200 border-zinc-300' : 'bg-zinc-900 border-zinc-800'}`}>
                  <button onClick={() => setSavedFilter('todos')} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${savedFilter === 'todos' ? (isDay ? 'bg-black text-white' : 'bg-white text-black') : textMutedClass}`}>Todos</button>
                  <button onClick={() => setSavedFilter('favoritos')} className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${savedFilter === 'favoritos' ? 'bg-amber-500 text-black' : textMutedClass}`}>Favoritos</button>
                </div>
              </div>
              {visibleSavedClips.length === 0 ? ( <div className={`p-12 text-center ${textMutedClass}`}><p className="text-xs">Nenhum corte guardado.</p></div> ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-[2px]">
                  {visibleSavedClips.map((clip) => {
                    const isFav = favoriteIds.includes(clip.id); const realViews = getRealClipViews(clip);
                    return (
                      <div key={clip.id} className="group relative aspect-[9/16] bg-zinc-900 overflow-hidden cursor-pointer" onClick={() => setActiveMediaClipId(clip.id)}>
                        <video src={clip.videoUrl} className="w-full h-full object-cover" muted />
                        <button onClick={(e) => handleToggleFavorite(e, clip.id)} className="absolute top-2 right-2 z-15 opacity-80 hover:opacity-100"><Star size={13} className={isFav ? 'fill-amber-400 text-amber-400' : 'text-white'} /></button>
                        <div className="absolute bottom-2 left-2 flex items-center gap-1"><Play size={10} className="fill-white text-white" /><span className="text-[11px] font-bold text-white">{formatCount(realViews)}</span></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && isOwnProfile && (
          <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-inherit gap-3">
              <div className="flex items-center gap-2"><Clock size={18} className="text-red-500" /><h3 className="text-sm font-bold">Gestão de Histórico & Assinatura</h3></div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setHistorySubTab('viewed')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${historySubTab === 'viewed' ? 'bg-red-600 text-white' : textMutedClass}`}>Vídeos Vistos ({realHistory.length})</button>
                <button onClick={() => setHistorySubTab('bazar_exclusive')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${historySubTab === 'bazar_exclusive' ? 'bg-blue-600 text-white' : textMutedClass}`}><ShieldCheck size={13} /> Exclusivo Bazar TV</button>
                {realHistory.length > 0 && historySubTab === 'viewed' && ( <button onClick={handleClearAllHistory} className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-400 px-3 py-1.5 rounded-full bg-red-500/10"><Trash2 size={13} /> Limpar</button> )}
              </div>
            </div>
            {historySubTab === 'viewed' ? (
              realHistory.length === 0 ? ( <div className={`p-16 text-center ${textMutedClass}`}><Film className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="text-xs font-medium">Ainda não assististe a nenhum conteúdo recentemente.</p></div> ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {realHistory.map((item) => (
                    <div key={item.id} onClick={() => onPlay && onPlay(item)} className={`flex items-center gap-3 p-2.5 rounded-2xl border cursor-pointer transition-all group relative overflow-hidden ${isDay ? 'bg-white border-zinc-200' : 'bg-zinc-900/85 border-zinc-800'}`}>
                      <div className="w-24 aspect-video bg-zinc-900 rounded-xl overflow-hidden shrink-0 relative"><img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Play size={18} className="fill-white text-white drop-shadow-md" /></div></div>
                      <div className="flex-1 min-w-0 pr-6"><h4 className="text-xs font-bold truncate">{item.title}</h4><p className={`text-[10px] ${textMutedClass} mt-0.5 truncate`}>{item.category || 'Filme / Série'}</p><div className="w-full bg-zinc-700/45 h-1.5 rounded-full mt-3 overflow-hidden"><div className="bg-red-600 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(8, item.progress || 35))}%` }} /></div></div>
                      <button onClick={(e) => { e.stopPropagation(); const updated = realHistory.filter(i => i.id !== item.id); setRealHistory(updated); localStorage.setItem('bazar_continue_watching', JSON.stringify(updated)); showToast("Removido."); }} className={`absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isDay ? 'hover:bg-zinc-200 text-zinc-500' : 'hover:bg-zinc-700 text-zinc-400'}`}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${userHasBazarSubscription ? 'bg-blue-950/20 border-blue-500/30 text-blue-300' : 'bg-amber-950/20 border-amber-500/30 text-amber-300'}`}><div className="flex items-center gap-2">{userHasBazarSubscription ? <ShieldCheck size={16} className="text-blue-500" /> : <Lock size={16} className="text-amber-500" />}<span>{userHasBazarSubscription ? 'Acesso total liberado (Assinante VIP Bazar TV)' : 'Acesso restrito apenas a assinantes ativos da Bazar TV.'}</span></div></div>
                {exclusiveBazarContent.length === 0 ? ( <p className={`text-xs text-center py-10 ${textMutedClass}`}>Nenhum conteúdo exclusivo Bazar TV listado no momento.</p> ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {exclusiveBazarContent.map(item => (
                      <div key={item.id} onClick={() => { if (userHasBazarSubscription) { onPlay && onPlay(item); } else { showToast("Conteúdo exclusivo! Assina na Casa Início da Bazar TV."); } }} className={`flex items-center gap-3 p-2.5 rounded-2xl border cursor-pointer transition-all relative ${userHasBazarSubscription ? (isDay ? 'bg-white border-zinc-200' : 'bg-zinc-900/85 border-zinc-800') : 'opacity-75 bg-zinc-900/40 border-zinc-800'}`}>
                        <div className="w-24 aspect-video bg-zinc-900 rounded-xl overflow-hidden shrink-0 relative"><img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />{!userHasBazarSubscription && ( <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Lock size={16} className="text-amber-400" /></div> )}</div>
                        <div className="flex-1 min-w-0"><h4 className="text-xs font-bold truncate">{item.title}</h4><span className="text-[10px] text-blue-400 font-semibold">Exclusivo Bazar TV</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mentions' && ( <div className="p-12 text-center max-w-sm mx-auto space-y-3"><AtSign className="w-10 h-10 mx-auto text-zinc-500 opacity-50" /><h3 className="text-sm font-bold">Menções em Curtas</h3><p className={`text-xs ${textMutedClass}`}>Publicações de outros membros onde {displayUser.name || 'este perfil'} foi marcado.</p></div> )}

        {activeTab === 'about' && (
          <div className="p-6 md:p-12 max-w-xl mx-auto space-y-6">
            <p className={`${textMutedClass} text-xs leading-relaxed text-center break-words`}>{displayUser.bio || "Nenhuma biografia disponibilizada."}</p>
            <div className={`border-t pt-4 flex flex-col gap-3 text-xs ${isDay ? 'border-zinc-200' : 'border-zinc-800'}`}>
              <div className="flex justify-between items-center gap-2 py-1.5 border-b border-inherit"><span className={textMutedClass}>Membro desde</span><span className="font-bold">{memberSinceYear}</span></div>
              <div className="flex justify-between items-center gap-2 py-1.5 border-b border-inherit"><span className={textMutedClass}>Morada</span><span className="font-bold flex items-center gap-1 text-right"><MapPin size={12} className="shrink-0" /> {displayUser.address || 'Não informada'}</span></div>
              <div className="flex justify-between items-center gap-2 py-1.5 border-b border-inherit"><span className={textMutedClass}>País</span><span className="font-bold flex items-center gap-1 text-right"><Globe size={12} className="shrink-0" /> {displayUser.country || 'Não informado'}</span></div>
              <div className="flex justify-between items-center gap-2 py-1.5 border-b border-inherit"><span className={textMutedClass}>Estado da Assinatura</span><span className={userHasBazarSubscription ? 'text-blue-500 font-bold text-right' : 'text-zinc-500 font-medium text-right'}>{userHasBazarSubscription ? 'Assinante Ativo VIP' : 'Nenhuma assinatura'}</span></div>
              <div className="flex justify-between items-center gap-2 py-1.5 border-b border-inherit"><span className={textMutedClass}>Segurança/Conta</span><span className="text-green-500 font-bold flex items-center gap-1"><ShieldCheck size={14} /> Protegida</span></div>
            </div>
            {isOwnProfile && onLogout && ( <button onClick={onLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-xs mt-4">Terminar Sessão</button> )}
          </div>
        )}
      </div>

      {activeMediaClipId && ( <ProfileMediaModal clips={activeMediaList} initialClipId={activeMediaClipId} currentUserId={myUid} onClose={() => setActiveMediaClipId(null)} /> )}

      {/* NOVO MODAL ESTILO MESSENGER EMBUTIDO AQUI */}
      <ProfileInboxModal isOpen={isInboxOpen} onClose={() => setIsInboxOpen(false)} myUid={myUid} myName={displayUser.name || 'Eu'} myAvatar={displayUser.profileImage} onShowToast={showToast} isDay={isDay} />

      {isQuickSendOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[400] flex items-center justify-center p-3 sm:p-4 animate-fade-in text-left">
          <div className="bg-[#181818] border border-zinc-800 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between text-white"><h2 className="text-sm font-bold truncate">Mensagem para {otherProfileData?.name || 'Membro'}</h2><button onClick={() => setIsQuickSendOpen(false)} className="p-1.5 bg-zinc-800 rounded-full text-zinc-400 hover:text-white shrink-0"><X size={15} /></button></div>
            <form onSubmit={handleSendQuickMessage} className="p-5 space-y-4 text-xs">
              <textarea value={quickMsgText} onChange={e => setQuickMsgText(e.target.value)} placeholder="Escreve a tua mensagem..." rows={3} required className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 resize-none" />
              <button type="submit" className="w-full py-3 rounded-full font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg">Enviar Mensagem</button>
            </form>
          </div>
        </div>
      )}

      {isInsightsOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[400] flex items-center justify-center p-3 sm:p-4 animate-fade-in text-left">
          <div className={`${isDay ? 'bg-white text-black' : 'bg-[#181818] text-white border-zinc-800'} border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl`}>
            <div className="p-4 border-b flex items-center justify-between border-inherit"><div className="flex items-center gap-2 text-blue-500 font-bold text-sm"><BarChart2 size={18} /> Insights do Perfil</div><button onClick={() => setIsInsightsOpen(false)} className={`p-1.5 rounded-full ${isDay ? 'bg-zinc-100 text-zinc-500' : 'bg-zinc-800 text-zinc-400'}`}><X size={15} /></button></div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-4 rounded-2xl border ${isDay ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}><p className={textMutedClass}>Total Views Destaques</p><p className="text-lg font-black mt-1">{formatCount(sortedPublishedClips.reduce((acc, c) => acc + getRealClipViews(c), 0))}</p></div>
                <div className={`p-4 rounded-2xl border ${isDay ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}><p className={textMutedClass}>Gostos Totais</p><p className="text-lg font-black mt-1 text-red-500">{formatCount(totalLikesCount)}</p></div>
              </div>
              <p className={`text-[11px] ${textMutedClass} text-center pt-2`}>Dados analíticos filtrados da categoria de interatividade da conta.</p>
            </div>
          </div>
        </div>
      )}

      {isLikesModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[400] flex items-center justify-center p-3 sm:p-4 animate-fade-in text-left" onClick={() => setIsLikesModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className={`${isDay ? 'bg-white text-black' : 'bg-[#181818] text-white border-zinc-800'} border w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl`}>
            <div className="p-4 border-b flex items-center justify-between border-inherit"><div className="flex items-center gap-2 text-red-500 font-bold text-sm"><Heart size={16} className="fill-red-500" /> Gostos</div><button onClick={() => setIsLikesModalOpen(false)} className={`p-1.5 rounded-full ${isDay ? 'bg-zinc-100 text-zinc-500' : 'bg-zinc-800 text-zinc-400'}`}><X size={15} /></button></div>
            <div className="p-6 text-center space-y-2"><p className="text-3xl font-black text-red-500">{formatCount(totalLikesCount)}</p><p className={`text-xs ${textMutedClass} leading-relaxed`}>Até ao momento, <strong className={isDay ? 'text-black' : 'text-white'}>{displayUser.name || 'este perfil'}</strong> já recebeu <strong>{totalLikesCount.toLocaleString('pt-PT')}</strong> gostos dentro da Bazar TV.</p></div>
          </div>
        </div>
      )}

      {isStoryViewerOpen && ( <StoryViewer stories={userStories} currentUserId={myUid} onClose={() => setIsStoryViewerOpen(false)} onShowToast={showToast} isOwner={isOwnProfile} /> )}
      {isStoryCreatorOpen && ( <StoryCreator isOpen={isStoryCreatorOpen} onClose={() => setIsStoryCreatorOpen(false)} user={displayUser} onShowToast={showToast} /> )}

      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[350] flex items-center justify-center p-3 sm:p-4 animate-fade-in text-left">
          <div className={`${isDay ? 'bg-white text-black' : 'bg-[#181818] text-white border-zinc-800'} border w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDay ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800 bg-zinc-900/60'}`}>
              <div className="flex items-center gap-2 min-w-0">
                {settingsSection !== 'main' && ( <button onClick={() => setSettingsSection('main')} className="text-blue-500 mr-1 text-xs font-bold shrink-0">← Voltar</button> )}
                <h2 className="text-sm font-bold flex items-center gap-1.5 truncate"><ShieldCheck size={16} className="text-blue-500 shrink-0" /> {settingsSection === 'main' && 'Definições & Rede Social'} {settingsSection === 'security' && 'Credenciais'} {settingsSection === 'privacy' && 'Privacidade'} {settingsSection === 'activity' && 'Atividade & Interação'} {settingsSection === 'sessions' && 'Sessões Ativas'} {settingsSection === 'twofa' && 'Autenticação 2FA'} {settingsSection === 'help' && 'Relatório de Confiança'}</h2>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className={`p-1.5 rounded-full shrink-0 ${isDay ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-zinc-400'}`}><X size={15} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
              {settingsSection === 'main' ? (
                <>
                  <p className={`${textMutedClass} mb-3 px-1 text-[11px]`}>Gerir ecossistema digital, interatividade e blindagem da conta.</p>
                  <div onClick={() => setSettingsSection('security')} className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer border ${isDay ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-blue-500/10 text-blue-500"><Key size={16} /></div><div><p className="font-bold">1. Segurança de Credenciais</p><p className={`text-[10px] ${textMutedClass}`}>Alterar senha e chave de acesso</p></div></div><ChevronRight size={15} className="shrink-0" /></div>
                  <div onClick={() => setSettingsSection('privacy')} className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer border ${isDay ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-purple-500/10 text-purple-500"><EyeOff size={16} /></div><div><p className="font-bold">2. Privacidade do Perfil</p><p className={`text-[10px] ${textMutedClass}`}>Quem vê os teus favoritos e listas</p></div></div><ChevronRight size={15} className="shrink-0" /></div>
                  <div onClick={() => setSettingsSection('activity')} className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer border ${isDay ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500"><Activity size={16} /></div><div><p className="font-bold">3. Fluxo de Interatividade</p><p className={`text-[10px] ${textMutedClass}`}>Controlo de menções, DMs e reações</p></div></div><ChevronRight size={15} className="shrink-0" /></div>
                  <div onClick={() => setSettingsSection('twofa')} className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer border ${isDay ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-green-500/10 text-green-500"><Lock size={16} /></div><div><p className="font-bold">4. Verificação 2FA</p><p className={`text-[10px] ${textMutedClass}`}>Proteção avançada de login</p></div></div><span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full shrink-0">Ativo</span></div>
                  <div onClick={() => setSettingsSection('sessions')} className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer border ${isDay ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-amber-500/10 text-amber-500"><Smartphone size={16} /></div><div><p className="font-bold">5. Dispositivos Autorizados</p><p className={`text-[10px] ${textMutedClass}`}>Sessões ativas no ecossistema</p></div></div><ChevronRight size={15} className="shrink-0" /></div>
                  <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${isDay ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/40 border-zinc-800/60'}`}><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-zinc-800 text-zinc-400"><Award size={16} /></div><div><p className="font-bold">6. Nível de Acesso (Plano)</p><p className={`text-[10px] ${textMutedClass}`}>{displayUser.plan || "Standard"} — Auditado</p></div></div><span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full shrink-0">OK</span></div>
                  <div onClick={() => setSettingsSection('help')} className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer border ${isDay ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900/60 border-zinc-800'}`}><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-teal-500/10 text-teal-500"><HelpCircle size={16} /></div><div><p className="font-bold">7. Relatório de Confiança</p><p className={`text-[10px] ${textMutedClass}`}>Transparência da rede social</p></div></div><ChevronRight size={15} className="shrink-0" /></div>
                </>
              ) : settingsSection === 'activity' ? (
                <div className="space-y-3">
                  <p className={`${textMutedClass} text-[11px] mb-3`}>Gestão de métricas e comportamento da sua conta.</p>
                  <div onClick={() => { setIsSettingsModalOpen(false); setIsInsightsOpen(true); }} className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer border bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20`}>
                    <div className="flex items-center gap-3"><BarChart2 size={16} /><div><p className={`font-bold ${isDay ? 'text-black' : 'text-white'}`}>Abrir Insights da Categoria</p><p className="text-[10px]">Métricas e análise de interatividade detalhada</p></div></div><ChevronRight size={15} className="shrink-0" />
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-4 text-center">
                  <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-blue-500 border ${isDay ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}><ShieldAlert size={22} /></div>
                  <h3 className="font-bold text-sm">Painel de Controlo Seguro</h3>
                  <p className={`${textMutedClass} text-[11px] leading-relaxed`}>Configuração aplicada a <strong>{displayUser.name}</strong> com auditoria em tempo real.</p>
                  <button onClick={() => { showToast("Configuração salva."); setSettingsSection('main'); }} className="w-full bg-red-600 text-white py-2.5 rounded-xl font-bold text-xs mt-2">Confirmar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isFollowModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[300] flex items-center justify-center p-3 sm:p-4 animate-fade-in text-left">
          <div className={`${isDay ? 'bg-white text-black' : 'bg-[#181818] text-white border-zinc-800'} border w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDay ? 'border-zinc-200' : 'border-zinc-800'}`}>
              <h2 className="text-sm font-bold capitalize flex items-center gap-1.5"><Users size={15} className={isDay ? 'text-zinc-500' : 'text-zinc-400'} /> {followModalType === 'followers' ? 'Seguidores' : 'A Seguir'} <span className={`text-[11px] font-medium ${textMutedClass}`}>({formatCount(followModalTotal)})</span></h2>
              <button onClick={() => setIsFollowModalOpen(false)} className={`p-1.5 rounded-full ${isDay ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-white'}`}><X size={15} /></button>
            </div>
            <div className="p-2 overflow-y-auto flex-1 custom-scrollbar">
              {loadingFollowModal ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-5 w-5 border-t-2 border-red-600"></div></div>
              ) : followModalUsers.length === 0 ? (
                <p className={`text-center py-8 text-xs ${textMutedClass}`}>{followModalType === 'followers' ? 'Ainda sem seguidores.' : 'Ainda não segue ninguém.'}</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {followModalUsers.map(u => (
                    <div key={u.id} onClick={() => { setIsFollowModalOpen(false); navigate(`/profile/${u.id}`); }} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer ${isDay ? 'hover:bg-zinc-100' : 'hover:bg-zinc-800/50'}`}>
                      <img src={u.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || '?')}&background=141414&color=fff`} alt={u.name || 'Utilizador'} className="w-9 h-9 rounded-full object-cover shrink-0" />
                      <div className="flex-1 min-w-0"><p className="font-bold text-xs truncate">{u.name || 'Utilizador'}</p></div>
                      {u.verified && <ShieldCheck size={13} className="text-blue-500 shrink-0" fill="currentColor" />}
                    </div>
                  ))}
                  {followModalTotal > followModalUsers.length && ( <p className={`text-center text-[11px] ${textMutedClass} py-3`}>+{formatCount(followModalTotal - followModalUsers.length)} outros perfis</p> )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isPublishModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[300] flex items-center justify-center p-3 sm:p-4 animate-fade-in text-left">
          <div className={`${isDay ? 'bg-white text-black' : 'bg-[#181818] text-white border-zinc-800'} border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDay ? 'border-zinc-200' : 'border-zinc-800'}`}>
              <h2 className="text-sm font-bold">Publicar Novo Destaque</h2>
              <button onClick={() => !uploadingClip && setIsPublishModalOpen(false)} disabled={uploadingClip} className={`p-1.5 rounded-full ${isDay ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-white'}`}><X size={15} /></button>
            </div>
            <form onSubmit={handlePublishClipSubmit} className="p-5 space-y-4 text-xs">
              <input type="text" value={clipTitle} onChange={(e) => setClipTitle(e.target.value)} placeholder="Título (Obrigatório)" required className={`w-full border rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-600 ${inputBgClass}`} />
              <textarea value={clipDescription} onChange={(e) => setClipDescription(e.target.value)} placeholder="Descrição" rows={2} className={`w-full border rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-600 resize-none ${inputBgClass}`} />
              <div className={`border-2 border-dashed rounded-2xl p-5 text-center relative cursor-pointer ${isDay ? 'border-zinc-300 bg-zinc-50' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'}`}>
                <input type="file" accept="video/*" onChange={(e) => setClipFile(e.target.files?.[0] || null)} required className="absolute inset-0 opacity-0 cursor-pointer" />
                <UploadCloud size={24} className="mx-auto mb-1.5 text-zinc-500" />
                <p className="font-bold break-words">{clipFile ? clipFile.name : 'Selecionar vídeo (9:16)'}</p>
              </div>
              {uploadingClip && <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} /></div>}
              <button type="submit" disabled={uploadingClip} className="w-full py-3 rounded-full font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg disabled:opacity-50">{uploadingClip ? 'A publicar...' : 'Publicar'}</button>
            </form>
          </div>
        </div>
      )}

      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[300] flex items-center justify-center p-3 sm:p-4 animate-fade-in text-left">
          <div className={`${isDay ? 'bg-white text-black' : 'bg-[#181818] text-white border-zinc-800'} border w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col`}>
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${isDay ? 'border-zinc-200' : 'border-zinc-800'}`}>
              <h2 className="text-sm font-bold">Editar Perfil</h2>
              <button onClick={() => setIsEditProfileOpen(false)} className={`p-1.5 rounded-full ${isDay ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-white'}`}><X size={15} /></button>
            </div>
            <form onSubmit={handleSaveProfile} className="p-5 space-y-3 text-xs overflow-y-auto">
              <div><label className="text-[10px] text-zinc-500 font-bold uppercase">Nome</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 mt-1 ${inputBgClass}`} /></div>
              <div><label className="text-[10px] text-zinc-500 font-bold uppercase">Email</label><input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 mt-1 ${inputBgClass}`} /></div>
              <div><label className="text-[10px] text-zinc-500 font-bold uppercase">Morada</label><input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Ex: Rua de Belas, Luanda" className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 mt-1 ${inputBgClass}`} /></div>
              <div><label className="text-[10px] text-zinc-500 font-bold uppercase">País</label><input type="text" value={editCountry} onChange={(e) => setEditCountry(e.target.value)} placeholder="Ex: Angola" className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 mt-1 ${inputBgClass}`} /></div>
              <div><label className="text-[10px] text-zinc-500 font-bold uppercase">Biografia</label><textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={2} className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:border-red-600 resize-none mt-1 ${inputBgClass}`} /></div>
              <button type="submit" disabled={savingProfile} className={`w-full py-3 rounded-full font-bold shadow-lg mt-2 disabled:opacity-50 ${isDay ? 'bg-black text-white' : 'bg-white text-black'}`}>{savingProfile ? 'A guardar...' : 'Guardar Alterações'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;