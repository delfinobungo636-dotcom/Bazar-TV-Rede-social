import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { db } from '../../shared/services/firebase';
import { collection, query, onSnapshot, limit, FirestoreError } from 'firebase/firestore';
import { ContentModal } from '../components/ContentModal.tsx';
import { Play, Clapperboard, Eye, Star, RefreshCw, AlertCircle, Clock } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface MediaItem {
  id: string;
  category?: string;
  type?: string;
  title?: string;
  thumbnailUrl?: string;
  year?: string | number;
  isLive?: boolean;
  isNew?: boolean;
  views?: number;
  rating?: number;       // 0–10
  duration?: string;     // ex: '1h 48m'
  genre?: string;
  progress?: number;     // 0–100, para "continuar a assistir"
  description?: string;
}

interface MediaCatalogProps {
  filterBy: 'type' | 'category';
  targetValue: string;
  title: string;
  accentColor?: string;
  emptyMessage?: string;
  showViewCount?: boolean;  // controlo admin: mostrar views ou não
}

// ── Skeleton de carregamento ──────────────────────────────────────────────────
const SkeletonCard = ({ accentColor }: { accentColor: string }) => (
  <div
    className="flex-none w-[47%] sm:w-[31%] md:w-[23%] lg:w-[calc(20%-16px)]"
    style={{ aspectRatio: '16/9' }}
  >
    <div
      className="w-full h-full rounded-xl overflow-hidden relative"
      style={{ background: '#1a1a28' }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accentColor}08 50%, transparent 100%)`,
          animation: 'shimmer 1.6s ease-in-out infinite',
        }}
      />
    </div>
  </div>
);

// ── Card individual ───────────────────────────────────────────────────────────
const MediaCard = memo(({
  item,
  accentColor,
  showViewCount,
  onClick,
}: {
  item: MediaItem;
  accentColor: string;
  showViewCount: boolean;
  onClick: (item: MediaItem) => void;
}) => {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered]   = useState(false);

  const matchPct   = item.rating ? Math.round((item.rating / 10) * 100) : 98;
  const matchColor = matchPct >= 80 ? '#4ade80' : matchPct >= 60 ? '#facc15' : '#f87171';

  const formattedViews = useMemo(() => {
    const v = item.views ?? 0;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k`;
    return String(v);
  }, [item.views]);

  return (
    <div
      className="flex-none w-[47%] sm:w-[31%] md:w-[23%] lg:w-[calc(20%-16px)] group relative cursor-pointer select-none"
      onClick={() => onClick(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transform: hovered ? 'scale(1.05) translateY(-4px)' : 'scale(1) translateY(0)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: hovered ? 20 : 1,
        willChange: 'transform',
      }}
    >
      <div
        className="aspect-video rounded-xl overflow-hidden relative"
        style={{
          background: '#12121e',
          border: hovered ? `1.5px solid ${accentColor}` : '1.5px solid rgba(255,255,255,0.05)',
          boxShadow: hovered
            ? `0 16px 40px rgba(0,0,0,0.7), 0 0 0 1px ${accentColor}33`
            : '0 4px 16px rgba(0,0,0,0.4)',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {item.thumbnailUrl && !imgError ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
            style={{
              filter: hovered ? 'brightness(0.3)' : 'brightness(0.92)',
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
              transition: 'filter 0.4s ease, transform 0.5s ease',
            }}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, #1a1a28, ${accentColor}18)` }}
          >
            <Play size={24} style={{ color: accentColor, opacity: 0.5 }} />
            <span
              className="text-[9px] font-semibold text-center px-3 leading-snug"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              {item.title}
            </span>
          </div>
        )}

        {item.isLive && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest z-20"
            style={{ background: accentColor }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            DIRECTO
          </div>
        )}
        {item.isNew && !item.isLive && (
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest z-20"
            style={{ background: '#22c55e' }}
          >
            NOVO
          </div>
        )}

        <div
          className="absolute inset-0 flex flex-col justify-between p-3 md:p-4"
          style={{
            background: hovered
              ? 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.1) 100%)'
              : 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
            transition: 'background 0.3s ease',
          }}
        >
          <div className="flex-1 flex items-center justify-center">
            <div
              className="rounded-full p-2.5"
              style={{
                background: accentColor,
                boxShadow: `0 0 24px ${accentColor}99`,
                opacity: hovered ? 1 : 0,
                transform: hovered ? 'scale(1)' : 'scale(0.4)',
                transition: 'opacity 0.25s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
            >
              <Play fill="white" size={16} className="text-white ml-0.5" />
            </div>
          </div>

          <div
            style={{
              opacity: hovered ? 1 : 0.85,
              transform: hovered ? 'translateY(0)' : 'translateY(5px)',
              transition: 'opacity 0.25s ease, transform 0.3s ease',
            }}
          >
            <h3
              className="text-white text-[10px] md:text-xs font-black truncate uppercase tracking-tighter mb-1.5"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
            >
              {item.title}
            </h3>

            <div
              className="flex items-center gap-1.5 flex-wrap"
              style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.2s ease' }}
            >
              <span className="text-[8px] font-bold" style={{ color: matchColor }}>
                {matchPct}% match
              </span>
              <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {item.year || new Date().getFullYear()}
              </span>
              {item.duration && (
                <div className="flex items-center gap-0.5">
                  <Clock size={8} style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {item.duration}
                  </span>
                </div>
              )}
              {item.rating && (
                <div className="flex items-center gap-0.5">
                  <Star size={8} fill="#facc15" className="text-yellow-400" />
                  <span className="text-[8px]" style={{ color: '#facc15' }}>
                    {item.rating.toFixed(1)}
                  </span>
                </div>
              )}
              {showViewCount && (
                <div
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Eye size={8} style={{ color: accentColor }} />
                  <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {formattedViews}
                  </span>
                </div>
              )}
              <span
                className="text-[7px] px-1 py-0.5 rounded font-bold uppercase"
                style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }}
              >
                HD
              </span>
            </div>
          </div>
        </div>

        {item.progress != null && item.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full"
              style={{
                width: `${Math.min(item.progress, 100)}%`,
                background: accentColor,
                boxShadow: `0 0 6px ${accentColor}`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}
      </div>

      {item.genre && (
        <p
          className="mt-1 text-[9px] uppercase tracking-widest pl-0.5 transition-opacity duration-200"
          style={{ color: accentColor, opacity: hovered ? 0.8 : 0 }}
        >
          {item.genre}
        </p>
      )}
    </div>
  );
});

MediaCard.displayName = 'MediaCard';

const MediaCatalog = ({
  filterBy,
  targetValue,
  title,
  accentColor = '#e63946',
  emptyMessage = 'Nenhum título encontrado',
  showViewCount = false,
}: MediaCatalogProps) => {
  const [rawItems, setRawItems]         = useState<MediaItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<MediaItem | null>(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [sortBy, setSortBy]             = useState<'default' | 'views' | 'year' | 'rating'>('default');
  const [searchQuery, setSearchQuery]   = useState('');

  // ── OTIMIZAÇÃO DE MEMÓRIA: Adicionado limit(100) para proteger a RAM ──
  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = query(collection(db, 'movies'), limit(100));
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MediaItem[];
        setRawItems(docs);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.error('[MediaCatalog] Firestore error:', err.message);
        setError('Não foi possível carregar o catálogo. Verifica a tua ligação.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredItems = useMemo(() => {
    let list = rawItems.filter(item => {
      const val    = filterBy === 'type' ? item.type : item.category;
      const match  = (val || '').toLowerCase() === targetValue.toLowerCase();
      if (!match) return false;
      if (searchQuery.trim()) {
        return (item.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });

    if (sortBy === 'views')  list = [...list].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    if (sortBy === 'year')   list = [...list].sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0));
    if (sortBy === 'rating') list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    return list;
  }, [rawItems, filterBy, targetValue, searchQuery, sortBy]);

  const handleOpenModal  = useCallback((item: MediaItem) => {
    setSelectedContent(item);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedContent(null), 300);
  }, []);

  return (
    <div
      className="p-4 md:p-12 min-h-screen relative"
      style={{ background: '#08080f', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%);  }
        }
        body, html { 
          overflow-x: hidden !important; 
        }
      `}</style>

      <div className="flex flex-col gap-4 mb-8 md:mb-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2
            className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter italic pl-4"
            style={{ borderLeft: `6px solid ${accentColor}` }}
          >
            {title}
          </h2>

          {!loading && (
            <span
              className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full"
              style={{
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}33`,
                color: accentColor,
              }}
            >
              {filteredItems.length} Título{filteredItems.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {!loading && !error && rawItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="Pesquisar título..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[180px] max-w-xs text-sm px-4 py-2 rounded-lg outline-none transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${searchQuery ? accentColor : 'rgba(255,255,255,0.1)'}`,
                color: 'white',
                boxShadow: searchQuery ? `0 0 12px ${accentColor}33` : 'none',
              }}
            />

            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'default', label: 'Padrão'    },
                { key: 'views',   label: 'Mais Visto' },
                { key: 'year',    label: 'Mais Novo'  },
                { key: 'rating',  label: 'Avaliação'  },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all duration-200"
                  style={{
                    background: sortBy === opt.key ? accentColor : 'rgba(255,255,255,0.06)',
                    color: sortBy === opt.key ? 'white' : 'rgba(255,255,255,0.45)',
                    border: sortBy === opt.key ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: sortBy === opt.key ? `0 4px 12px ${accentColor}44` : 'none',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="mb-6 rounded-full"
        style={{ height: 2, background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />

      {loading && (
        <div className="flex flex-wrap gap-4 md:gap-x-5 md:gap-y-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} accentColor={accentColor} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <AlertCircle size={48} style={{ color: accentColor, opacity: 0.6 }} />
          <p className="text-sm font-semibold text-center max-w-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {error}
          </p>
          <button
            onClick={() => { setError(null); setLoading(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
            style={{
              background: accentColor,
              color: 'white',
              boxShadow: `0 4px 16px ${accentColor}44`,
            }}
          >
            <RefreshCw size={15} />
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-40 gap-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
          <Clapperboard size={56} />
          <p className="text-base font-bold uppercase tracking-widest italic">
            {searchQuery ? `Sem resultados para "${searchQuery}"` : emptyMessage}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold transition-colors duration-150"
              style={{ color: accentColor }}
            >
              Limpar pesquisa
            </button>
          )}
        </div>
      )}

      {!loading && !error && filteredItems.length > 0 && (
        <div className="flex flex-wrap gap-4 md:gap-x-5 md:gap-y-8 justify-start">
          {filteredItems.map(item => (
            <MediaCard
              key={item.id}
              item={item}
              accentColor={accentColor}
              showViewCount={showViewCount}
              onClick={handleOpenModal}
            />
          ))}
        </div>
      )}

      {isModalOpen && selectedContent && (
        <ContentModal
          content={selectedContent}
          onClose={handleCloseModal}
          onPlay={() => {}}
        />
      )}
    </div>
  );
};

export default memo(MediaCatalog);