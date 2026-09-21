// ==========================================
// ClipFeed — Bazar TV Cortes V9 (Completo & Blindado)
// ==========================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  increment,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import {
  Heart,
  Share2,
  Bookmark,
  ShieldCheck,
  Music,
  Sparkles,
  MessageCircle,
  X,
  Plus,
  Camera,
  Loader2,
  Link2,
  Send,
  CheckCircle2
} from 'lucide-react';

import { db } from '../../../shared/services/firebase';
import { useAuth } from '../../../modules/auth/auth.hooks';
import { CommentsPanel } from './CommentsPanel';

export interface ClipItem {
  id: string;
  publisherId: string;
  authorName: string;
  authorImage: string;
  videoUrl: string;
  title: string;
  description: string;
  createdAt: any;
  likedBy?: string[];
  savedBy?: string[];
  viewedBy?: string[];
  guestViewedBy?: string[];
  viewsCount?: number;
  completionsCount?: number;
  commentsCount?: number;
  authorFollowersCount?: number;
  uniqueKey?: string;
}

interface StoryInfo {
  id: string;
  userId: string;
  caption: string;
  userName: string;
  userImage?: string;
  createdAt: any;
  viewedBy?: string[];
}

type ShareTarget = {
  name: string;
  colorClass: string;
  buildUrl?: (url: string, text: string) => string;
  copyOnly?: boolean;
};

const SHARE_TARGETS: ShareTarget[] = [
  { name: 'WhatsApp', colorClass: 'bg-[#25D366]', buildUrl: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text}${url}`)}` },
  { name: 'Facebook', colorClass: 'bg-[#1877F2]', buildUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { name: 'X', colorClass: 'bg-black', buildUrl: (url, text) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  { name: 'Telegram', colorClass: 'bg-[#26A5E4]', buildUrl: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  { name: 'Instagram', colorClass: 'bg-gradient-to-tr from-amber-400 via-pink-600 to-purple-600', copyOnly: true },
  { name: 'TikTok', colorClass: 'bg-zinc-900 border border-zinc-700', copyOnly: true },
];

const ClipFeed: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const targetClipId = searchParams.get('clip');

  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const countedViewIds = useRef<Set<string>>(new Set());
  const countedCompletionIds = useRef<Set<string>>(new Set());

  const [baseClips, setBaseClips] = useState<ClipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClipIndex, setActiveClipIndex] = useState<number>(0);

  const [hasInteracted, setHasInteracted] = useState(false);

  const [savedClipIds, setSavedClipIds] = useState<string[]>([]);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);

  const [openCommentsForClipId, setOpenCommentsForClipId] = useState<string | null>(null);

  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyCaption, setStoryCaption] = useState('');
  const [uploadingStory, setUploadingStory] = useState(false);
  const [storiesByUser, setStoriesByUser] = useState<Record<string, StoryInfo>>({});
  const [activeStoryView, setActiveStoryView] = useState<StoryInfo | null>(null);

  const [shareTargetClip, setShareTargetClip] = useState<ClipItem | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const showShareToast = useCallback((msg: string) => {
    setShareToast(msg);
    setTimeout(() => setShareToast(null), 2500);
  }, []);

  const handlePublishStory = async () => {
    if (!user || !storyCaption.trim()) return;
    setUploadingStory(true);
    
    try {
      const newStoryData = {
        userId: user.uid,
        caption: storyCaption.trim(),
        userName: user.displayName || 'Utilizador',
        userImage: user.photoURL || '',
        createdAt: serverTimestamp(),
        viewedBy: []
      };

      const docRef = await addDoc(collection(db, 'stories'), newStoryData);

      setStoriesByUser(prev => ({
        ...prev,
        [user.uid]: {
          id: docRef.id,
          ...newStoryData,
          createdAt: Timestamp.now()
        } as StoryInfo
      }));

      setStoryCaption('');
      setIsStoryModalOpen(false);
    } catch (error) {
      console.error("Erro ao publicar história:", error);
      alert("Ocorreu um erro ao publicar a história. Tenta novamente.");
    } finally {
      setUploadingStory(false);
    }
  };

  useEffect(() => {
    const fetchRealClips = async () => {
      try {
        const q = query(collection(db, 'clips'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        let fetchedClips: ClipItem[] = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as ClipItem));

        const uniquePublishers = [...new Set(fetchedClips.map(c => c.publisherId))];
        const profilesMap: Record<string, any> = {};
        
        await Promise.all(uniquePublishers.map(async (uid) => {
          if (!uid) return;
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) profilesMap[uid] = snap.data();
        }));

        fetchedClips = fetchedClips.map(clip => ({
          ...clip,
          authorName: profilesMap[clip.publisherId]?.name || profilesMap[clip.publisherId]?.displayName || clip.authorName || 'Utilizador',
          authorImage: profilesMap[clip.publisherId]?.profileImage || profilesMap[clip.publisherId]?.photoURL || profilesMap[clip.publisherId]?.avatar || clip.authorImage || ''
        }));

        for (let i = fetchedClips.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [fetchedClips[i], fetchedClips[j]] = [fetchedClips[j], fetchedClips[i]];
        }

        if (targetClipId) {
          const targetIndex = fetchedClips.findIndex(c => c.id === targetClipId);
          if (targetIndex > -1) {
            const [targetClip] = fetchedClips.splice(targetIndex, 1);
            fetchedClips.unshift(targetClip);
          }
        }

        setBaseClips(fetchedClips);
      } catch (error) {
        console.error("Erro ao carregar cortes:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchLatestStories = async () => {
      try {
        const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const latestByUser: Record<string, StoryInfo> = {};
        snap.docs.forEach(d => {
          const data = d.data();
          const uid = data.userId;
          if (uid && !latestByUser[uid]) {
            latestByUser[uid] = { id: d.id, ...data } as StoryInfo;
          }
        });
        setStoriesByUser(latestByUser);
      } catch (error) {
        console.error("Erro ao carregar histórias:", error);
      }
    };

    fetchRealClips();
    fetchLatestStories();

    if (user) {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setSavedClipIds(data.savedClips || []);
          setFollowingUserIds(data.following || []);
        }
      });
    }
  }, [user, targetClipId]);

  const clips = baseClips.length > 0
    ? Array.from({ length: 5 }, (_, i) => baseClips.map((clip, idx) => ({
        ...clip,
        uniqueKey: `${clip.id}_loop_${i}_${idx}`
      }))).flat()
    : [];

  const registerView = useCallback((clipId: string) => {
    if (countedViewIds.current.has(clipId)) return;
    countedViewIds.current.add(clipId);
    const clipRef = doc(db, 'clips', clipId);

    if (user) {
      updateDoc(clipRef, { viewedBy: arrayUnion(user.uid) }).catch(() => {});
      setBaseClips(prev => prev.map(c => {
        if (c.id !== clipId) return c;
        if ((c.viewedBy || []).includes(user.uid)) return c;
        return { ...c, viewedBy: [...(c.viewedBy || []), user.uid] };
      }));
    } else {
      let guestId = localStorage.getItem('bazar_guest_id');
      if (!guestId) {
        guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('bazar_guest_id', guestId);
      }
      updateDoc(clipRef, { guestViewedBy: arrayUnion(guestId) }).catch(() => {});
      setBaseClips(prev => prev.map(c => {
        if (c.id !== clipId) return c;
        if ((c.guestViewedBy || []).includes(guestId)) return c;
        return { ...c, guestViewedBy: [...(c.guestViewedBy || []), guestId] };
      }));
    }
  }, [user]);

  const registerCompletion = useCallback((clipId: string) => {
    if (countedCompletionIds.current.has(clipId)) return;
    countedCompletionIds.current.add(clipId);
    updateDoc(doc(db, 'clips', clipId), { completionsCount: increment(1) }).catch(() => {});
  }, []);

  const getRealViewsCount = (clip: ClipItem) => {
    const real = (clip.viewedBy?.length || 0) + (clip.guestViewedBy?.length || 0);
    return real > 0 ? real : (clip.viewsCount || 0);
  };

  useEffect(() => {
    if (clips.length === 0) return;
    const observerOptions = { root: containerRef.current, threshold: 0.7 };
    const handleIntersection: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        const uniqueKey = entry.target.getAttribute('data-unique-key');
        const clipId = entry.target.getAttribute('data-clip-id');
        const indexStr = entry.target.getAttribute('data-index');
        const videoElement = videoRefs.current[uniqueKey || ''];

        if (entry.isIntersecting) {
          if (indexStr !== null) setActiveClipIndex(parseInt(indexStr, 10));
          if (videoElement) {
            videoElement.currentTime = 0;
            videoElement.play().catch(() => {});
          }
          if (clipId) registerView(clipId);
        } else {
          if (videoElement) {
            videoElement.pause();
          }
        }
      });
    };
    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    document.querySelectorAll('.clip-item-container').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [clips.length, registerView]);

  const handleVideoTap = (uniqueKey: string) => {
    const v = videoRefs.current[uniqueKey];
    if (!v) return;
    if (!hasInteracted) setHasInteracted(true);
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const goToProfile = (e: React.MouseEvent, publisherId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publisherId) return;
    navigate(`/profile/${publisherId}`);
  };

  const handleAvatarClick = async (e: React.MouseEvent, publisherId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!publisherId) return;
    const story = storiesByUser[publisherId];
    const alreadySeen = story && user ? (story.viewedBy || []).includes(user.uid) : !story;
    if (story && !alreadySeen) {
      setActiveStoryView(story);
      if (user) {
        try {
          await updateDoc(doc(db, 'stories', story.id), { viewedBy: arrayUnion(user.uid) });
          setStoriesByUser(prev => ({
            ...prev,
            [publisherId]: { ...story, viewedBy: [...(story.viewedBy || []), user.uid] }
          }));
        } catch (err) {}
      }
    } else {
      navigate(`/profile/${publisherId}`);
    }
  };

  const handleFollowUser = async (publisherId: string, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!user) return alert("Precisas de estar autenticado.");
    const isFollowing = followingUserIds.includes(publisherId);
    try {
      const currentUserRef = doc(db, 'users', user.uid);
      const publisherUserRef = doc(db, 'users', publisherId);
      if (isFollowing) {
        setFollowingUserIds(prev => prev.filter(id => id !== publisherId));
        await updateDoc(currentUserRef, { following: arrayRemove(publisherId) });
        await updateDoc(publisherUserRef, { followersCount: increment(-1) }).catch(() => {});
      } else {
        setFollowingUserIds(prev => [...prev, publisherId]);
        await updateDoc(currentUserRef, { following: arrayUnion(publisherId) });
        await updateDoc(publisherUserRef, { followersCount: increment(1) }).catch(() => {});
        setBaseClips(prev => prev.map(c => c.publisherId === publisherId ? { ...c, authorFollowersCount: (c.authorFollowersCount || 0) + 1 } : c));
      }
    } catch (err) { console.error("Erro:", err); }
  };

  const handleLike = async (clip: ClipItem) => {
    if (!user) return alert("Precisas de estar autenticado.");
    const clipRef = doc(db, 'clips', clip.id);
    const userLiked = clip.likedBy?.includes(user.uid);
    try {
      if (userLiked) {
        await updateDoc(clipRef, { likedBy: arrayRemove(user.uid) });
        setBaseClips(prev => prev.map(c => c.id === clip.id ? { ...c, likedBy: c.likedBy?.filter(id => id !== user.uid) } : c));
      } else {
        await updateDoc(clipRef, { likedBy: arrayUnion(user.uid) });
        setBaseClips(prev => prev.map(c => c.id === clip.id ? { ...c, likedBy: [...(c.likedBy || []), user.uid] } : c));
      }
    } catch (err) { console.error("Erro no gosto:", err); }
  };

  const handleSaveClip = async (clip: ClipItem) => {
    if (!user) return alert("Precisas de estar autenticado.");
    const userRef = doc(db, 'users', user.uid);
    const clipRef = doc(db, 'clips', clip.id);
    const isSaved = savedClipIds.includes(clip.id);
    
    try {
      if (isSaved) {
        await updateDoc(userRef, { savedClips: arrayRemove(clip.id) });
        await updateDoc(clipRef, { savedBy: arrayRemove(user.uid) });
        setSavedClipIds(prev => prev.filter(id => id !== clip.id));
        setBaseClips(prev => prev.map(c => c.id === clip.id ? { ...c, savedBy: c.savedBy?.filter(id => id !== user.uid) } : c));
      } else {
        await updateDoc(userRef, { savedClips: arrayUnion(clip.id) });
        await updateDoc(clipRef, { savedBy: arrayUnion(user.uid) });
        setSavedClipIds(prev => [...prev, clip.id]);
        setBaseClips(prev => prev.map(c => c.id === clip.id ? { ...c, savedBy: [...(c.savedBy || []), user.uid] } : c));
      }
    } catch (err) { console.error("Erro ao guardar:", err); }
  };

  const copyClipLink = async (clip: ClipItem, feedback: string = "Link copiado!") => {
    const shareUrl = `${window.location.origin}/clips?clip=${clip.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showShareToast(feedback);
    } catch (err) {
      showShareToast("Não foi possível copiar o link.");
    }
  };

  const handleNativeShare = async (clip: ClipItem) => {
    const shareUrl = `${window.location.origin}/clips?clip=${clip.id}`;
    const shareData = { title: `${clip.title} — Bazar TV`, text: `Vê este corte de ${clip.authorName || 'um utilizador'}: ${clip.title}`, url: shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyClipLink(clip);
      }
    } catch (err) {}
  };

  const handleShareTargetClick = (target: ShareTarget, clip: ClipItem) => {
    const shareUrl = `${window.location.origin}/clips?clip=${clip.id}`;
    const shareText = `Vê este corte de ${clip.authorName || 'um utilizador'} na Bazar TV: ${clip.title}`;
    if (target.copyOnly || !target.buildUrl) {
      copyClipLink(clip, `Link copiado! Cola-o numa nova publicação do ${target.name}.`);
      return;
    }
    window.open(target.buildUrl(shareUrl, shareText), '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950 flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (baseClips.length === 0) {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <Sparkles size={40} className="text-red-500 mb-3 animate-pulse" />
        <h2 className="text-lg font-black mb-2">Sem cortes disponíveis</h2>
        <button onClick={(e) => goToProfile(e, user?.uid || '')} className="bg-red-600 text-white font-bold text-xs px-5 py-3 rounded-xl mt-3">
          Ir Para O Meu Perfil
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-40 w-full h-[100dvh] overflow-y-scroll snap-y snap-mandatory bg-black text-white scrollbar-none">

      {clips.map((clip, idx) => {
        const isLiked = user ? clip.likedBy?.includes(user.uid) : false;
        const isSaved = savedClipIds.includes(clip.id);
        const isOwnAccount = user?.uid === clip.publisherId;
        const isFollowing = followingUserIds.includes(clip.publisherId);
        const story = storiesByUser[clip.publisherId];
        const hasUnseenStory = story && (!user || !(story.viewedBy || []).includes(user.uid));
        const shouldLoadVideo = Math.abs(activeClipIndex - idx) <= 2;

        return (
          <div key={clip.uniqueKey} data-unique-key={clip.uniqueKey} data-clip-id={clip.id} data-index={idx} className="clip-item-container h-[100dvh] w-full snap-start relative flex items-center justify-center bg-zinc-950 overflow-hidden">

            {shouldLoadVideo ? (
              <video
                ref={(el) => (videoRefs.current[clip.uniqueKey!] = el)}
                src={clip.videoUrl}
                className="h-full w-full object-cover absolute inset-0 cursor-pointer"
                loop
                playsInline
                preload="metadata"
                muted={!hasInteracted}
                onEnded={() => registerCompletion(clip.id)}
                onClick={() => handleVideoTap(clip.uniqueKey!)}
              />
            ) : (
              <div className="h-full w-full bg-zinc-900 animate-pulse absolute inset-0" />
            )}

            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/85 pointer-events-none" />

            {/* BLOCO ESQUERDO: Perfil, Legenda e Áudio Subidos Acima (blindado contra toque no vídeo) */}
            <div className="absolute bottom-24 left-4 right-20 z-50 space-y-2.5 pointer-events-auto">
              <div className="flex items-center gap-2 w-fit">
                
                {/* 1. ÁREA DO AVATAR (Lógica de Story + Mais azul ou Mais branco) */}
                <div onClick={(e) => handleAvatarClick(e, clip.publisherId)} className="relative cursor-pointer">
                  <div className={`w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shadow-md ${hasUnseenStory ? 'ring-2 ring-red-500' : 'border border-white/20'}`}>
                    {clip.authorImage ? (
                      <img src={clip.authorImage} alt={clip.authorName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-white bg-zinc-800 text-sm">
                        {clip.authorName ? clip.authorName.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                  </div>
                  {isOwnAccount ? (
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsStoryModalOpen(true); }} className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-0.5 shadow-md border border-black/50">
                      <Plus size={10} strokeWidth={3} />
                    </button>
                  ) : !isFollowing && (
                    <button onClick={(e) => handleFollowUser(clip.publisherId, e)} className="absolute -bottom-1 -right-1 bg-white text-black rounded-full p-0.5 shadow-md border border-black/20">
                      <Plus size={10} strokeWidth={3} />
                    </button>
                  )}
                </div>

                {/* 2. ÁREA DO NOME (Leva direto ao User ID via perfil) */}
                <div onClick={(e) => goToProfile(e, clip.publisherId)} className="cursor-pointer py-1">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[15px] drop-shadow-md hover:underline">{clip.authorName || 'Utilizador'}</span>
                    <ShieldCheck size={14} className="text-red-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-1 pr-2">
                <h2 className="font-bold text-sm text-white drop-shadow-md">{clip.title}</h2>
                <p className="text-[13px] text-zinc-300 drop-shadow-md line-clamp-2">{clip.description}</p>
              </div>

              {/* Bloco de Áudio detetável / recomendável elevado e visível */}
              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex items-center gap-1.5 text-[11px] text-white font-medium bg-white/15 backdrop-blur-md px-3 py-1 rounded-full w-fit border border-white/10">
                  <Music size={12} className="text-red-400 animate-pulse" />
                  <span>Áudio Original • Detetável</span>
                </div>
              </div>
            </div>

            {/* BLOCO DIREITO: Interações subidas em harmonia (z-40 / pointer-events-auto) */}
            <div className="absolute right-3 bottom-28 z-40 flex flex-col items-center gap-5 pointer-events-auto">
              <button onClick={() => handleLike(clip)} className="flex flex-col items-center gap-1 group">
                <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white shadow-lg transition-transform hover:scale-110">
                  <Heart size={26} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
                </div>
                <span className="text-[12px] font-bold drop-shadow-md">{clip.likedBy?.length || 0}</span>
              </button>

              <button onClick={() => setOpenCommentsForClipId(clip.id)} className="flex flex-col items-center gap-1 group">
                <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white shadow-lg transition-transform hover:scale-110">
                  <MessageCircle size={26} />
                </div>
                <span className="text-[12px] font-bold drop-shadow-md">{clip.commentsCount || 0}</span>
              </button>

              <button onClick={() => handleSaveClip(clip)} className="flex flex-col items-center gap-1 group">
                <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white shadow-lg transition-transform hover:scale-110">
                  <Bookmark size={24} className={isSaved ? 'fill-white' : ''} />
                </div>
                <span className="text-[12px] font-bold drop-shadow-md">{clip.savedBy?.length || 0}</span>
              </button>

              <button onClick={() => setShareTargetClip(clip)} className="flex flex-col items-center gap-1 group">
                <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white shadow-lg transition-transform hover:scale-110">
                  <Share2 size={24} />
                </div>
                <span className="text-[12px] font-bold drop-shadow-md">Partilhar</span>
              </button>
            </div>
          </div>
        );
      })}

      {/* MODAL COMENTÁRIOS */}
      {openCommentsForClipId && (
        <CommentsPanel
          clipId={openCommentsForClipId}
          initialCommentsCount={baseClips.find(c => c.id === openCommentsForClipId)?.commentsCount || 0}
          onClose={() => setOpenCommentsForClipId(null)}
          onCommentsCountChange={(id: string, newCount: number) => 
            setBaseClips(prev => prev.map(c => c.id === id ? { ...c, commentsCount: newCount } : c))
          }
        />
      )}

      {/* MODAL DE PARTILHA RÁPIDA */}
      {shareTargetClip && (
        <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center pointer-events-auto" onClick={() => setShareTargetClip(null)}>
          <div className="bg-zinc-900 border border-zinc-800 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 size={18} className="text-red-500" />
                <h3 className="font-black text-sm text-white">Partilhar Corte</h3>
              </div>
              <button onClick={() => setShareTargetClip(null)} className="text-zinc-400 hover:text-white" aria-label="Fechar"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {SHARE_TARGETS.map(target => (
                <button
                  key={target.name}
                  onClick={() => handleShareTargetClick(target, shareTargetClip)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg transition-transform group-active:scale-90 ${target.colorClass}`}>
                    {target.name.charAt(0)}
                  </div>
                  <span className="text-[10px] font-medium text-zinc-300">{target.name}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => copyClipLink(shareTargetClip)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-800 text-white hover:bg-zinc-700"
              >
                <Link2 size={14} /> Copiar Link
              </button>
              <button
                onClick={() => handleNativeShare(shareTargetClip)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700"
              >
                <Send size={14} /> Mais Opções
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST DE PARTILHA */}
      {shareToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[500] bg-white text-black px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold max-w-[85vw] text-center">
          <CheckCircle2 size={15} className="text-green-600 shrink-0" />
          <span className="truncate">{shareToast}</span>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO DE STORY */}
      {isStoryModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto" onClick={() => setIsStoryModalOpen(false)}>
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-red-500" />
                <h3 className="font-black text-sm text-white">Criar Nova História</h3>
              </div>
              <button onClick={() => setIsStoryModalOpen(false)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <textarea
              value={storyCaption}
              onChange={(e) => setStoryCaption(e.target.value)}
              placeholder="O que está a acontecer agora?"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-white outline-none focus:border-red-600 h-24 resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsStoryModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-400 hover:text-white">Cancelar</button>
              <button
                onClick={handlePublishStory}
                disabled={uploadingStory || !storyCaption.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:bg-zinc-800 flex items-center gap-2"
              >
                {uploadingStory && <Loader2 size={12} className="animate-spin" />} Publicar Story
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISUALIZADOR DE STORY */}
      {activeStoryView && (
        <div className="fixed inset-0 z-[130] bg-black flex items-center justify-center pointer-events-auto" onClick={() => setActiveStoryView(null)}>
          <div className="w-full max-w-sm h-[80vh] bg-gradient-to-br from-zinc-900 to-black rounded-2xl border border-zinc-800 flex flex-col p-6 relative">
            <button onClick={() => setActiveStoryView(null)} className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={22} /></button>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-white text-lg font-bold text-center leading-relaxed">{activeStoryView.caption}</p>
            </div>
            <button onClick={(e) => { setActiveStoryView(null); goToProfile(e, activeStoryView.userId); }} className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 rounded-xl">
              Ver Perfil
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClipFeed;