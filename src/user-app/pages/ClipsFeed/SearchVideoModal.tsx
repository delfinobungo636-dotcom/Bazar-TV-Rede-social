import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Eye } from 'lucide-react';

export interface SearchClipItem {
  id: string;
  title?: string;
  description?: string;
  videoUrl?: string;
  thumbnail?: string;
  viewsCount?: number;
  viewedBy?: string[];
  guestViewedBy?: string[];
  likedBy?: string[];
  publisherName?: string;
  publisherAvatar?: string;
  userId?: string;
  publisherId?: string;
}

interface SearchVideoModalProps {
  clips: SearchClipItem[];
  initialClipId: string | null;
  onClose: () => void;
  isDay?: boolean;
}

export const SearchVideoModal: React.FC<SearchVideoModalProps> = ({ 
  clips, 
  initialClipId, 
  onClose, 
  isDay = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    const idx = clips.findIndex(c => c.id === initialClipId);
    if (idx >= 0) {
      setActiveIndex(idx);
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

  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollPos = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIdx = Math.round(scrollPos / itemHeight);
    if (newIdx >= 0 && newIdx < clips.length && newIdx !== activeIndex) {
      setActiveIndex(newIdx);
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

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[9999] flex items-center justify-center p-0 md:p-6 select-none">
      {/* Botão Fechar Global Corrigido (type="button" e z-index cimeiro absoluto) */}
      <button 
        type="button"
        onClick={onClose} 
        aria-label="Fechar modal de vídeo"
        className="fixed top-4 right-4 md:top-6 md:right-6 p-3 bg-red-600/90 hover:bg-red-600 backdrop-blur-xl border border-white/20 rounded-full text-white z-[10000] transition-all active:scale-95 shadow-2xl cursor-pointer flex items-center justify-center"
      >
        <X size={20} strokeWidth={2.5} />
      </button>

      {/* Navegação horizontal Desktop (Esquerda) */}
      <button 
        type="button"
        onClick={() => activeIndex > 0 && scrollToItem(activeIndex - 1)} 
        disabled={activeIndex === 0}
        className="hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 p-3.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 backdrop-blur-xl border border-white/15 rounded-full text-white z-[10000] transition-all active:scale-95 shadow-xl cursor-pointer"
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
              
              {/* Barra de Topo do Clip (Contador) */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between z-30 pointer-events-auto">
                <span className="text-[11px] bg-black/50 backdrop-blur-xl border border-white/10 px-3 py-1 rounded-full text-white font-bold shadow-lg">
                  {index + 1} / {clips.length}
                </span>
              </div>

              {/* Rodapé Info do Clip */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5 text-white z-20 pointer-events-none pb-8">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/20 overflow-hidden flex items-center justify-center text-[10px] font-bold">
                    {clip.publisherAvatar ? <img src={clip.publisherAvatar} alt="" className="w-full h-full object-cover" /> : (clip.publisherName?.charAt(0) || 'U')}
                  </div>
                  <span className="font-bold text-xs">{clip.publisherName || 'Membro Bazar'}</span>
                </div>
                <p className="font-bold text-sm truncate tracking-tight">{clip.title}</p>
                {clip.description && (
                  <p className="text-xs text-zinc-300 mt-1 line-clamp-2 leading-relaxed">{clip.description}</p>
                )}
                
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
        type="button"
        onClick={() => activeIndex < clips.length - 1 && scrollToItem(activeIndex + 1)} 
        disabled={activeIndex === clips.length - 1}
        className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 p-3.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 backdrop-blur-xl border border-white/15 rounded-full text-white z-[10000] transition-all active:scale-95 shadow-xl cursor-pointer"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
};