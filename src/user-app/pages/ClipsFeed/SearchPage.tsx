import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../../../shared/services/firebase';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { Search, Loader2, Play, ArrowLeft, X } from 'lucide-react';
import { SearchVideoModal, SearchClipItem } from './SearchVideoModal';

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

interface ProfileSearchResult { id: string; name?: string; profileImage?: string; username?: string; verified?: boolean; }

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const isDay = useTimeBasedTheme();
  const [queryText, setQueryText] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tudo' | 'perfis' | 'cortes'>('tudo');
  const [results, setResults] = useState<{ clips: SearchClipItem[]; profiles: ProfileSearchResult[] }>({ clips: [], profiles: [] });
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  useEffect(() => {
    const q = queryText.trim();
    if (q) {
      setSearchParams({ q }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [queryText, setSearchParams]);

  useEffect(() => {
    const q = queryText.trim().toLowerCase();
    if (q.length < 2) {
      setResults({ clips: [], profiles: [] });
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const clipsQ = query(collection(db, 'clips'), limit(30));
        const usersQ = query(collection(db, 'users'), limit(30));

        const [clipsSnap, usersSnap] = await Promise.all([getDocs(clipsQ), getDocs(usersQ)]);

        const matchedClips = clipsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as SearchClipItem))
          .filter(c => c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));

        const matchedProfiles = usersSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as ProfileSearchResult))
          .filter(u => u.name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q));

        setResults({ clips: matchedClips, profiles: matchedProfiles });
      } catch (error) {
        console.error('Erro na pesquisa global Bazar TV:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [queryText]);

  const bgClass = isDay ? 'bg-[#f5f5f5] text-black' : 'bg-[#141414] text-white';
  const cardBgClass = isDay ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800';
  const mutedClass = isDay ? 'text-zinc-500' : 'text-zinc-400';

  const handleBackAction = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/clips');
    }
  };

  return (
    <div className={`min-h-screen ${bgClass} pb-28 pt-4 px-3 sm:px-6 max-w-5xl mx-auto`}>
    {/* Barra de Pesquisa Integrada com Seta de Voltar (Sem botão vermelho solto em cima) */}
      <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border ${cardBgClass} shadow-sm mb-6`}>
        {/* Seta de recuar interativa no telemóvel (exclusiva mobile: flex md:hidden) */}
        <button 
          type="button"
          onClick={handleBackAction} 
          aria-label="Recuar página de pesquisa"
          className="flex md:hidden p-2 -ml-2 rounded-full transition-colors text-zinc-400 hover:text-red-500 shrink-0 cursor-pointer items-center justify-center active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <Search size={18} className="text-red-500 shrink-0 ml-1" />
        <input
          type="text"
          autoFocus
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="Pesquisar perfis, criadores ou cortes..."
          className="bg-transparent text-sm outline-none w-full font-medium"
        />
        {loading && <Loader2 size={16} className="animate-spin text-red-500 shrink-0" />}
      </div>

      {/* Abas de Filtro */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { id: 'tudo', label: 'Tudo' },
          { id: 'perfis', label: `Perfis (${results.profiles.length})` },
          { id: 'cortes', label: `Cortes (${results.clips.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === tab.id ? 'bg-red-600 text-white shadow-md' : `${cardBgClass}${mutedClass}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da Pesquisa */}
      {queryText.trim().length < 2 ? (
        <div className={`text-center py-20 ${mutedClass} space-y-2`}>
          <Search size={40} className="mx-auto opacity-30 mb-3" />
          <p className="text-sm font-bold">Começa a escrever para pesquisar</p>
          <p className="text-xs">Encontra criadores, páginas oficiais e cortes da Bazar TV.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Seção de Perfis */}
          {(activeTab === 'tudo' || activeTab === 'perfis') && results.profiles.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-3">Perfis Encontrados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {results.profiles.map(p => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/profile/${p.id}`)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${cardBgClass} hover:border-red-500/50`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-red-500/30">
                      {p.profileImage ? (
                        <img src={p.profileImage} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-white text-base">
                          {p.name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{p.name || 'Utilizador'}</p>
                      {p.username && <p className={`text-[10px] ${mutedClass} truncate`}>@{p.username}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seção de Cortes */}
          {(activeTab === 'tudo' || activeTab === 'cortes') && results.clips.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 mb-3">Cortes & Destaques</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {results.clips.map(clip => (
                  <div
                    key={clip.id}
                    onClick={() => setSelectedClipId(clip.id)}
                    className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 cursor-pointer group shadow-md border border-white/5"
                  >
                    {clip.videoUrl ? (
                      <video src={clip.videoUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <div className="w-full h-full bg-zinc-800" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                      <p className="text-xs font-bold text-white line-clamp-2 drop-shadow-md">{clip.title || 'Corte sem título'}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-300">
                        <Play size={10} className="fill-white" />
                        <span>Ver corte</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado Vazio */}
          {!loading && results.profiles.length === 0 && results.clips.length === 0 && (
            <div className={`text-center py-20 ${mutedClass}`}>
              <p className="text-sm font-bold">Nenhum resultado para "{queryText}"</p>
              <p className="text-xs mt-1">Tenta pesquisar por outro nome ou termo.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Dedicado de Reprodução de Vídeos da Pesquisa */}
      {selectedClipId && (
        <SearchVideoModal
          clips={results.clips}
          initialClipId={selectedClipId}
          isDay={isDay}
          onClose={() => setSelectedClipId(null)}
        />
      )}
    </div>
  );
}