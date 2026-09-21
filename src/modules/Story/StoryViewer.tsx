import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { db } from '../../shared/services/firebase';
import { doc, updateDoc, arrayUnion, deleteDoc, getDoc } from 'firebase/firestore';

export interface StoryItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  viewedBy?: string[];
  createdAt?: any;
}

interface StoryViewerProps {
  stories: StoryItem[];
  initialIndex?: number;
  currentUserId?: string;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
  isOwner?: boolean;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  initialIndex = 0,
  currentUserId,
  onClose,
  onShowToast,
  isOwner = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const story = stories[currentIndex];
  const DURATION = 6000; // 6 segundos por story se for imagem

  // Registar visualização
  useEffect(() => {
    if (story && currentUserId && !story.viewedBy?.includes(currentUserId)) {
      updateDoc(doc(db, 'stories', story.id), {
        viewedBy: arrayUnion(currentUserId),
      }).catch(err => console.error("Erro ao marcar view do story:", err));
    }
  }, [currentIndex, story, currentUserId]);

  // Gestão de temporizador e progresso
  useEffect(() => {
    if (!story) return;
    setProgress(0);

    if (story.mediaType === 'video') return; // Vídeo lida com o seu próprio tempo/fim

    const intervalTime = 50;
    const increment = (intervalTime / DURATION) * 100;
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentIndex, story]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDelete = async () => {
    if (!story || !isOwner) return;
    if (!window.confirm("Eliminar este story?")) return;
    try {
      await deleteDoc(doc(db, 'stories', story.id));
      if (onShowToast) onShowToast("Story eliminado.");
      onClose();
    } catch (e) {
      console.error(e);
      if (onShowToast) onShowToast("Erro ao eliminar.");
    }
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[400] flex items-center justify-center select-none">
      {/* Container vertical 9:16 estilo telemóvel/Snapchat */}
      <div className="relative w-full max-w-sm h-full md:h-[88vh] md:rounded-3xl overflow-hidden bg-zinc-950 flex flex-col justify-between shadow-2xl border border-zinc-800">
        
        {/* Barra de Progresso no Topo */}
        <div className="absolute top-3 inset-x-3 z-30 flex gap-1">
          {stories.map((s, idx) => (
            <div key={s.id} className="flex-1 bg-white/30 h-1 rounded-full overflow-hidden">
              <div 
                className="bg-white h-full transition-all duration-75"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? (story.mediaType === 'video' ? '100% ' : `${progress}%`) : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header do Utilizador */}
        <div className="absolute top-6 inset-x-4 z-30 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <img src={story.userAvatar || `https://ui-avatars.com/api/?name=${story.userName}`} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-white/40" />
            <span className="text-xs font-bold drop-shadow-md">{story.userName}</span>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <button onClick={handleDelete} className="p-1.5 bg-black/40 rounded-full hover:bg-red-600 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 bg-black/40 rounded-full hover:bg-white/20 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Média (Imagem ou Vídeo) */}
        <div className="w-full h-full flex items-center justify-center bg-black relative">
          {story.mediaType === 'video' ? (
            <video 
              ref={videoRef}
              src={story.mediaUrl}
              autoPlay
              playsInline
              onEnded={handleNext}
              className="w-full h-full object-cover"
            />
          ) : (
            <img src={story.mediaUrl} alt="Story" className="w-full h-full object-cover" />
          )}

          {/* Zonas de toque invisíveis para navegar */}
          <div onClick={handlePrev} className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer" />
          <div onClick={handleNext} className="absolute inset-y-0 right-0 w-2/3 z-20 cursor-pointer" />
        </div>

        {/* Rodapé / Visto por (se dono) */}
        {isOwner && (
          <div className="absolute bottom-4 inset-x-4 z-30 flex items-center justify-center text-white/80 text-[11px] bg-black/50 backdrop-blur-md py-1.5 rounded-full">
            <Eye size={13} className="mr-1.5" />
            <span>Visualizado por <strong>{story.viewedBy?.length || 0}</strong> membros</span>
          </div>
        )}
      </div>
    </div>
  );
};