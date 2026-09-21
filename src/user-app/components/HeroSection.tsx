import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, Info, Play, X } from 'lucide-react'; 
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../shared/services/firebase';

const HeroSectionUser = ({ content, onPlay }: { content?: any, onPlay?: (movie: any) => void }) => {
  const navigate = useNavigate();
  const [hero, setHero] = useState<any>(content || {});
  const [isMuted, setIsMuted] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  // 🚀 RIGOR: Estado que descobre se estamos num telemóvel ou PC
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    // Escuta mudanças de tamanho da janela para adaptar o corte automaticamente
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const unsubscribe = onSnapshot(doc(db, 'settings', 'hero'), (snapshot) => {
      if (snapshot.exists()) {
        setHero(snapshot.data());
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribe();
    };
  }, []);

  const handlePlayClick = () => {
    if (onPlay) onPlay(hero);
    else if (hero.mediaUrl) navigate(`/watch/hero`, { state: { ...hero } });
  };

  // Puxa as coordenadas certas dependendo do ecrã atual
  const currentFocalX = isMobile ? (hero.focalXMobile ?? 50) : (hero.focalXPC ?? 50);
  const currentFocalY = isMobile ? (hero.focalYMobile ?? 50) : (hero.focalYPC ?? 50);

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden group transition-all duration-500">
      
      <div className="absolute inset-0 flex items-center justify-center z-0">
        {hero.mediaType === 'video' ? (
          <video 
            src={hero.mediaUrl} autoPlay loop muted={isMuted} playsInline 
            className="w-full h-full object-cover"
            /* 🚀 O objeto segue o telemóvel ou o PC dinamicamente */
            style={{ objectPosition: `${currentFocalX}% ${currentFocalY}%` }}
          />
        ) : (
          <img 
            src={hero.mediaUrl || hero.coverUrl} 
            className="w-full h-full object-cover opacity-90 transition-all duration-1000 ease-in-out" 
            style={{ objectPosition: `${currentFocalX}% ${currentFocalY}%` }}
            alt="Hero" 
          />
        )}
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/70 md:via-[#141414]/40 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 via-[#141414]/20 to-transparent z-10 hidden md:block" />

      <div className="absolute inset-0 z-20 flex flex-col justify-end items-center md:items-start text-center md:text-left px-4 md:px-16 pb-10 md:pb-24">
        
        {hero.title && (
          <h1 className="text-4xl md:text-7xl font-black text-white mb-2 md:mb-4 uppercase italic tracking-tighter drop-shadow-2xl leading-none max-w-[95%] md:max-w-4xl">
            {hero.title}
          </h1>
        )}
        
        {hero.subtitle && (
          <p className="text-zinc-300 text-sm md:text-lg max-w-[95%] md:max-w-2xl mb-5 md:mb-8 line-clamp-2 md:line-clamp-3 drop-shadow">
            {hero.subtitle || hero.description}
          </p>
        )}

        <div className="flex flex-row items-center justify-center gap-3 mt-2 w-full md:justify-start">
          <button 
            onClick={handlePlayClick} 
            className="flex items-center justify-center gap-2 bg-white text-black px-6 py-2.5 md:px-10 md:py-3 rounded-md font-bold hover:bg-zinc-200 transition-all active:scale-95 shadow-xl flex-1 md:flex-none text-xs md:text-base whitespace-nowrap"
          >
            <Play fill="black" className="w-4 h-4 md:w-5 md:h-5" /> 
            {hero.buttonText ? hero.buttonText.toUpperCase() : 'ASSISTIR'}
          </button>
          
          <button 
            onClick={() => setShowInfo(true)}
            className="flex items-center justify-center gap-2 bg-zinc-600/60 text-white px-6 py-2.5 md:px-10 md:py-3 rounded-md font-bold backdrop-blur-md hover:bg-zinc-600/80 transition-all active:scale-95 flex-1 md:flex-none border border-white/10 text-xs md:text-base whitespace-nowrap"
          >
            <Info className="w-4 h-4 md:w-5 md:h-5" /> 
            <span>INFO</span>
          </button>
        </div>
      </div>

      {hero.mediaType === 'video' && (
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className="absolute bottom-32 md:bottom-24 right-4 md:right-16 z-30 p-2.5 md:p-3 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 transition-all"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      )}

      {showInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#181818] w-full max-w-2xl rounded-3xl overflow-hidden border border-zinc-800 animate-in zoom-in duration-300 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
            <div className="p-8 md:p-12 relative">
               <button onClick={() => setShowInfo(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors p-1 bg-black/50 rounded-full"><X /></button>
               <h2 className="text-3xl font-black text-white mb-4 uppercase italic tracking-tighter drop-shadow-md">{hero.title}</h2>
               <p className="text-zinc-400 leading-relaxed mb-8 text-sm md:text-base">
                 {hero.subtitle || hero.description || "Nenhuma descrição disponível para este destaque exclusivo."}
               </p>
               <div className="flex flex-wrap gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <span className="text-red-600 font-black bg-red-600/10 px-2 py-1 rounded">BAZAR EXCLUSIVO</span>
                  <span className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800">2026</span>
                  <span className="border border-zinc-800 px-2 py-1 rounded">18+</span>
                  <span className="text-green-500 border border-green-500/20 px-2 py-1 rounded">4K ULTRA HD</span>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroSectionUser;