import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Play, Download, Plus, ThumbsUp, Share2, Lock } from 'lucide-react';
import Hls from 'hls.js'; // <--- O MOTOR TURBO IMPORTADO AQUI

interface ContentModalProps {
  content: any;
  user: any;
  allMovies: any[];
  onClose: () => void;
  onChangeContent: (newMovie: any) => void;
}

export function ContentModal({ content, user, allMovies, onClose, onChangeContent }: ContentModalProps) {
  const [activeTab, setActiveTab] = useState('episodes');
  const [currentVideo, setCurrentVideo] = useState(content.videoUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Referências para o Vídeo e para o Motor HLS
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const canDownload = user?.plan === 'familia' || user?.role === 'admin';

  // --- PREPARAÇÃO DO YOUTUBE ---
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&controls=1&showinfo=0`;
    }
    return url;
  };

  const isYoutube = currentVideo?.includes('youtube') || currentVideo?.includes('youtu.be');
  const isHls = currentVideo?.includes('.m3u8'); // Deteta se é LIVE

  // --- EFEITO 1: RESETAR AO TROCAR DE FILME ---
  useEffect(() => {
    setCurrentVideo(content.videoUrl);
    setIsPlaying(false);
    setActiveTab('episodes');
    
    // Limpa o HLS anterior se existir
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, [content]);

  // --- EFEITO 2: ATIVAR O MOTOR HLS QUANDO DER PLAY ---
  useEffect(() => {
    // Só roda se estivermos no modo Play, não for YouTube e tivermos um elemento de vídeo
    if (isPlaying && !isYoutube && videoRef.current && currentVideo) {
      const video = videoRef.current;

      // CENÁRIO A: É HLS (.m3u8) e o navegador suporta HLS.js
      if (Hls.isSupported() && isHls) {
        if (hlsRef.current) hlsRef.current.destroy(); // Garante limpeza

        const hls = new Hls({
          enableWorker: true,      // Usa processamento extra para não travar
          lowLatencyMode: true,    // Modo Turbo para Lives
        });

        hls.loadSource(currentVideo);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.log("Autoplay bloqueado pelo browser:", e));
        });

        hlsRef.current = hls; // Guarda a referência para limpar depois
      }
      // CENÁRIO B: Safari Nativo (iPhones e Mac tocam m3u8 direto)
      else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentVideo;
        video.play();
      }
      // CENÁRIO C: MP4 Normal
      else {
        video.src = currentVideo;
        video.play();
      }
    }

    // Limpeza ao desmontar
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [isPlaying, currentVideo, isYoutube, isHls]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const suggestions = useMemo(() => {
    return allMovies?.filter(m => m.category === content.category && m.id !== content.id).slice(0, 6) || [];
  }, [allMovies, content]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex justify-center items-center overflow-y-auto animate-fade-in p-2 md:p-4">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative bg-[#141414] w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-xl shadow-2xl text-white ring-1 ring-zinc-800 scrollbar-hide">
        
        <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-black/60 p-2 rounded-full hover:bg-red-600 transition group">
          <X size={24} className="group-hover:rotate-90 transition-transform"/>
        </button>

        {/* --- HERO PLAYER --- */}
        <div className="relative aspect-video bg-black w-full group">
          
          {isPlaying && currentVideo ? (
            isYoutube ? (
              // PLAYER YOUTUBE
              <iframe 
                src={getEmbedUrl(currentVideo)} 
                className="w-full h-full"
                title={content.title} 
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            ) : (
              // PLAYER HÍBRIDO (HLS + MP4)
              // Removemos o 'key' aqui para deixar o HLS.js controlar a fonte manualmente no useEffect
              <video 
                ref={videoRef}
                className="w-full h-full object-contain bg-black"
                controls
                autoPlay
                playsInline
                poster={content.image}
              />
            )
          ) : (
            // CAPA
            <>
              <img src={content.image} className="w-full h-full object-cover opacity-80" alt="Capa" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
              
              <button 
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition duration-300"
              >
                <div className="bg-red-600/90 p-4 rounded-full shadow-lg backdrop-blur-sm hover:bg-red-600">
                  <Play fill="white" size={40} className="ml-1"/>
                </div>
              </button>
              <div className="absolute bottom-0 left-0 p-6 w-full">
                <h1 className="text-3xl md:text-5xl font-bold mb-2 drop-shadow-lg">{content.title}</h1>
              </div>
            </>
          )}
        </div>

        {/* --- RESTO DO CONTEÚDO (Botões, Texto, Episódios) --- */}
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-3 mb-8 border-b border-zinc-800 pb-6">
            <button 
              onClick={handlePlay}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-bold py-3 px-6 rounded hover:bg-gray-200 transition"
            >
              <Play fill="black" size={20}/> {isPlaying ? 'Continuar' : 'Assistir Agora'}
            </button>
            <button 
              onClick={() => !canDownload && alert("⚠️ Download exclusivo para plano Família (4.999 Kz)")} 
              className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 px-6 rounded transition ${canDownload ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-900 text-gray-500 cursor-not-allowed'}`}
            >
              {canDownload ? <Download size={20}/> : <Lock size={20}/>} 
              {canDownload ? 'Baixar' : 'Download (Plano Família)'}
            </button>
          </div>

          <div className="grid md:grid-cols-[2fr_1fr] gap-8 mb-8">
            <div>
              <div className="flex gap-3 text-sm text-gray-300 mb-4 font-bold items-center">
                <span className="text-green-400">98% Relevante</span>
                <span>{content.year || '2025'}</span>
                <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs text-gray-400">{content.category}</span>
                {isHls && <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs animate-pulse">LIVE</span>}
              </div>
              <p className="text-gray-300 leading-relaxed text-base">{content.description || `Assista a ${content.title} completo.`}</p>
            </div>
            <div className="text-sm text-gray-500 space-y-2">
              <p><span className="text-gray-400 font-bold">Elenco:</span><br/>{content.cast || "Vários Artistas"}</p>
              <p><span className="text-gray-400 font-bold">Género:</span><br/>{content.category}</p>
            </div>
          </div>

          <div className="flex gap-8 mb-8">
             <div className="flex flex-col items-center gap-1 cursor-pointer hover:text-white text-gray-400"><Plus size={20}/><span className="text-[10px]">Minha Lista</span></div>
             <div className="flex flex-col items-center gap-1 cursor-pointer hover:text-white text-gray-400"><ThumbsUp size={20}/><span className="text-[10px]">Gostei</span></div>
             <div className="flex flex-col items-center gap-1 cursor-pointer hover:text-white text-gray-400"><Share2 size={20}/><span className="text-[10px]">Partilhar</span></div>
          </div>

          <div>
            <div className="flex border-b border-zinc-800 mb-4">
               <button onClick={() => setActiveTab('episodes')} className={`px-4 pb-3 font-bold text-sm transition ${activeTab === 'episodes' ? 'border-b-2 border-red-600 text-white' : 'text-gray-500'}`}>
                 {content.category === 'Séries' || content.category === 'Novelas' ? 'EPISÓDIOS' : 'RELACIONADOS'}
               </button>
               <button onClick={() => setActiveTab('more')} className={`px-4 pb-3 font-bold text-sm transition ${activeTab === 'more' ? 'border-b-2 border-red-600 text-white' : 'text-gray-500'}`}>MAIS TÍTULOS</button>
            </div>

            <div className="min-h-[200px]">
              {activeTab === 'episodes' && (
                <div className="space-y-2">
                  {content.episodes && content.episodes.length > 0 ? (
                    content.episodes.map((ep: any, i: number) => (
                      <div key={i} onClick={() => { setCurrentVideo(ep.url); handlePlay(); }} className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer hover:bg-zinc-800 transition ${currentVideo === ep.url ? 'bg-zinc-800 border-l-4 border-red-600' : 'bg-zinc-900/40'}`}>
                        <span className="text-gray-500 font-bold text-xl w-6">{i+1}</span>
                        <div className="flex-1">
                          <h4 className={`font-bold ${currentVideo === ep.url ? 'text-white' : 'text-gray-300'}`}>{ep.title}</h4>
                        </div>
                        <Play size={20} className={currentVideo === ep.url ? 'text-red-500' : 'text-white'} />
                      </div>
                    ))
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {suggestions.map(s => (
                        <div key={s.id} onClick={() => onChangeContent(s)} className="aspect-video bg-zinc-800 rounded overflow-hidden cursor-pointer hover:scale-105 transition relative group">
                          <img src={s.image} className="w-full h-full object-cover"/>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"><Play fill="white"/></div>
                          <p className="absolute bottom-0 w-full p-2 bg-gradient-to-t from-black text-xs font-bold truncate">{s.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'more' && (
                 <div className="grid grid-cols-3 gap-4">
                    {suggestions.map(s => (
                        <div key={s.id} onClick={() => onChangeContent(s)} className="aspect-[2/3] bg-zinc-800 rounded overflow-hidden cursor-pointer hover:scale-105 transition relative group">
                          <img src={s.image} className="w-full h-full object-cover"/>
                        </div>
                    ))}
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}