import React, { memo, useState } from 'react';
import { Play, Eye, Download, Star } from 'lucide-react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';

interface Movie {
  id: string;
  title: string;
  thumbnailUrl?: string;
  url?: string;
  isLive?: boolean;
  year?: string | number;
  views?: number;
  rating?: number | string; 
  duration?: string;
  genre?: string;
  isNew?: boolean;
  progress?: number;
}

interface MovieCardProps {
  movie: Movie;
  accentColor?: string;
  onClick?: (movie: Movie) => void;
  onDownload?: (movie: Movie) => void;
}

const MovieCard = memo(({ movie, accentColor = '#e63946', onClick, onDownload }: MovieCardProps) => {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { ref, focused } = useFocusable({
    focusKey: movie.id,
    onEnterPress: () => onClick?.(movie) 
  });

  if (!movie) return null;

  const imgSrc = movie.thumbnailUrl || movie.url;
  const matchPct = movie.rating ? Math.round((Number(movie.rating) / 10) * 100) : 98;
  const matchColor = matchPct >= 80 ? '#4ade80' : matchPct >= 60 ? '#facc15' : '#f87171';

  const isVisualActive = hovered || focused;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    onDownload?.(movie);
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <div
      ref={ref as any} 
      onClick={() => onClick?.(movie)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative group cursor-pointer w-full select-none ${focused ? 'z-50' : 'z-1'}`}
      style={{
        transform: isVisualActive ? 'scale(1.05) translateY(-4px)' : 'scale(1) translateY(0)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform',
      }}
    >
      <div
        className="relative aspect-video w-full overflow-hidden rounded-xl transform-gpu"
        style={{
          background: '#12121e',
          border: isVisualActive ? `2px solid ${accentColor}` : '1.5px solid rgba(255,255,255,0.05)',
          boxShadow: isVisualActive
            ? `0 16px 40px rgba(0,0,0,0.7), 0 0 0 1px ${accentColor}33`
            : '0 4px 16px rgba(0,0,0,0.35)',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt={movie.title}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transform-gpu"
            style={{
              filter: isVisualActive ? 'brightness(0.35)' : 'brightness(0.9)',
              transform: isVisualActive ? 'scale(1.06)' : 'scale(1)',
              transition: 'filter 0.4s ease, transform 0.5s ease',
              imageRendering: 'crisp-edges',
            }}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-1.5"
            style={{ background: `linear-gradient(135deg, #1a1a28, ${accentColor}18)` }}
          >
            <Play size={22} style={{ color: accentColor, opacity: 0.5 }} />
            <span className="text-[9px] font-semibold text-center px-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {movie.title}
            </span>
          </div>
        )}

        {movie.isLive && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest z-20" style={{ background: accentColor }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> DIRECTO
          </div>
        )}

        {movie.isNew && !movie.isLive && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest z-20" style={{ background: '#22c55e' }}>
            NOVO
          </div>
        )}

        <button
          onClick={handleDownload}
          className="absolute top-2 right-2 z-30 rounded-full p-1.5 transition-all duration-200"
          style={{
            background: 'rgba(20, 20, 20, 0.85)', 
            border: '1px solid rgba(255,255,255,0.12)',
            opacity: isVisualActive ? 1 : 0,
            transform: isVisualActive ? 'scale(1)' : 'scale(0.7)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            color: downloading ? accentColor : 'rgba(255,255,255,0.7)',
          }}
        >
          <Download size={13} />
        </button>

        <div
          className="absolute inset-0 flex flex-col justify-between p-3"
          style={{
            background: isVisualActive
              ? 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.15) 100%)'
              : 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)',
            transition: 'background 0.3s ease',
          }}
        >
          <div className="flex-1 flex items-center justify-center">
            <div
              className="rounded-full p-2.5"
              style={{
                background: accentColor,
                boxShadow: `0 0 24px ${accentColor}99`,
                opacity: isVisualActive ? 1 : 0,
                transform: isVisualActive ? 'scale(1)' : 'scale(0.5)',
                transition: 'opacity 0.25s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
            >
              <Play fill="white" size={16} className="text-white ml-0.5" />
            </div>
          </div>

          <div style={{ opacity: isVisualActive ? 1 : 0.8, transform: isVisualActive ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 0.25s ease, transform 0.3s ease' }}>
            <p className="text-white font-black text-[10px] md:text-[12px] truncate uppercase tracking-tight leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              {movie.title}
            </p>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap" style={{ opacity: isVisualActive ? 1 : 0, transition: 'opacity 0.2s ease 0.05s' }}>
              <span className="text-[8px] font-bold" style={{ color: matchColor }}>{matchPct}% match</span>
              <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{movie.year || new Date().getFullYear()}</span>
              {movie.duration && <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{movie.duration}</span>}
              {movie.rating && (
                <div className="flex items-center gap-0.5">
                  <Star size={8} fill="#facc15" className="text-yellow-400" />
                  <span className="text-[8px]" style={{ color: '#facc15' }}>{Number(movie.rating).toFixed(1)}</span>
                </div>
              )}
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(30, 30, 30, 0.85)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Eye size={8} style={{ color: accentColor }} />
                <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {movie.views != null ? (movie.views >= 1000 ? `${(movie.views / 1000).toFixed(1)}k` : movie.views) : 0}
                </span>
              </div>
              <span className="text-[7px] px-1 py-0.5 rounded font-bold uppercase" style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }}>HD</span>
            </div>
          </div>
        </div>

        {movie.progress != null && movie.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div className="h-full" style={{ width: `${Math.min(movie.progress, 100)}%`, background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
          </div>
        )}
      </div>

      {movie.genre && (
        <p className="mt-1.5 text-[9px] uppercase tracking-widest pl-0.5 transition-opacity duration-200" style={{ color: accentColor, opacity: isVisualActive ? 0.8 : 0 }}>
          {movie.genre}
        </p>
      )}
    </div>
  );
});

MovieCard.displayName = 'MovieCard';
export default MovieCard;