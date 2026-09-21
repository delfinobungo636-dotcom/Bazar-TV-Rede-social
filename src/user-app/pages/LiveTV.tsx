import React, { useEffect, useState, useRef, useMemo } from 'react';
import { db } from '../../shared/services/firebase'; 
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore'; 
import { Radio, Play, X, Loader2, ExternalLink, Film, Wifi, AlertTriangle, RefreshCw } from 'lucide-react';
import ReactPlayer from 'react-player';
import { useAuthContext } from '../../shared/context/AuthContext'; 
import hls from 'hls.js';

// ============================================================================
// 1. INTERFACES
// ============================================================================
interface Channel {
  id: string;
  name: string;
  logoUrl: string;
  streamUrl: string;
  category?: string;
  sourceType?: 'hls' | 'youtube' | 'facebook' | 'tiktok' | 'other';
  isAutoPlaylist?: boolean;
}

interface Movie {
  id: string;
  title: string;
  videoUrl: string;
  durationInSeconds: number;
}

// ============================================================================
// 2. HELPER: VALIDAÇÃO DE URL (EVITA gs:// E URLS VAZIAS)
// ============================================================================
function isPlayableUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('gs://')) {
    console.warn("🚨 URL em formato gs:// não funciona no browser. Precisa ser um link https:// de download (getDownloadURL).");
    return false;
  }
  return url.startsWith('http://') || url.startsWith('https://');
}

// ============================================================================
// 3. OVERLAY DE ERRO (FEEDBACK VISUAL EM VEZ DE ECRÃ PRETO SILENCIOSO)
// ============================================================================
const PlaybackErrorOverlay = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm p-6 text-center">
    <AlertTriangle className="text-red-500 mb-4" size={36} />
    <p className="text-white font-black uppercase tracking-widest text-xs mb-1">Sinal Indisponível</p>
    <p className="text-zinc-500 text-[11px] mb-6 max-w-xs">{message}</p>
    <button
      onClick={onRetry}
      className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest inline-flex items-center gap-2 transition-colors"
    >
      <RefreshCw size={14} /> Tentar Novamente
    </button>
  </div>
);

// ============================================================================
// 4. MOTOR DE LOOP (CANAIS AUTOMÁTICOS) - COM BYPASS DE AUTOPLAY (UNMUTE)
// ============================================================================
// Lembra-te de importar o useMemo no topo do teu ficheiro:
// import React, { useEffect, useState, useRef, useMemo } from 'react';

const AutoPlaylistPlayer = ({ channel }: { channel: Channel }) => {
  // 1. TODOS OS HOOKS DE ESTADO PRIMEIRO
  const [playlist, setPlaylist] = useState<Movie[]>([]);
  const [currentMovie, setCurrentMovie] = useState<(Movie & { startAt: number }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState(true); 
  const [showUnmuteButton, setShowUnmuteButton] = useState(true);

  const { sysConfig } = useAuthContext(); 
  const playerRef = useRef<any>(null); 
  const hasSeekedRef = useRef(false); 
  const Player = ReactPlayer as any;

  // 2. PREPARAR VARIÁVEIS PARA O USEMEMO DE FORMA SEGURA (Antes dos returns)
  const isDataSaver = sysConfig?.dataSaverMode === true;
  const maxBitrate = sysConfig?.maxVideoQuality === '480p' ? 1000000 : sysConfig?.maxVideoQuality === '720p' ? 2500000 : 5000000;
  // Usamos o operador '?' para evitar erros se currentMovie ainda for nulo
  const url = currentMovie?.videoUrl || ''; 
  const isM3U8 = url.includes('.m3u8');

  // 3. O USEMEMO AGORA ESTÁ AQUI EM CIMA! BEM SEGURO.
  const playerConfig = useMemo(() => {
    return {
      file: {
        forceHLS: isM3U8,
        forceVideo: !isM3U8,
        attributes: { disablePictureInPicture: true, controlsList: 'nodownload' },
        hlsOptions: isM3U8 ? {
          maxBufferLength: isDataSaver ? 15 : 60,
          maxMaxBitrate: maxBitrate,
          capLevelToPlayerSize: isDataSaver,
          xhrSetup: function(xhr: any) { xhr.withCredentials = false; }
        } : undefined
      }
    };
  }, [isM3U8, isDataSaver, maxBitrate]);

  // 4. AS FUNÇÕES E O USEEFFECT
  const fetchAndSyncMovies = async () => {
    setErrorMsg(null);
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'movies'));

      let fetchedMovies: Movie[] = [];
      let skippedCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const hasValidUrl = isPlayableUrl(data.videoUrl);
        const hasValidDuration = typeof data.durationInSeconds === 'number' && data.durationInSeconds > 0;

        if (hasValidUrl && hasValidDuration) {
          fetchedMovies.push({
            id: doc.id,
            title: data.title || 'Sem título',
            videoUrl: data.videoUrl,
            durationInSeconds: Number(data.durationInSeconds)
          });
        } else {
          skippedCount++;
        }
      });

      if (fetchedMovies.length === 0) {
        setErrorMsg('Nenhum filme com vídeo e duração válidos foi encontrado no catálogo.');
        setLoading(false);
        return;
      }

      const totalLoopTime = fetchedMovies.reduce((t, m) => t + m.durationInSeconds, 0);

      if (totalLoopTime <= 0) {
        setErrorMsg('Duração total da playlist é inválida (0 segundos).');
        setLoading(false);
        return;
      }

      const now = new Date();
      const secondsSinceMidnight = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
      const currentPositionInLoop = secondsSinceMidnight % totalLoopTime;

      let timeAccumulator = 0, selectedMovie: Movie | null = null, startVideoAtSecond = 0;
      for (let i = 0; i < fetchedMovies.length; i++) {
        if (currentPositionInLoop >= timeAccumulator && currentPositionInLoop < timeAccumulator + fetchedMovies[i].durationInSeconds) {
          selectedMovie = fetchedMovies[i];
          startVideoAtSecond = currentPositionInLoop - timeAccumulator;
          break;
        }
        timeAccumulator += fetchedMovies[i].durationInSeconds;
      }

      if (!selectedMovie) {
        selectedMovie = fetchedMovies[0];
        startVideoAtSecond = 0;
      }

      setPlaylist(fetchedMovies);
      setCurrentMovie({ ...selectedMovie, startAt: startVideoAtSecond });
      hasSeekedRef.current = false;
    } catch (error) {
      console.error("🚨 Erro ao puxar filmes:", error);
      setErrorMsg('Erro ao ligar ao catálogo. Verifica a tua ligação.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndSyncMovies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReady = (player: any) => {
    if (currentMovie?.startAt && currentMovie.startAt > 0 && !hasSeekedRef.current) {
      setTimeout(() => {
        try {
          const targetPlayer = playerRef.current || player;
          if (targetPlayer && typeof targetPlayer.seekTo === 'function') {
            targetPlayer.seekTo(currentMovie.startAt, 'seconds');
          }
        } catch (error) {
          console.error("Erro protegido ao saltar o tempo do filme:", error);
        }
      }, 1500);
      hasSeekedRef.current = true;
    }
  };

  const handleMovieEnd = () => {
    if (playlist.length === 0 || !currentMovie) return;
    const nextIndex = (playlist.findIndex(m => m.id === currentMovie.id) + 1) % playlist.length;
    setCurrentMovie({ ...playlist[nextIndex], startAt: 0 });
    hasSeekedRef.current = false;
  };

  const handleUnmuteClick = () => {
    setIsMuted(false);
    setShowUnmuteButton(false);
  };

  const handlePlayerError = (e: any) => {
    console.error("🚨 Erro na Playlist Loop:", e);
    setErrorMsg('Este vídeo não pôde ser carregado. Pode ser um link inválido ou formato não suportado.');
  };

  // 5. SÓ AGORA É QUE PODEMOS TER OS 'RETURNS' QUE PARAM A RENDERIZAÇÃO
  if (loading) return <div className="absolute inset-0 flex items-center justify-center z-20"><Loader2 className="animate-spin text-red-600" size={40} /></div>;
  if (errorMsg) return <PlaybackErrorOverlay message={errorMsg} onRetry={fetchAndSyncMovies} />;
  if (!currentMovie) return <div className="absolute inset-0 z-20 flex items-center justify-center"><p className="text-zinc-500">Sem Filmes no Catálogo.</p></div>;

  // 6. O RENDER FINAL DO VÍDEO
  return (
    <div className="relative w-full h-full bg-black group">
      {showUnmuteButton && (
        <div
          onClick={handleUnmuteClick}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm cursor-pointer hover:bg-black/30 transition-all"
        >
          <div className="bg-red-600/95 text-white px-8 py-5 rounded-full font-black uppercase tracking-widest text-sm sm:text-base shadow-[0_0_40px_rgba(239,68,68,0.7)] animate-pulse flex items-center gap-3">
            <Radio size={24} /> Toque para Ligar o Som
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 z-30 bg-black/80 backdrop-blur-sm border border-zinc-800 p-3 rounded-xl flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <Film size={20} className="text-red-500" />
        <div>
          <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> {channel.name}</p>
          <p className="text-white font-bold text-sm truncate max-w-[200px]">{currentMovie.title}</p>
        </div>
      </div>

      {isDataSaver && <div className="absolute top-4 right-4 z-30 bg-green-500/10 text-green-500 border border-green-500/30 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100"><Wifi size={12} className="inline mr-1"/> Modo Economia</div>}

      <Player
        ref={playerRef}
        url={currentMovie.videoUrl}
        width="100%"
        height="100%"
        playing={true}
        muted={isMuted}
        controls={!showUnmuteButton}
        playsinline={true}
        config={{
    file: {
      forceHLS: true,
      hlsOptions: {
        debug: true, // Isto vai imprimir o que está a acontecer no F12 -> Console
        enableWorker: true,
        lowLatencyMode: true
      }
    }
  }}
        onReady={handleReady}
        onEnded={handleMovieEnd}
        onError={handlePlayerError}
      />
    </div>
  );
};
// ============================================================================
// 5. ECRÃ PRINCIPAL DE TV (LISTA DE CANAIS E MODAL PLAYER)
// ============================================================================
export default function LiveTV() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [directError, setDirectError] = useState<string | null>(null);
  const { sysConfig } = useAuthContext();

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "channels")), (snapshot) => {
      setChannels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Channel[]);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao puxar canais:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const Player = ReactPlayer as any;

  const openChannel = (channel: Channel) => {
    setDirectError(null);
    setActiveChannel(channel);
  };

  const renderPlayerContent = (channel: Channel) => {
    if (channel.isAutoPlaylist) return <AutoPlaylistPlayer channel={channel} />;

    if (channel.sourceType === 'tiktok') {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6">
          <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center max-w-sm">
            <h3 className="text-white font-black uppercase tracking-widest mb-2">Live do TikTok</h3>
            <p className="text-zinc-500 text-xs mb-6">Bloqueado pela origem. Abre diretamente na App.</p>
            <a href={channel.streamUrl} target="_blank" rel="noreferrer" className="bg-[#ff0050] text-white py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-widest inline-flex items-center gap-2">Abrir App <ExternalLink size={16}/></a>
          </div>
        </div>
      );
    }

    // 🚨 valida a URL antes de tentar tocar
    if (!isPlayableUrl(channel.streamUrl)) {
      return (
        <PlaybackErrorOverlay
          message="O link deste canal está vazio ou num formato inválido (verifica se é https:// e não gs://)."
          onRetry={() => openChannel(channel)}
        />
      );
    }

    if (directError) {
      return <PlaybackErrorOverlay message={directError} onRetry={() => { setDirectError(null); openChannel(channel); }} />;
    }

    const url = channel.streamUrl || '';
    const isM3U8 = url.includes('.m3u8');
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be') || channel.sourceType === 'youtube';
    const forceHLS = (channel.sourceType === 'hls' || isM3U8) && !isYoutube;

    const isDataSaver = sysConfig?.dataSaverMode === true;
    const maxQ = sysConfig?.maxVideoQuality || '1080p';

    return (
      <div className="relative w-full h-full group bg-black">
        {isDataSaver && forceHLS && (
          <div className="absolute top-4 left-4 z-30 bg-green-500/10 text-green-500 border border-green-500/30 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none">
            <Wifi size={12} className="inline mr-1"/> Economia ({maxQ})
          </div>
        )}
        <Player
          url={channel.streamUrl}
          width="100%"
          height="100%"
          playing={true}
          muted={true}
          controls={true}
          playsinline={true}
          stopOnUnmount={true}
          config={{
            file: {
              forceHLS: forceHLS,
              forceVideo: !forceHLS && !isYoutube,
              attributes: { disablePictureInPicture: true, controlsList: 'nodownload' },
              hlsOptions: forceHLS ? {
                maxBufferLength: isDataSaver ? 15 : 40,
                capLevelToPlayerSize: true,
                xhrSetup: function(xhr: any) { xhr.withCredentials = false; }
              } : undefined
            },
            youtube: { playerVars: { showinfo: 1 } }
          }}
          onError={(e: any) => {
            console.error(`🚨 ERRO NO SINAL DIRETO (${channel.name}):`, e);
            setDirectError(`Não foi possível ligar ao sinal de "${channel.name}". Verifica o link do canal no painel de admin.`);
          }}
        />
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 min-h-[50vh] bg-[#050505]">
      <h2 className="text-2xl font-black italic tracking-tighter text-white mb-8 border-l-4 border-red-600 pl-4 flex items-center gap-3">
        EMISSÃO <span className="text-red-500">DIRETA</span> <Radio className="text-red-500 animate-pulse" size={20}/>
      </h2>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" size={40}/></div>
      ) : channels.length === 0 ? (
        <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl p-12 text-center"><Radio className="mx-auto text-zinc-700 mb-4" size={40}/><p className="text-zinc-500 font-black uppercase tracking-widest text-xs">Sinal Cortado</p></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {channels.map((channel) => (
            <div key={channel.id} onClick={() => openChannel(channel)} className="group cursor-pointer bg-zinc-900/40 rounded-2xl border border-zinc-800 hover:border-red-600 overflow-hidden transition-all hover:scale-105 shadow-lg relative">
              <div className="aspect-square sm:aspect-video bg-black flex items-center justify-center p-6 relative">
                <img src={channel.logoUrl} alt={channel.name} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100" />
                <div className="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> LIVE
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <Play className="w-10 h-10 text-white fill-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                </div>
              </div>
              <div className="p-3 border-t border-zinc-800 text-center">
                <h3 className="text-white font-black text-xs uppercase tracking-widest truncate">{channel.name}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL PLAYER — CORRIGIDO: sem camada transparente residual, altura dinâmica no mobile (dvh) */}
      {activeChannel && (
        <div className="fixed inset-0 h-[100dvh] w-screen z-[200] bg-black flex flex-col items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="w-full h-full sm:h-[85vh] max-w-6xl bg-black sm:border border-zinc-800 sm:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col relative">

            <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950 shrink-0">
              <div className="flex items-center gap-3">
                <img src={activeChannel.logoUrl} alt="logo" className="h-6 object-contain" />
                <span className="text-white font-black text-xs uppercase tracking-widest">{activeChannel.name}</span>
              </div>
              <button onClick={() => setActiveChannel(null)} className="p-2 bg-zinc-900 hover:bg-red-600 text-zinc-400 hover:text-white rounded-full transition-colors z-[100] relative"><X size={16}/></button>
            </div>

            <div className="relative w-full flex-1 min-h-0 bg-black flex items-center justify-center">
              <div className="absolute flex flex-col items-center pointer-events-none"><Loader2 className="w-8 h-8 text-zinc-800 animate-spin mb-2" /><span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">A carregar sinal...</span></div>
              {renderPlayerContent(activeChannel)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}