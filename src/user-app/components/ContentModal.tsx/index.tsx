import React, { useState, useEffect } from 'react';
import { X, Play, Plus, ThumbsUp, Share2, Check, Loader2, Calendar, Clock, List, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, limit, increment } from 'firebase/firestore';
import { db } from '../../../shared/services/firebase';
import { useAuth } from '../../../modules/auth/auth.hooks';
import ReactPlayer from 'react-player';

export interface Subtitle {
  url: string;
  lang: string;
  label: string;
  default?: boolean;
}

interface Episode {
  id: string;
  number?: number | string;
  season?: number | string;
  seasonNumber?: number;
  title: string;
  duration: string;
  videoUrl: string;
  thumbnailUrl: string;
  description: string;
  seriesId: string;
  subtitles?: Subtitle[];
}

interface ContentModalProps {
  content: any;
  onClose: () => void;
  onPlay: (movie: any) => void;
}

export const ContentModal: React.FC<ContentModalProps> = ({ content, onClose, onPlay }) => {
  const { userData } = useAuth();
  
  const isMovie = content?.type === 'movie';
  const [activeTab, setActiveTab] = useState(isMovie ? 'more' : 'episodes');
  
  const [isMuted, setIsMuted] = useState(true);
  const [hero, setHero] = useState(content);
  
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [isInList, setIsInList] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const [similarContent, setSimilarContent] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const [selectedSeason, setSelectedSeason] = useState<number>(1);

  // 🚀 OTIMIZAÇÃO DE MEMÓRIA: Substituído onSnapshot por getDoc estático para evitar vazamento na RAM
  useEffect(() => {
    if (!content?.id) return;
    const fetchLatestMovieData = async () => {
      try {
        const docRef = doc(db, 'movies', content.id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          let currentViews = data.views || 0;

          if (typeof currentViews !== 'number' || currentViews < 0) {
            await updateDoc(docRef, { views: 0 });
            currentViews = 0;
          }

          setHero({ id: snapshot.id, ...data, views: currentViews });
        }
      } catch (e) {
        console.warn("Erro ao buscar dados atualizados do filme:", e);
      }
    };
    fetchLatestMovieData();
  }, [content?.id]);

  useEffect(() => {
    const fetchEpisodes = async () => {
      if (!content.id || isMovie) {
        setEpisodes([]);
        return;
      }

      try {
        setLoadingEpisodes(true);
        const q = query(collection(db, "episodes"), where("seriesId", "==", content.id));
        const snapshot = await getDocs(q);
        
        const episodesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Episode));

        episodesList.sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
        setEpisodes(episodesList);

        const availableSeasons = Array.from(new Set(episodesList.map(ep => Number(ep.season) || Number(ep.seasonNumber) || 1))).sort((a, b) => a - b);
        if (availableSeasons.length > 0) {
          setSelectedSeason(availableSeasons[0]);
        }

      } catch (error) {
        console.error("Erro ao carregar episódios:", error);
      } finally {
        setLoadingEpisodes(false);
      }
    };
    fetchEpisodes();
  }, [content.id, isMovie]);

  useEffect(() => {
    const fetchSimilar = async () => {
      if (!hero?.id) return;
      
      const targetCategory = hero.category || hero.genre; 
      
      if (!targetCategory) {
        setSimilarContent([]);
        return;
      }

      try {
        setLoadingSimilar(true);
        const q = query(
          collection(db, "movies"),
          where("category", "==", targetCategory),
          limit(10)
        );
        
        const snapshot = await getDocs(q);
        const similarResults = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => item.id !== hero.id)
          .slice(0, 6);

        setSimilarContent(similarResults);
      } catch (error) {
        console.error("Erro ao procurar recomendações:", error);
      } finally {
        setLoadingSimilar(false);
      }
    };

    fetchSimilar();
  }, [hero?.category, hero?.genre, hero?.id]);

  useEffect(() => {
    const checkUserPreferences = async () => {
      const uid = userData?.uid || userData?.id;
      if (!uid) return;
      
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setIsInList(data.myList?.includes(content.id));
        setIsLiked(data.likedContent?.includes(content.id));
      }
    };
    checkUserPreferences();
  }, [userData, content.id]);

  const handleToggleList = async () => {
    const uid = userData?.uid || userData?.id;
    if (!uid) return alert("Faz login para gerir a tua lista!");
    
    setLoadingAction(true);
    const userRef = doc(db, 'users', uid);
    try {
      if (isInList) {
        await updateDoc(userRef, { myList: arrayRemove(content.id) });
        setIsInList(false);
      } else {
        await updateDoc(userRef, { myList: arrayUnion(content.id) });
        setIsInList(true);
      }
    } catch (e) { console.error(e); } finally { setLoadingAction(false); }
  };

  const handleLike = async () => {
    const uid = userData?.uid || userData?.id;
    if (!uid) return;
    const userRef = doc(db, 'users', uid);
    setIsLiked(!isLiked);
    await updateDoc(userRef, {
      likedContent: isLiked ? arrayRemove(content.id) : arrayUnion(content.id)
    });
  };

  const registerViewIfNeeded = async (targetId: string) => {
    try {
      const viewedKey = 'bazar_viewed_movies';
      const viewedMovies = JSON.parse(sessionStorage.getItem(viewedKey) || '[]');

      if (!viewedMovies.includes(targetId)) {
        const movieRef = doc(db, "movies", targetId);
        await updateDoc(movieRef, { views: increment(1) });

        viewedMovies.push(targetId);
        sessionStorage.setItem(viewedKey, JSON.stringify(viewedMovies));
      }
    } catch (e) {
      console.warn("Erro ao registrar visualização:", e);
    }
  };

  const filteredEpisodes = episodes.filter(ep => (Number(ep.season) || Number(ep.seasonNumber) || 1) === selectedSeason);
  const allSeasons = Array.from(new Set(episodes.map(ep => Number(ep.season) || Number(ep.seasonNumber) || 1))).sort((a, b) => a - b);

  const handlePlayMain = () => {
    if (!isMovie && episodes.length > 0) {
        const epToPlay = filteredEpisodes.length > 0 ? filteredEpisodes[0] : episodes[0];
        registerViewIfNeeded(content.id);
        onPlay({
          ...hero, 
          id: epToPlay.id, 
          videoUrl: epToPlay.videoUrl, 
          title: `${hero.title} - ${epToPlay.title}`,
          seriesId: content.id,
          season: epToPlay.season || epToPlay.seasonNumber || 1,
          number: epToPlay.number,
          subtitles: epToPlay.subtitles || hero.subtitles || []
        });
    } else if (hero.videoUrl && hero.videoUrl.trim() !== '') {
        registerViewIfNeeded(hero.id || content.id);
        onPlay(hero);
    } else {
        alert("O vídeo deste conteúdo ainda não foi carregado nos servidores da Bazar TV.");
    }
  };

  if (!content) return null;

  const isBazarNews = hero?.title?.toLowerCase().includes('bazar news');
  const Player = ReactPlayer as any;

  return (
    <div className="fixed inset-0 z-[100] bg-[#141414] overflow-y-auto animate-fade-in text-white font-sans">
      
      <div className="relative h-[56.25vw] md:h-[75vh] w-full bg-black flex items-center justify-center overflow-hidden">
        {hero.videoUrl ? (
          isBazarNews ? (
            <div className="absolute inset-0 w-full h-full opacity-60 z-10 pointer-events-none">
              <Player
                url={hero.videoUrl}
                width="100%"
                height="100%"
                playing={true}
                muted={isMuted}
                controls={false}
                config={{
                  file: {
                    forceHLS: true,
                    attributes: { crossOrigin: "anonymous" }
                  }
                }}
                className="[&>video]:object-contain"
              />
            </div>
          ) : (
            <video src={hero.videoUrl} autoPlay loop muted={isMuted} playsInline className="w-full h-full object-contain opacity-60 z-10" />
          )
        ) : (
          <img src={hero.coverUrl || hero.thumbnailUrl} className="w-full h-full object-contain opacity-50 z-10" alt="Capa" />
        )}
        
        <div 
          className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110 pointer-events-none" 
          style={{ backgroundImage: `url(${hero.coverUrl || hero.thumbnailUrl})` }}
        />

        <div className="absolute top-6 right-6 flex gap-4 z-[120]">
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20 transition">
             {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
          <button onClick={onClose} className="p-2 bg-black/40 backdrop-blur-md rounded-full hover:bg-white/20 transition">
            <X size={24} />
          </button>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent z-20 pointer-events-none" />
      </div>

      <div className="px-6 py-6 space-y-6 relative z-30 -mt-20 md:-mt-32">
        <div className="space-y-2">
           <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter drop-shadow-2xl">{hero.title}</h2>
           <div className="flex items-center gap-4 text-sm font-bold text-gray-400 flex-wrap">
              <span className="text-green-500 font-black uppercase tracking-tighter">Bazar TV Original</span>
              <span className="flex items-center gap-1"><Calendar size={14}/> {hero.year || '2026'}</span>
              <span className="border border-zinc-600 px-2 py-0.5 rounded text-xs">{hero.rating || '+12'}</span>
              <span className="flex items-center gap-1"><Clock size={14}/> {hero.duration || 'N/A'}</span>
              <span className="text-blue-400 font-bold">👁️ {hero.views ?? 0} Visualizações</span>
           </div>
        </div>

        <div className="flex gap-4 pt-2">
          <button 
            onClick={handlePlayMain} 
            className="flex items-center justify-center gap-2 bg-white text-black px-10 py-3 rounded hover:bg-gray-200 transition font-bold tracking-widest uppercase text-sm shadow-xl"
          >
            <Play fill="black" size={20} />
            Assistir
          </button>
        </div>

        <p className="text-gray-300 text-lg leading-relaxed max-w-3xl drop-shadow">{hero.description}</p>

        <div className="flex items-center gap-12 py-4 border-b border-zinc-800">
          <button onClick={handleToggleList} disabled={loadingAction} className="flex flex-col items-center gap-1 group">
            {loadingAction ? <Loader2 className="animate-spin" size={28} /> : (
              isInList ? <Check size={28} className="text-green-500" /> : <Plus size={28} className="group-hover:text-white transition text-gray-400" />
            )}
            <span className="text-[10px] text-gray-400 uppercase font-bold">{isInList ? 'Na Lista' : 'Minha Lista'}</span>
          </button>

          <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
            <ThumbsUp size={28} className={`${isLiked ? 'text-blue-500 fill-blue-500' : 'text-gray-400 group-hover:text-white'} transition`} />
            <span className="text-[10px] text-gray-400 uppercase font-bold">{isLiked ? 'Curtiu' : 'Classificar'}</span>
          </button>

          <button onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/watch/${content.id}`);
            alert("Link de partilha copiado!");
          }} className="flex flex-col items-center gap-1 group">
            <Share2 size={28} className="text-gray-400 group-hover:text-white transition" />
            <span className="text-[10px] text-gray-400 uppercase font-bold">Partilhar</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 px-6 border-b border-zinc-800">
        {!isMovie && (
           <button
             onClick={() => setActiveTab('episodes')}
             className={`py-4 text-xs font-black uppercase tracking-widest relative ${activeTab === 'episodes' ? 'text-white' : 'text-gray-500'}`}
           >
             Episódios
             {activeTab === 'episodes' && <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600 animate-slide-in" />}
           </button>
        )}
        <button
          onClick={() => setActiveTab('more')}
          className={`py-4 text-xs font-black uppercase tracking-widest relative ${activeTab === 'more' ? 'text-white' : 'text-gray-500'}`}
        >
          Mais como este
          {activeTab === 'more' && <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600 animate-slide-in" />}
        </button>
      </div>

      <div className="p-6">
        {loadingEpisodes ? (
           <div className="py-20 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest">Sincronizando episódios...</div>
        ) : activeTab === 'episodes' && !isMovie ? (
          episodes.length > 0 ? (
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                 <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                    <List size={20} className="text-red-600"/> 
                    {allSeasons.length > 1 ? `Temporada ${selectedSeason}` : 'Episódios'}
                 </h3>
                 
                 {allSeasons.length > 1 && (
                   <div className="relative">
                     <select 
                       value={selectedSeason}
                       onChange={(e) => setSelectedSeason(Number(e.target.value))}
                       className="appearance-none bg-[#242424] text-white border border-zinc-700 px-6 py-2 pr-12 rounded font-bold cursor-pointer outline-none focus:border-red-600 transition-colors"
                     >
                       {allSeasons.map(season => (
                         <option key={season} value={season}>Temporada {season}</option>
                       ))}
                     </select>
                     <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                   </div>
                 )}
               </div>

               <div className="grid gap-4 max-w-6xl">
                  {filteredEpisodes.map((ep) => (
                    <div 
                      key={ep.id} 
                      className="group flex flex-col md:flex-row gap-4 p-4 rounded-xl hover:bg-zinc-800/50 transition cursor-pointer border border-transparent hover:border-zinc-700" 
                      onClick={() => {
                        registerViewIfNeeded(content.id);
                        onPlay({
                          ...hero, 
                          id: ep.id, 
                          videoUrl: ep.videoUrl, 
                          title: `${hero.title} - ${ep.title}`,
                          description: ep.description,
                          seriesId: content.id,
                          season: ep.season || ep.seasonNumber || 1,
                          number: ep.number,
                          subtitles: ep.subtitles || hero.subtitles || []
                        });
                      }}
                    >
                      <div className="relative w-full md:w-64 aspect-video rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 shadow-2xl">
                        <img src={ep.thumbnailUrl || hero.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="thumb" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition duration-300">
                          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                            <Play size={24} fill="white" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-center space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="text-lg font-bold uppercase tracking-tight">
                            {ep.number ? `${ep.number}. ` : ''}{ep.title}
                          </h4>
                          <span className="text-xs font-black text-zinc-500 bg-zinc-900 px-2 py-1 rounded">{ep.duration}</span>
                        </div>
                        <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">{ep.description || hero.description}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          ) : (
            <div className="py-20 text-center text-zinc-600 italic font-bold uppercase tracking-widest">Nenhum episódio disponível ainda.</div>
          )
        ) : activeTab === 'more' ? (
          
          <div className="py-2">
            {loadingSimilar ? (
              <div className="py-20 text-center animate-pulse text-zinc-500 font-bold uppercase tracking-widest">A procurar os melhores títulos...</div>
            ) : similarContent.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {similarContent.map((item) => {
                  const savedProgress = localStorage.getItem(`bazar_tv_progress_${item.id}`);
                  const progressValue = savedProgress ? parseFloat(savedProgress) : 0;

                  return (
                    <div key={item.id} onClick={() => onPlay(item)} className="group cursor-pointer flex flex-col gap-3 mb-6">
                      <div className="relative aspect-[2/3] bg-zinc-800 rounded-lg overflow-hidden shadow-lg group-hover:scale-105 transition-all">
                        <img src={item.thumbnailUrl || item.coverUrl} alt={item.title} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                        
                        {item.isLive && <div className="absolute top-2 left-2 bg-red-600 text-[10px] px-2 py-0.5 rounded font-black animate-pulse">DIRECTO</div>}
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                            <Play size={24} fill="white" />
                          </div>
                        </div>

                        {progressValue > 1 && (
                          <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-600/80">
                            <div className="h-full bg-red-600" style={{ width: `${progressValue}%` }}></div>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm font-bold truncate group-hover:text-red-500 transition-colors">{item.title}</p>
                          {item.year && <span className="text-[10px] border border-zinc-700 text-zinc-400 px-1 rounded flex-shrink-0">{item.year}</span>}
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-3 leading-snug">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-600 space-y-4">
                <List size={48} className="opacity-20" />
                <p className="italic font-bold uppercase tracking-widest text-sm">Mais filmes desta categoria chegarão em breve.</p>
              </div>
            )}
          </div>

        ) : null}
      </div>
    </div>
  );
};