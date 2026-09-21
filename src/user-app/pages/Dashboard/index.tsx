import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../../../shared/services/firebase';
import { collection, query, orderBy, getDocs, limit, doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { Play, MonitorOff, Info, Search, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../../../modules/auth/auth.hooks';

// Inicializa a navegação da TV (Basta estar aqui ou no Main)
import { init } from '@noriginmedia/norigin-spatial-navigation';
init({ debug: false, visualDebug: false });

import { ContentModal } from '../../components/ContentModal.tsx';
import HeroSectionUser from '../../components/HeroSection';
import CategoryRow from '../../components/ui/CategoryRow'; // 👈 Importa o teu componente otimizado

import PlansModal from '../../../public-app/components/modals/PlansModal';
import PaymentModal from '../../../public-app/components/modals/PaymentModal';

interface Movie {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  coverUrl: string;
  description?: string;
  category?: string;
  type?: string;
  isLive?: boolean;
  year?: number | string;
  buttonLink?: string;
  views?: number;
}

export default function Dashboard() {
  const { userData, isExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [allContent, setAllContent] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [heroContent, setHeroContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [continueWatching, setContinueWatching] = useState<Movie[]>([]);

  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);
    setIsPlansOpen(false);
    setIsPaymentOpen(true);
  };

  const isDesktop = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "movies"), orderBy("createdAt", "desc"), limit(100));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movie));
        setAllContent(list);
      } catch (err) { console.error("Erro catálogo:", err); } finally { setLoading(false); }
    };

    const unsubHero = onSnapshot(doc(db, 'settings', 'hero'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setHeroContent({ ...data, id: data.id || 'destaque-principal' });
      }
    });

    const loadCache = () => {
      try {
        const cached = localStorage.getItem('bazar_continue_watching');
        if (cached) setContinueWatching(JSON.parse(cached));
      } catch (e) { console.error("Erro ao ler cache", e); }
    };

    fetchData();
    loadCache();

    const restoreModal = sessionStorage.getItem('bazar_return_modal');
    if (restoreModal) {
      try {
        setSelectedMovie(JSON.parse(restoreModal));
        sessionStorage.removeItem('bazar_return_modal');
      } catch (e) { console.error(e); }
    }

    return () => unsubHero();
  }, []);

  const categories = useMemo(() => {
    const filter = (cat: string) => allContent.filter(m => m.category?.toLowerCase() === cat.toLowerCase());
    return [
      { title: " Filmes", items: allContent.filter(m => m.type === 'movie' || m.category?.toLowerCase() === 'filmes') },
      { title: " Séries", items: allContent.filter(m => m.type === 'series' || m.category?.toLowerCase() === 'series') },
      { title: " Desenhos", items: filter('desenhos') },
      { title: " Novelas", items: filter('novelas') },
      { title: " Ficção", items: filter('ficcao') },
    ];
  }, [allContent]);

  const handleWatchRequest = async (movie: any) => {
    const plan = userData?.planId?.toLowerCase();
    if (plan === 'mobile' && isDesktop) {
      alert("⚠️ Plano Mobile funciona apenas no telemóvel.");
      return;
    }

    try {
      const cached = localStorage.getItem('bazar_continue_watching');
      let history = cached ? JSON.parse(cached) : [];
      history = history.filter((m: Movie) => m.id !== movie.id);
      history.unshift(movie);
      if (history.length > 10) history.pop();
      localStorage.setItem('bazar_continue_watching', JSON.stringify(history));
      setContinueWatching(history);
    } catch (e) { console.warn("Erro ao guardar histórico."); }

    try {
      const movieRef = doc(db, "movies", movie.id);
      await updateDoc(movieRef, { views: increment(1) });
    } catch (e) { console.warn("Erro ao contar view."); }

    sessionStorage.setItem('bazar_return_modal', JSON.stringify(movie));
    const targetId = movie.id === 'destaque-principal' ? 'hero' : movie.id;
    navigate(`/watch/${targetId}`, { state: { ...movie } });
  };

  if (isExpired && userData?.role !== 'admin') {
    return (
      <div className="fixed inset-0 h-screen w-full bg-[#141414] flex flex-col items-center justify-center text-white p-10 text-center z-[500]">
        <div className="absolute inset-0 bg-red-900/20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center w-full max-w-md">
          <Calendar size={80} className="text-red-600 mb-6 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
          <h1 className="text-4xl md:text-5xl font-black mb-4 uppercase italic tracking-tighter text-red-600">
            Assinatura Expirada
          </h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            O teu tempo de acesso à Bazar TV terminou. Renova o teu plano agora para continuares a assistir.
          </p>
          <div className="flex flex-col gap-4 w-full">
            <button onClick={() => setIsPlansOpen(true)} className="w-full bg-red-600 hover:bg-red-500 transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm">
              Ver Planos / Renovar
            </button>
            <button onClick={() => auth.signOut()} className="w-full bg-transparent border border-zinc-700 text-zinc-400 hover:text-white hover:border-white transition-all px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm">
              Sair da Conta
            </button>
          </div>
        </div>
        <PlansModal isOpen={isPlansOpen} onClose={() => setIsPlansOpen(false)} onSelectPlan={handlePlanSelect} />
        <PaymentModal plan={selectedPlan} isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#141414] text-white font-sans overflow-x-hidden pb-20">
      {!searchTerm && heroContent && (
        <div className="relative w-full h-[80vh] md:h-[85vh] lg:h-[95vh] bg-black">
          <HeroSectionUser content={heroContent} onPlay={handleWatchRequest} />
          <div className="absolute bottom-0 left-0 w-full h-24 md:h-32 bg-gradient-to-t from-[#141414] to-transparent z-20 pointer-events-none"></div>
        </div>
      )}

      <div className={`px-0 md:px-0 relative z-30 ${searchTerm ? 'pt-28' : '-mt-4 md:-mt-12'}`}>
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-red-600"></div></div>
        ) : (
          <div className="space-y-4 md:space-y-10">
            {continueWatching.length > 0 && (
              <CategoryRow
                title="Continuar a ver"
                items={continueWatching.slice(0, 15)} // Limite de 15 itens aqui também
                onMovieClick={setSelectedMovie}
              />
            )}

            {categories.map((cat, idx) => (
              <CategoryRow 
                key={idx} 
                title={cat.title} 
                items={cat.items.slice(0, 15)} // 🚨 ESTE SLICE SALVA A MEMÓRIA DA TV 🚨
                onMovieClick={setSelectedMovie} 
              />
            ))}
          </div>
        )}
      </div>

      {selectedMovie && (
        <ContentModal content={selectedMovie} onClose={() => setSelectedMovie(null)} onPlay={handleWatchRequest} />
      )}
    </div>
  );
}