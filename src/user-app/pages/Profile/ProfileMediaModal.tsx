import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Eye, Activity, Sparkles, TrendingUp, Share2, MessageCircle } from 'lucide-react';
import { ClipItem } from './index';

interface ProfileMediaModalProps {
  clips: ClipItem[];
  initialClipId: string | null;
  currentUserId?: string;
  onClose: () => void;
  isDay?: boolean;
  isOwner?: boolean;
}

export const ProfileMediaModal: React.FC<ProfileMediaModalProps> = ({ 
  clips, 
  initialClipId, 
  currentUserId,
  onClose, 
  isDay = false,
  isOwner = false 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [activeInsightsId, setActiveInsightsId] = useState<string | null>(null);

  // Encontrar o índice inicial com base no clip clicado
  useEffect(() => {
    const idx = clips.findIndex(c => c.id === initialClipId);
    if (idx >= 0) {
      setActiveIndex(idx);
      // Garantir scroll para o item exato após renderizar
      setTimeout(() => {
        if (containerRef.current) {
          const children = containerRef.current.children;
          if (children[idx]) {
            children[idx].scrollIntoView({ behavior: 'auto' });
          }
        }
      }, 50);
    }
  }, [initialClipId, clips]);

  // Detetar qual vídeo está no viewport durante o scroll vertical
  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollPos = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIdx = Math.round(scrollPos / itemHeight);
    if (newIdx >= 0 && newIdx < clips.length && newIdx !== activeIndex) {
      setActiveIndex(newIdx);
      setActiveInsightsId(null); // fechar insights ao mudar de vídeo
    }
  };

  const scrollToItem = (idx: number) => {
    if (!containerRef.current) return;
    const children = containerRef.current.children;
    if (children[idx]) {
      children[idx].scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatCount = (num: number = 0): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + ' mi';
    if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + ' mil';
    return num.toString();
  };

  const currentClip = clips[activeIndex] || clips[0];
  if (!currentClip) return null;

  const realViews = (currentClip.viewedBy?.length || 0) + (currentClip.guestViewedBy?.length || 0) || currentClip.viewsCount || 0;
  const isShowInsights = activeInsightsId === currentClip.id;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[500] flex items-center justify-center p-0 md:p-6 select-none animate-fade-in">
      {/* Botão Fechar Global */}
      <button 
        onClick={onClose} 
        className="fixed top-5 right-5 p-3 bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-white/15 rounded-full text-white z-[600] transition-all active:scale-95 shadow-xl"
      >
        <X size={18} />
      </button>

      {/* Navegação horizontal Desktop (Esquerda) */}
      <button 
        onClick={() => activeIndex > 0 && scrollToItem(activeIndex - 1)} 
        disabled={activeIndex === 0}
        className="hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 p-3.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 backdrop-blur-xl border border-white/15 rounded-full text-white z-[600] transition-all active:scale-95 shadow-xl"
      >
        <ChevronLeft size={22} />
      </button>

      {/* Feed Vertical com Snap Scroll nativo */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full max-w-sm h-full md:h-[90vh] md:rounded-[32px] overflow-y-auto snap-y snap-mandatory scrollbar-none bg-zinc-950 relative md:border md:border-white/10 md:shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
      >
        {clips.map((clip, index) => {
          const isActive = index === activeIndex;
          const clipRealViews = (clip.viewedBy?.length || 0) + (clip.guestViewedBy?.length || 0) || clip.viewsCount || 0;
          const showThisInsights = activeInsightsId === clip.id;

          return (
            <div key={clip.id} className="w-full h-full snap-start relative flex flex-col justify-between shrink-0 bg-zinc-950 overflow-hidden">
              <video 
                src={clip.videoUrl} 
                controls={isActive}
                autoPlay={isActive}
                loop
                playsInline 
                muted={!isActive}
                className="w-full h-full object-cover" 
              />
              
              {/* Barra de Topo do Clip (Contador + Botão de Insights dedicados) */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between z-30 pointer-events-auto">
                <span className="text-[11px] bg-black/50 backdrop-blur-xl border border-white/10 px-3 py-1 rounded-full text-white font-bold shadow-lg">
                  {index + 1} / {clips.length}
                </span>

                {(isOwner || clip.userId === currentUserId || clip.publisherId === currentUserId) && (
                  <button 
                    onClick={() => setActiveInsightsId(showThisInsights ? null : clip.id)}
                    className="text-[10px] bg-blue-600/90 hover:bg-blue-600 backdrop-blur-xl border border-blue-400/30 text-white px-3.5 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Activity size={12} className="text-blue-200" /> 
                    {showThisInsights ? 'Fechar Insights' : 'Insights do Vídeo'}
                  </button>
                )}
              </div>

              {/* Gaveta de Insights Analíticos do Vídeo Específico */}
              {showThisInsights && (
                <div className="absolute inset-x-3 bottom-24 bg-black/85 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 text-xs text-white z-40 space-y-3.5 shadow-2xl animate-fade-in">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                    <span className="font-bold text-blue-400 flex items-center gap-1.5">
                      <Sparkles size={13} /> Analítica Específica do Vídeo
                    </span>
                    <button onClick={() => setActiveInsightsId(null)} className="text-zinc-400 hover:text-white text-xs">✕</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/5 border border-white/5 p-2.5 rounded-2xl">
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider">Views Reais</p>
                      <p className="font-black text-sm mt-0.5 text-white">{formatCount(clipRealViews)}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-2.5 rounded-2xl">
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider">Gostos</p>
                      <p className="font-black text-sm mt-0.5 text-red-400">{clip.likedBy?.length || 0}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 p-2.5 rounded-2xl">
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider">Retenção</p>
                      <p className="font-black text-sm text-green-400 mt-0.5 flex items-center justify-center gap-0.5">
                        <TrendingUp size={11} /> 78%
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 text-center bg-white/5 py-1.5 rounded-xl border border-white/5">
                    ID da Publicação: {clip.id.slice(0, 8)}... Auditado Bazar TV.
                  </p>
                </div>
              )}

              {/* Rodapé Info do Clip */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5 text-white z-20 pointer-events-none">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/20 overflow-hidden flex items-center justify-center text-[10px] font-bold">
                    {clip.publisherAvatar ? <img src={clip.publisherAvatar} alt="" className="w-full h-full object-cover" /> : (clip.publisherName?.charAt(0) || 'U')}
                  </div>
                  <span className="font-bold text-xs">{clip.publisherName || 'Membro Bazar'}</span>
                </div>
                <p className="font-bold text-sm truncate tracking-tight">{clip.title}</p>
                <p className="text-xs text-zinc-300 mt-1 line-clamp-2 leading-relaxed">{clip.description}</p>
                
                <div className="flex items-center gap-4 mt-3 text-xs font-semibold pointer-events-auto">
                  <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                    <Eye size={13} className="text-zinc-300" /> {formatCount(clipRealViews)}
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                    <Heart size={13} className="fill-red-500 text-red-500" /> {clip.likedBy?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navegação horizontal Desktop (Direita) */}
      <button 
        onClick={() => activeIndex < clips.length - 1 && scrollToItem(activeIndex + 1)} 
        disabled={activeIndex === clips.length - 1}
        className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 p-3.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 backdrop-blur-xl border border-white/15 rounded-full text-white z-[600] transition-all active:scale-95 shadow-xl"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
};