import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Pause, RotateCcw, RotateCw, Maximize, Volume2, VolumeX, Layers, SkipForward, Loader2, Download, MessageSquare, AlertTriangle } from 'lucide-react';
import Hls from 'hls.js';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../shared/services/firebase';
import { useAuth } from '../../../modules/auth/auth.hooks';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface Subtitle {
  url: string;
  lang: string;
  label: string;
  default?: boolean;
}

export interface Episode {
  id?: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  number?: number;
  season?: number;
  seriesId?: string;
  description?: string;
  duration?: string;
  seriesTitle?: string;
  subtitles?: Subtitle[];
}

interface VideoPlayerProps {
  content: Episode;
  allEpisodes?: Episode[];
  onClose: () => void;
  onNavigateToEpisode?: (episode: Episode) => void;
  userPlan?: number;
  isLive?: boolean;
}

// --- MODAL DE EPISÓDIOS (COM CÉREBRO DE TEMPORADAS) ---
interface EpisodeModalProps {
  episodes: Episode[];
  currentEpisodeId: string;
  currentSeason: number;
  onClose: () => void;
  onSelectEpisode: (episode: Episode) => void;
}

const EpisodeModal: React.FC<EpisodeModalProps> = ({ episodes, currentEpisodeId, currentSeason, onClose, onSelectEpisode }) => {
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [temporadaAtiva, setTemporadaAtiva] = useState(currentSeason || 1);

  const temporadasDisponiveis = React.useMemo(() => {
    const temps = episodes.map(ep => Number(ep.season) || 1);
    return Array.from(new Set(temps)).sort((a, b) => a - b);
  }, [episodes]);

  const episodiosParaMostrar = React.useMemo(() => {
    return episodes
      .filter(ep => (Number(ep.season) || 1) === temporadaAtiva)
      .sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
  }, [episodes, temporadaAtiva]);

  return (
    <div className="absolute inset-0 z-[200] bg-[#141414]/95 flex flex-col p-4 md:p-12 transition-all duration-500 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setMostrarDropdown(false); }}>

      {/* ── CABEÇALHO COM O MENU SUSPENSO ── */}
      <div className="flex justify-between items-start mb-6 md:mb-10 mt-6 relative">
        <div className="relative z-50">
          <button
            onClick={(e) => { e.stopPropagation(); setMostrarDropdown(!mostrarDropdown); }}
            className="bg-zinc-800 text-white px-4 md:px-6 py-2 rounded flex items-center gap-2 md:gap-3 font-bold text-sm md:text-xl border border-zinc-700 cursor-pointer hover:bg-zinc-700 transition-colors"
          >
            Temporada {temporadaAtiva} <span className="text-xs md:text-sm">{mostrarDropdown ? '▲' : '▼'}</span>
          </button>

          {mostrarDropdown && (
            <div className="absolute top-full left-0 mt-2 w-full min-w-[150px] bg-zinc-800 border border-zinc-700 rounded shadow-2xl overflow-hidden animate-fade-in">
              {temporadasDisponiveis.map(temp => (
                <button
                  key={`drop-${temp}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTemporadaAtiva(temp);
                    setMostrarDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm md:text-base font-bold transition-colors ${temporadaAtiva === temp ? 'bg-red-600 text-white' : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                    }`}
                >
                  Temporada {temp}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={onClose} className="text-white hover:scale-125 transition-transform">
          <X className="w-8 h-8 md:w-11 md:h-11" />
        </button>
      </div>

      {/* ── LISTA DE EPISÓDIOS FILTRADA ── */}
      <div className="flex gap-4 overflow-x-auto pb-8 scrollbar-hide snap-x">
        {episodiosParaMostrar.map((ep) => {
          const isCurrent = ep.id === currentEpisodeId;
          return (
            <div key={ep.id} onClick={() => onSelectEpisode(ep)} className={`flex-none w-[240px] md:w-[320px] snap-start cursor-pointer group ${isCurrent ? 'opacity-100' : 'opacity-60 hover:opacity-100 transition-opacity'}`}>
              <div className="relative aspect-video rounded-md overflow-hidden mb-3 md:mb-4 bg-zinc-900">
                <img src={ep.thumbnailUrl} alt={ep.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/50 flex items-center justify-center transition-colors">
                  <Play className={`w-10 h-10 md:w-12 md:h-12 text-white transition-transform ${isCurrent ? 'scale-100' : 'scale-0 group-hover:scale-100'}`} fill="white" />
                </div>
                {isCurrent && <div className="absolute bottom-0 left-0 h-1.5 bg-red-600 w-full" />}
              </div>
              <div className="flex justify-between items-start mb-2">
                <div className="pr-2 md:pr-4">
                  <h3 className={`font-bold text-sm md:text-lg ${isCurrent ? 'text-white' : 'text-zinc-200'}`}>
                    {ep.number ? `${ep.number}. ` : ''}{ep.title}
                  </h3>
                  <p className="text-zinc-500 text-xs md:text-sm mt-1">{ep.duration || '24m'}</p>
                </div>
                <button className="text-zinc-400 hover:text-white p-1" onClick={(e) => { e.stopPropagation(); console.log("Download", ep.id); }}><Download className="w-5 h-5 md:w-6 md:h-6" /></button>
              </div>
              <p className="text-zinc-400 text-xs md:text-sm mt-2 line-clamp-3 leading-snug">{ep.description || 'Descrição indisponível no momento.'}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const formatTime = (timeInSeconds: number) => {
  if (isNaN(timeInSeconds)) return "00:00";
  const h = Math.floor(timeInSeconds / 3600);
  const m = Math.floor((timeInSeconds % 3600) / 60);
  const s = Math.floor(timeInSeconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --- O PLAYER PRINCIPAL ---
const VideoPlayer: React.FC<VideoPlayerProps> = ({ content, allEpisodes = [], onClose, onNavigateToEpisode, userPlan = 1000, isLive = false }) => {
  const { userData } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const hlsRef = useRef<Hls | null>(null);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [activeAudio, setActiveAudio] = useState<number>(0);
  const [activeSubtitle, setActiveSubtitle] = useState<number>(-1);

  const [acessoAutorizado, setAcessoAutorizado] = useState(false);
  const [erroBloqueio, setErroBloqueio] = useState<string | null>(null);

  const accumulatedTimeRef = useRef(0);
  const lastPlayTimeRef = useRef<number | null>(null);

  const isSeries = allEpisodes.length > 0 && (content.number !== undefined || content.season !== undefined);
  const nextEpisode = isSeries ? allEpisodes.find(ep => Number(ep.number) === Number(content.number) + 1 && Number(ep.season) === Number(content.season)) : null;
  const isEmbed = content?.videoUrl?.includes('youtube.com') || content?.videoUrl?.includes('facebook.com');

  useEffect(() => {
    const validarAcesso = async () => {
      if (isEmbed) {
        setAcessoAutorizado(true);
        return;
      }
      try {
        const functions = getFunctions();
        const solicitarAcesso = httpsCallable(functions, 'solicitarAcessoVideo');
        const deviceId = localStorage.getItem('bazar_device_id') || 'dispositivo_desconhecido';

        await solicitarAcesso({
          movieId: content.id,
          deviceId: deviceId
        });

        setAcessoAutorizado(true);
      } catch (err: any) {
        console.error("Acesso negado pelo servidor:", err);
        setErroBloqueio(err.message === 'BLOCK_LIMIT' ? 'Limite de ecrãs simultâneos atingido no seu plano.' : 'Acesso restrito ou negado.');
      }
    };

    if (content?.id) {
      validarAcesso();
    } else if (isEmbed) {
      setAcessoAutorizado(true);
    }
  }, [content?.id, isEmbed]);

  const saveRealWatchTimeToDB = async () => {
    let extraTime = 0;
    if (lastPlayTimeRef.current) {
      extraTime = (Date.now() - lastPlayTimeRef.current) / 1000;
    }
    const totalSessionSeconds = Math.floor(accumulatedTimeRef.current + extraTime);

    if (totalSessionSeconds > 0) {
      if (userData?.uid) {
        try {
          const userRef = doc(db, "users", userData.uid);
          await updateDoc(userRef, { watchTimeSeconds: increment(totalSessionSeconds) });
        } catch (e) {
          console.error("Erro ao salvar tempo de visualização no User:", e);
        }
      }

      if (content?.id) {
        try {
          const targetAssetId = content.seriesId || content.id;
          const movieRef = doc(db, "movies", targetAssetId);
          await updateDoc(movieRef, { totalWatchTime: increment(totalSessionSeconds) });
        } catch (e) {
          console.error("Erro ao salvar tempo de visualização no Filme:", e);
        }
      }

      accumulatedTimeRef.current = 0;
      lastPlayTimeRef.current = null;
    }
  };

  const handleBack = async () => {
    await saveRealWatchTimeToDB();
    onClose();
  };

  const handleNext = async () => {
    await saveRealWatchTimeToDB();
    if (nextEpisode && onNavigateToEpisode) {
      onNavigateToEpisode(nextEpisode);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    return () => { saveRealWatchTimeToDB(); };
  }, []);

  useEffect(() => {
    if (!acessoAutorizado || isEmbed || !content?.videoUrl) return;
    const video = videoRef.current;
    if (!video) return;

    setIsBuffering(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (content.videoUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: isLive ? 10 : 30, maxMaxBufferLength: isLive ? 15 : 60,
          lowLatencyMode: true, liveSyncDurationCount: isLive ? 3 : undefined, abrEwmaDefaultEstimate: 1000000,
        });

        hls.loadSource(content.videoUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsBuffering(false);
          const levels = hls.levels;
          if (userPlan === 1000) {
            const bestLevel = levels.findIndex(l => l.height > 720);
            hls.nextLevel = bestLevel === -1 ? levels.length - 1 : bestLevel - 1;
          } else if (userPlan === 2999) {
            const bestLevel = levels.findIndex(l => l.height > 1080);
            hls.nextLevel = bestLevel === -1 ? levels.length - 1 : bestLevel - 1;
          }
          setAudioTracks(hls.audioTracks || []);
          setSubtitleTracks(hls.subtitleTracks || []);
          setActiveAudio(hls.audioTrack);
          setActiveSubtitle(hls.subtitleTrack);

          if (content.id) {
            const savedTime = localStorage.getItem(`bazar_tv_time_${content.id}`);
            if (savedTime && parseFloat(savedTime) > 0) video.currentTime = parseFloat(savedTime);
          }
          video.play().catch(() => setIsPlaying(false));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
            else hls.recoverMediaError();
          }
        });
      }
    } else {
      video.src = content.videoUrl;
      video.load();
      video.oncanplay = () => {
        setIsBuffering(false);
        if (content.id) {
          const savedTime = localStorage.getItem(`bazar_tv_time_${content.id}`);
          if (savedTime && parseFloat(savedTime) > 0) video.currentTime = parseFloat(savedTime);
        }
        video.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.warn("Navegador bloqueou o Autoplay:", err);
          setIsPlaying(false);
        });
      };
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [content?.videoUrl, userPlan, isLive, isEmbed, acessoAutorizado]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showEpisodesModal || showSettings || !acessoAutorizado) return;
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowRight') skip(10);
      if (e.key === 'ArrowLeft') skip(-10);
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'Escape') handleBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, showEpisodesModal, showSettings, acessoAutorizado]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
      else { videoRef.current.pause(); setIsPlaying(false); }
    }
  }, []);

  const skip = (amount: number) => { if (videoRef.current) videoRef.current.currentTime += amount; };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!showSettings) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const changeAudioTrack = (index: number) => {
    if (hlsRef.current) { hlsRef.current.audioTrack = index; setActiveAudio(index); }
  };

  const changeSubtitleTrack = (index: number) => {
    setActiveSubtitle(index);
    if (hlsRef.current && subtitleTracks.length > 0) {
      hlsRef.current.subtitleTrack = index;
    } else if (videoRef.current && videoRef.current.textTracks) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) tracks[i].mode = 'hidden';
      if (index >= 0 && tracks[index]) tracks[index].mode = 'showing';
    }
  };

  if (erroBloqueio) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center text-white p-6 text-center select-none backdrop-blur-md">
        <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl max-w-md w-full flex flex-col items-center shadow-2xl animate-fade-in">
          <div className="bg-white/5 p-5 rounded-full mb-6">
            <AlertTriangle size={48} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 text-center">{erroBloqueio}</h1>
          <button onClick={handleBack} className="w-full bg-red-600 text-white font-black py-4 rounded-xl uppercase tracking-widest hover:bg-red-700 transition-colors mt-4">
            Sair do Vídeo
          </button>
        </div>
      </div>
    );
  }

  if (!acessoAutorizado) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center select-none">
        <Loader2 className="w-16 h-16 text-red-600 animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
      style={{ cursor: showControls && !showEpisodesModal ? 'default' : 'none' }}
    >
      <button
        onClick={handleBack}
        className={`absolute top-4 left-4 md:top-8 md:left-8 z-[110] text-white/70 hover:text-white flex items-center gap-2 md:gap-3 transition-all duration-500 hover:scale-110 ${showControls && !showEpisodesModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <X className="w-8 h-8 md:w-12 md:h-12" />
        <span className="hidden md:inline text-xl font-bold uppercase tracking-widest">Sair</span>
      </button>

      {isBuffering && !isEmbed && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <Loader2 className="w-12 h-12 md:w-20 md:h-20 text-red-600 animate-spin opacity-80" />
        </div>
      )}

      <div className="w-full h-full relative" onClick={() => {
        if (showSettings) setShowSettings(false);
        else if (!showEpisodesModal) togglePlay();
      }}>
        {!isEmbed ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain pointer-events-none"
            onTimeUpdate={() => {
              const time = videoRef.current?.currentTime || 0;
              setCurrentTime(time);
              if (content?.id && time > 0) localStorage.setItem(`bazar_tv_time_${content.id}`, time.toString());
            }}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => {
              setIsBuffering(false);
              lastPlayTimeRef.current = Date.now();
              setIsPlaying(true);
            }}
            onPause={() => {
              if (lastPlayTimeRef.current) {
                accumulatedTimeRef.current += (Date.now() - lastPlayTimeRef.current) / 1000;
                lastPlayTimeRef.current = null;
              }
            }}
            onEnded={handleNext}
            muted={isMuted}
          >
            {content?.subtitles?.map((sub, index) => (
              <track key={index} kind="subtitles" src={sub.url} srcLang={sub.lang} label={sub.label} default={sub.default} />
            ))}
          </video>
        ) : (
          <iframe src={`${content.videoUrl}?autoplay=1`} className="w-full h-full border-none pointer-events-auto" allowFullScreen />
        )}
      </div>

      {!isEmbed && (
        <div className={`absolute inset-0 bg-gradient-to-t from-black/100 via-transparent to-black/80 flex flex-col justify-between p-4 md:p-12 transition-opacity duration-700 ${showControls && !showEpisodesModal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="mt-12 md:mt-14">
            <h1 className="text-white text-2xl md:text-5xl font-black drop-shadow-2xl line-clamp-2">{content.seriesTitle || content.title}</h1>
            {isSeries && (
              <p className="text-red-600 text-sm md:text-2xl font-bold mt-1 md:mt-2 uppercase tracking-widest">
                T{content.season} : E{content.number} — {content.title}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-10 md:gap-24 pointer-events-auto">
            <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="text-white/60 hover:text-white transition-all hover:scale-125"><RotateCcw className="w-8 h-8 md:w-16 md:h-16" /></button>
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white hover:scale-110 transition-all">
              {isPlaying ? <Pause className="w-16 h-16 md:w-28 md:h-28" fill="white" /> : <Play className="w-16 h-16 md:w-28 md:h-28" fill="white" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="text-white/60 hover:text-white transition-all hover:scale-125"><RotateCw className="w-8 h-8 md:w-16 md:h-16" /></button>
          </div>

          <div className="space-y-4 md:space-y-8 pointer-events-auto mb-2 md:mb-0">
            <div className="flex items-center gap-3 md:gap-4 w-full">
              <span className="text-white/80 font-medium text-xs md:text-sm w-10 md:w-14 text-center tabular-nums">{formatTime(currentTime)}</span>
              <div className="group/progress relative h-2 md:h-3 flex-1 bg-white/10 rounded-full cursor-pointer flex items-center">
                <input
                  type="range" min="0" max={duration || 0} value={currentTime}
                  onChange={(e) => {
                    const time = parseFloat(e.target.value);
                    setCurrentTime(time);
                    if (videoRef.current) videoRef.current.currentTime = time;
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 z-30 cursor-pointer"
                />
                <div className="h-full bg-red-600 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.8)]" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
              </div>
              <span className="text-white/80 font-medium text-xs md:text-sm w-10 md:w-14 text-center tabular-nums">{formatTime(duration)}</span>
            </div>

            <div className="flex justify-between items-center text-white/90">
              <div className="flex items-center gap-4 md:gap-12">
                <button onClick={() => setIsMuted(!isMuted)} className="hover:text-red-500 transition-colors">
                  {isMuted || volume === 0 ? <VolumeX className="w-6 h-6 md:w-10 md:h-10" /> : <Volume2 className="w-6 h-6 md:w-10 md:h-10" />}
                </button>
                <button onClick={() => {
                  const speeds = [1, 1.5, 2, 0.75];
                  const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                  setPlaybackSpeed(next);
                  if (videoRef.current) videoRef.current.playbackRate = next;
                }} className="text-[10px] md:text-sm font-black tracking-widest bg-white/10 px-3 md:px-6 py-1.5 md:py-2 rounded-md hover:bg-red-600 transition-all uppercase">
                  {playbackSpeed}x <span className="hidden md:inline">Velocidade</span>
                </button>
              </div>

              <div className="flex items-center gap-4 md:gap-10">
                <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className="flex flex-col items-center gap-1 hover:text-red-500 transition-all hover:-translate-y-1">
                  <MessageSquare className="w-6 h-6 md:w-10 md:h-10" />
                  <span className="text-[8px] md:text-[11px] font-black uppercase tracking-tighter">Áudio/Leg</span>
                </button>

                {isSeries && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setShowEpisodesModal(true); setShowSettings(false); }} className="flex flex-col items-center gap-1 hover:text-red-500 transition-all hover:-translate-y-1">
                      <Layers className="w-6 h-6 md:w-10 md:h-10" />
                      <span className="text-[8px] md:text-[11px] font-black uppercase tracking-tighter">Episódios</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleNext(); }} disabled={!nextEpisode} className={`flex flex-col items-center gap-1 transition-all ${nextEpisode ? 'hover:text-red-500 hover:-translate-y-1 opacity-100' : 'opacity-20 cursor-not-allowed'}`}>
                      <SkipForward className="w-6 h-6 md:w-10 md:h-10" fill={nextEpisode ? "currentColor" : "none"} />
                      <span className="text-[8px] md:text-[11px] font-black uppercase tracking-tighter">Próximo</span>
                    </button>
                  </>
                )}
                <button onClick={toggleFullscreen} className="hover:scale-125 transition-all hover:text-red-500 hidden md:block">
                  <Maximize className="w-6 h-6 md:w-10 md:h-10" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="absolute right-4 md:right-12 bottom-20 md:bottom-32 bg-[#141414]/95 backdrop-blur-md border border-zinc-800 rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-12 z-[150] shadow-2xl animate-fade-in max-h-[60vh] md:max-h-none overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col gap-3 md:gap-4">
            <h3 className="text-white font-bold text-lg md:text-xl mb-1 md:mb-2 border-b border-zinc-700 pb-2">Áudio</h3>
            {audioTracks.length > 0 ? audioTracks.map((track, index) => (
              <button key={index} onClick={() => changeAudioTrack(index)} className={`text-left font-bold text-sm md:text-base transition-colors ${activeAudio === index ? 'text-white flex items-center gap-2' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {activeAudio === index && <span className="text-red-600 text-lg">●</span>}
                {track.name || `Áudio ${index + 1}`}
              </button>
            )) : <span className="text-zinc-600 text-sm md:text-base italic font-bold">Original (único)</span>}
          </div>
          <div className="flex flex-col gap-3 md:gap-4 md:border-l md:border-zinc-800 md:pl-12 pt-4 md:pt-0 border-t border-zinc-800 md:border-t-0">
            <h3 className="text-white font-bold text-lg md:text-xl mb-1 md:mb-2 border-b border-zinc-700 pb-2">Legendas</h3>
            <button onClick={() => changeSubtitleTrack(-1)} className={`text-left font-bold text-sm md:text-base transition-colors ${activeSubtitle === -1 ? 'text-white flex items-center gap-2' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {activeSubtitle === -1 && <span className="text-red-600 text-lg">●</span>} Desligado
            </button>
            {(subtitleTracks.length > 0 ? subtitleTracks : (content.subtitles || [])).map((track, index) => (
              <button key={index} onClick={() => changeSubtitleTrack(index)} className={`text-left font-bold text-sm md:text-base transition-colors ${activeSubtitle === index ? 'text-white flex items-center gap-2' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {activeSubtitle === index && <span className="text-red-600 text-lg">●</span>} {track.label || track.name || `Legenda ${index + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {showEpisodesModal && isSeries && (
        <EpisodeModal episodes={allEpisodes} currentEpisodeId={content.id || ""} currentSeason={content.season || 1} onClose={() => setShowEpisodesModal(false)} onSelectEpisode={(ep) => { setShowEpisodesModal(false); if (onNavigateToEpisode) onNavigateToEpisode(ep); }} />
      )}
    </div>
  );
};

export default VideoPlayer;