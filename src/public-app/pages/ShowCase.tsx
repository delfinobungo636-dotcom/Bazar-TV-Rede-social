import React, { useEffect, useRef, useState, useCallback } from 'react';
import LoginModal from '../components/modals/LoginModal';
import PlansModal from '../components/modals/PlansModal';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Scene {
  id: number;
  label: string;
  title: string;
  subtitle: string;
  accent: string;
  visual: 'live' | 'movies' | 'series' | 'multiscreen' | 'subscribe';
  bgImage: string; // Imagem única de fundo para o Hero Section
}

interface ContentItem {
  id: number;
  title: string;
  category: string;
  cover: string;
  badge?: string;
}

// ── Dados das Cenas (Com Cartazes Reais) ──────────────────────────────────────
const scenes: Scene[] = [
  { 
    id: 1, label: 'Live TV', title: 'Ao Vivo, Sempre', subtitle: 'Canais angolanos e internacionais em tempo real, onde estiveres.', accent: '#e63946', visual: 'live',
    // Fundo de Estúdio de Transmissão
    bgImage: 'https://firebasestorage.googleapis.com/v0/b/bazar-tv.firebasestorage.app/o/LandingPage%20images%2FIMG_3057.png?alt=media&token=1f7f4fcd-3e73-436c-8ee0-d57660ea436e'
  },
  { 
    id: 2, label: 'Filmes', title: 'Cinema em Casa', subtitle: 'Milhares de títulos disponíveis. Do clássico ao lançamento.', accent: '#00f0b5', visual: 'movies',
    // Cartaz TMDB: Black Panther (Wakanda)
    bgImage: 'https://image.tmdb.org/t/p/original/6ELJEzQJ3Y45HczvreC3v00UbYe.jpg'
  },
  { 
    id: 3, label: 'Séries', title: 'Episódio após Episódio', subtitle: 'Séries africanas, brasileiras e internacionais. Sem pausas.', accent: '#2980b9', visual: 'series',
    // Cartaz TMDB: Squid Game
    bgImage: 'https://image.tmdb.org/t/p/original/oaGvjB0CWKPUqzV4R1wHn49Q3IE.jpg'
  },
  { 
    id: 4, label: 'Multi-Ecrã', title: 'A Tua Casa, Todos os Ecrãs', subtitle: 'Até 4 dispositivos em simultâneo. TV, telemóvel, tablet.', accent: '#f39c12', visual: 'multiscreen',
    // Fundo de Telas e Dispositivos
    bgImage: 'https://images.unsplash.com/photo-1593305841991-0537e69709ea?auto=format&fit=crop&q=80&w=1920'
  },
  { 
    id: 5, label: 'Subscrição', title: 'Começa Hoje', subtitle: 'Planos flexíveis, sem compromisso. Cancela quando quiseres.', accent: '#8e44ad', visual: 'subscribe',
    // Fundo Premium de Cinema
    bgImage: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1920'
  },
];

// ── Conteúdo (TMDB Mocks) ─────────────────────────────────────────────────────
const FILMES: ContentItem[] = [
  { id: 1, title: 'Black Panther', category: 'Acção', badge: 'NOVO', cover: 'https://image.tmdb.org/t/p/w500/uxzzxijgPIY7slzFvMotPv8wjKA.jpg' },
  { id: 2, title: 'The Lion King', category: 'Animação', badge: 'HD', cover: 'https://image.tmdb.org/t/p/w500/2bXbqYdUdNVa8VIWXVfclP2ICtT.jpg' },
  { id: 3, title: 'Coming 2 America', category: 'Comédia', cover: 'https://image.tmdb.org/t/p/w500/3d6s7jDJMCKTRvZppdLZTl7lSoT.jpg' },
  { id: 4, title: 'Wakanda Forever', category: 'Acção', badge: 'POPULAR', cover: 'https://image.tmdb.org/t/p/w500/sv1xJUazXeYqALzczSZ3O6nkH75.jpg' },
  { id: 5, title: 'Nope', category: 'Thriller', cover: 'https://image.tmdb.org/t/p/w500/AcKVhCs8vjieczosnqEwHVwm5aK.jpg' },
];

const SERIES: ContentItem[] = [
  { id: 1, title: 'Lupin', category: 'Thriller', badge: 'SÉRIE', cover: 'https://image.tmdb.org/t/p/w500/sgxawbFB5Vi5OkPWQLNfl3dvkNJ.jpg' },
  { id: 2, title: 'Money Heist', category: 'Crime', badge: 'POPULAR', cover: 'https://image.tmdb.org/t/p/w500/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg' },
  { id: 3, title: 'Queen of Flow', category: 'Drama', cover: 'https://image.tmdb.org/t/p/w500/nVRyd0fh2oL9E8J4GBQ0Y8Ht8jZ.jpg' },
  { id: 4, title: 'Squid Game', category: 'Suspense', badge: 'NOVO', cover: 'https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg' },
  { id: 5, title: 'Bridgerton', category: 'Romance', cover: 'https://image.tmdb.org/t/p/w500/luoKpgVwi1E5nQsi7W0UuKHu2Rq.jpg' },
];

const LIVE_CANAIS: ContentItem[] = [
  { id: 1, title: 'TPA 1', category: 'Angola', badge: 'LIVE', cover: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/TPA1_logo.svg/800px-TPA1_logo.svg.png' },
  { id: 2, title: 'TV Zimbo', category: 'Angola', badge: 'LIVE', cover: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/TPA1_logo.svg/800px-TPA1_logo.svg.png' },
  { id: 3, title: 'CNN', category: 'Notícias', badge: 'LIVE', cover: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/TPA1_logo.svg/800px-TPA1_logo.svg.png' },
];

// ── Cartão de Conteúdo ────────────────────────────────────────────────────────
const ContentCard = ({ item, accentColor, onPlay }: { item: ContentItem; accentColor: string; onPlay: () => void }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onPlay}
      className="relative flex-shrink-0 cursor-pointer overflow-hidden rounded-xl bg-[#1a1a24] transition-all duration-300"
      style={{
        width: '140px', aspectRatio: '2/3',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        boxShadow: hovered ? `0 12px 32px ${accentColor}44` : '0 4px 16px rgba(0,0,0,0.4)',
        border: hovered ? `1px solid ${accentColor}66` : '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <img src={item.cover} alt={item.title} className="w-full h-full object-cover block" />
      <div className="absolute inset-0 transition-colors duration-300"
           style={{ background: hovered ? 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' : 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
      
      {item.badge && (
        <div className="absolute top-2 left-2 text-[9px] font-black tracking-widest px-2 py-0.5 rounded text-white" style={{ background: accentColor }}>
          {item.badge}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-3 transition-opacity duration-300" style={{ opacity: hovered ? 1 : 0.8 }}>
        <p className="text-white text-[11px] font-bold leading-tight m-0">{item.title}</p>
        <p className="text-white/50 text-[9px] uppercase tracking-widest mt-1 mb-0">{item.category}</p>
        {hovered && (
          <div className="mt-2 inline-flex items-center gap-1 rounded px-2 py-1" style={{ background: accentColor }}>
            <span className="text-white text-[10px] font-bold">▶ Play</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Linha de Conteúdo Horizontal ──────────────────────────────────────────────
const ContentRow = ({ title, items, accentColor, onPlayItem }: { title: string; items: ContentItem[]; accentColor: string; onPlayItem: () => void; }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => rowRef.current?.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-white text-lg font-extrabold m-0">{title}</h3>
        <div className="flex gap-2">
          <button onClick={() => scroll('left')} className="w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 transition">‹</button>
          <button onClick={() => scroll('right')} className="w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 transition">›</button>
        </div>
      </div>
      <div ref={rowRef} className="bazar-hide-scroll flex gap-3 overflow-x-auto pb-2 snap-x scroll-smooth">
        {items.map(item => <ContentCard key={item.id} item={item} accentColor={accentColor} onPlay={onPlayItem} />)}
      </div>
    </div>
  );
};

// ── Showcase Principal ────────────────────────────────────────────────────────
const Showcase: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false); // NOVO ESTADO: Pausa do Slide
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sceneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Ref para os 5 minutos

  const scene = scenes[current];

  // ── LÓGICA DE PAUSA (5 MINUTOS) ──
  const handleUserInteraction = useCallback(() => {
    setIsPaused(true);
    setProgress(100); // A barra fica cheia para mostrar que o ecrã está selecionado e "bloqueado"
    
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    
    // Inicia a contagem de 5 minutos (5 * 60 * 1000 ms = 300000 ms)
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 300000); 
  }, []);

  // ── LÓGICA DO AUTO-SLIDE ──
  useEffect(() => {
    // Se o utilizador clicou, paramos toda a lógica automática de slide
    if (isPaused) {
      if (progressTimer.current) clearInterval(progressTimer.current);
      if (sceneTimer.current) clearTimeout(sceneTimer.current);
      return;
    }

    setProgress(0);
    let val = 0;
    
    // Barra a encher em 5 segundos
    progressTimer.current = setInterval(() => { 
      val = Math.min(val + 0.5, 100); 
      setProgress(val); 
    }, 25);
    
    // Troca de ecrã a cada 5 segundos
    sceneTimer.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => { 
        setCurrent(prev => (prev + 1) % scenes.length); 
        setVisible(true); 
      }, 500);
    }, 5000);

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
      if (sceneTimer.current) clearTimeout(sceneTimer.current);
    };
  }, [current, isPaused]); // Depende do isPaused para voltar a rodar quando acabar os 5 min

  const goTo = (idx: number) => {
    handleUserInteraction(); // Pausa o sistema por 5 minutos
    if (idx === current) return;
    
    setMenuOpen(false);
    setVisible(false);
    setTimeout(() => { setCurrent(idx); setVisible(true); }, 500);
  };

  const getContentForScene = () => {
    switch (scene.visual) {
      case 'live': return { title: '📺 Canais em Directo', items: LIVE_CANAIS };
      case 'movies': return { title: '🎬 Filmes em Destaque', items: FILMES };
      case 'series': return { title: '📺 Séries em Destaque', items: SERIES };
      case 'multiscreen': return { title: '🎬 Os Mais Assistidos', items: [...FILMES.slice(0,3), ...SERIES.slice(0,3)] };
      case 'subscribe': return null;
      default: return { title: '🎬 Em Destaque', items: FILMES };
    }
  };
  const contentSection = getContentForScene();

  return (
    <div className="relative w-full min-h-screen flex flex-col bg-[#08080f] font-sans overflow-x-hidden select-none">
      
      {/* ── CSS UTILITÁRIO ── */}
      <style>{`
        .bazar-hide-scroll::-webkit-scrollbar { display: none !important; }
        .bazar-hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ── NAVEGAÇÃO STICKY ── */}
      <div className="sticky top-0 z-50 w-full bg-[#08080f]/90 backdrop-blur-md border-b border-white/5 transition-all duration-500">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/5">
          {/* Barra de Progresso */}
          <div className="h-full transition-all duration-100 ease-linear" 
               style={{ 
                 width: `${progress}%`, 
                 background: scene.accent, 
                 boxShadow: `0 0 10px ${scene.accent}` 
               }} 
          />
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <span className="text-white font-black text-xl md:text-2xl italic tracking-tighter transition-colors duration-500 flex-shrink-0">
            BAZAR<span style={{ color: scene.accent }}>TV</span>
          </span>

          <nav className="hidden md:flex gap-2 items-center">
            {scenes.map((sc, i) => (
              <button key={sc.id} onClick={() => goTo(i)} 
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${i === current ? 'text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`}
                style={{ background: i === current ? scene.accent : 'transparent', boxShadow: i === current ? `0 4px 12px ${scene.accent}55` : 'none' }}>
                {sc.label}
              </button>
            ))}
          </nav>

          <div className="flex gap-3 items-center">
            <button onClick={() => setIsLoginOpen(true)} className="hidden md:block px-4 py-2 rounded-lg border border-white/15 text-white/70 text-sm font-semibold hover:bg-white/10 transition">Entrar</button>
            <button onClick={() => setIsPlansOpen(true)} className="px-4 py-2 rounded-lg text-white text-sm font-bold transition-all duration-300 hover:scale-105"
                    style={{ background: scene.accent, boxShadow: `0 4px 16px ${scene.accent}44` }}>Assinar</button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white text-2xl p-1">☰</button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden flex flex-wrap gap-2 px-6 pb-4 border-t border-white/5 pt-3">
            {scenes.map((sc, i) => (
              <button key={sc.id} onClick={() => goTo(i)} className="px-4 py-2 rounded-full text-sm font-bold text-white transition-colors duration-300"
                      style={{ background: i === current ? scene.accent : 'rgba(255,255,255,0.08)' }}>{sc.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── HERO IMERSIVO COM IMAGEM ÚNICA (HERO) ── */}
      <main 
        className="relative w-full h-[85vh] min-h-[600px] flex items-center justify-center px-4 overflow-hidden"
        onClick={handleUserInteraction} // O clique no ecrã principal também pausa a bomba relógio
      >
        
        {/* Imagem de Fundo (Hero Poster) Dinâmica */}
        <div className={`absolute inset-0 transition-all duration-1000 ease-in-out ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
          <img 
            src={scene.bgImage} 
            alt={scene.title} 
            className="w-full h-full object-cover"
          />
          {/* Overlay Escuro / Gradiente para garantir que o Néon se destaca sempre */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08080f] via-transparent to-transparent opacity-90" />
        </div>

        {/* Caixa Central de Néon */}
        <div className="relative z-10 flex flex-col items-center text-center p-8 md:p-14 max-w-[90%] md:max-w-3xl backdrop-blur-md transition-all duration-700 ease-out cursor-default"
             style={{
               borderRadius: '4rem',
               border: `2px solid ${scene.accent}`,
               boxShadow: `0 0 60px ${scene.accent}33, inset 0 0 30px ${scene.accent}20`,
               background: `linear-gradient(135deg, rgba(8,8,15,0.7) 0%, rgba(8,8,15,0.3) 100%)`,
               opacity: visible ? 1 : 0,
               transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)'
             }}>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{ background: `${scene.accent}22`, border: `1px solid ${scene.accent}44` }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: scene.accent, boxShadow: `0 0 8px ${scene.accent}` }} />
            <span className="text-[10px] md:text-xs font-black tracking-widest uppercase" style={{ color: scene.accent }}>{scene.label}</span>
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-4 text-white drop-shadow-2xl">
            {scene.title}
          </h1>
          
          <p className="text-sm md:text-lg text-white/80 max-w-lg mx-auto mb-8 leading-relaxed font-medium text-shadow-sm">
            {scene.subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={(e) => { e.stopPropagation(); setIsPlansOpen(true); }} className="px-8 py-3 md:px-10 md:py-4 rounded-full text-white font-black text-sm md:text-base uppercase tracking-widest transition-all duration-300 hover:scale-105"
                    style={{ backgroundColor: scene.accent, boxShadow: `0 8px 25px ${scene.accent}66` }}>
              Começar Agora
            </button>
          </div>
        </div>
      </main>

      {/* ── SECÇÃO DE CONTEÚDO (CATÁLOGO / PLANOS) ── */}
      <div className="relative z-20 bg-[#0d0d14] px-6 py-12">
        <div className="w-full h-1 rounded-full mb-10 transition-colors duration-500" style={{ background: `linear-gradient(90deg, ${scene.accent}, transparent)` }} />

        {contentSection ? (
          <>
            <ContentRow title={contentSection.title} items={contentSection.items} accentColor={scene.accent} onPlayItem={() => setIsLoginOpen(true)} />
            {scene.visual === 'movies' && <ContentRow title="📺 Séries que também vais adorar" items={SERIES} accentColor={scene.accent} onPlayItem={() => setIsLoginOpen(true)} />}
            {scene.visual === 'series' && <ContentRow title="🎬 Filmes em Destaque" items={FILMES} accentColor={scene.accent} onPlayItem={() => setIsLoginOpen(true)} />}
          </>
        ) : (
          <div className="text-center py-10">
            <h2 className="text-white text-3xl md:text-5xl font-black mb-4">Escolhe o teu plano</h2>
            <p className="text-white/50 text-lg mb-12">Sem fidelização. Cancela quando quiseres.</p>
            <div className="flex flex-wrap justify-center gap-6">
              {[
                { nome: 'Mobile', preco: '1.000', desc: 'Apenas telemóvel', destaque: false },
                { nome: 'Standard', preco: '2.999', desc: '1 ecrã Full HD', destaque: true },
                { nome: 'Família', preco: '4.999', desc: '4 ecrãs + 4K HDR', destaque: false },
              ].map(plano => (
                <div key={plano.nome} onClick={() => setIsPlansOpen(true)} className="relative group cursor-pointer w-full md:w-56 p-8 rounded-2xl transition-all duration-300 hover:-translate-y-2"
                     style={{
                       background: plano.destaque ? `${scene.accent}11` : 'rgba(255,255,255,0.03)',
                       border: plano.destaque ? `2px solid ${scene.accent}` : '1px solid rgba(255,255,255,0.1)',
                       boxShadow: plano.destaque ? `0 12px 40px ${scene.accent}33` : 'none'
                     }}>
                  {plano.destaque && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest text-white px-3 py-1 rounded-full" style={{ background: scene.accent }}>MAIS POPULAR</span>}
                  <h3 className="text-white text-lg font-bold mb-2">{plano.nome}</h3>
                  <div className="text-3xl font-black mb-2" style={{ color: plano.destaque ? scene.accent : 'white' }}>{plano.preco} <span className="text-sm font-normal text-white/40">Kz/mês</span></div>
                  <p className="text-white/50 text-sm m-0">{plano.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onSwitchToRegister={() => setIsLoginOpen(false)} />
      <PlansModal isOpen={isPlansOpen} onClose={() => setIsPlansOpen(false)} onSelectPlan={() => setIsPlansOpen(false)} />
    </div>
  );
};

export default Showcase;