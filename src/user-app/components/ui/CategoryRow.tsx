import React, { useRef, useState, useCallback, useId, useEffect } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import MovieCard from './MovieCard';

interface CategoryRowProps {
  title: string;
  items: any[];
  accentColor?: string;
  icon?: string;
  onMovieClick: (movie: any) => void;
}

const CategoryRow = ({ title, items, accentColor = '#e63946', icon, onMovieClick }: CategoryRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const rowId = useId();

  // Foco Spatial para a TV agrupar a linha
  const { ref: focusRef } = useFocusable({
    focusKey: `row-${title}`,
    isScrollable: true
  });

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    
    setProgress(maxScroll > 0 ? scrollLeft / maxScroll : 0);
    setAtStart(scrollLeft <= 10);
    setAtEnd(scrollLeft >= maxScroll - 10);
  }, []);

  const scrollBy = useCallback((dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    
    container.scrollBy({
      left: dir === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [items, handleScroll]);

  if (!items || items.length === 0) return null;

  const dotCount = 3;
  const activeDot = Math.min(Math.floor(progress * dotCount), dotCount - 1);

  return (
    <div ref={focusRef as any} className="mb-8 md:mb-12 group/row relative w-full flex flex-col select-none">
      
      <div className="flex items-end justify-between px-4 md:px-12 mb-4">
        <div className="flex items-center gap-3">
          {icon && <span className="text-lg leading-none">{icon}</span>}
          <h2 
            className="text-white text-xs md:text-sm font-black uppercase tracking-widest pl-3 transition-all duration-300 opacity-75 group-hover/row:opacity-100"
            style={{ borderLeft: `3px solid ${accentColor}` }}
          >
            {title}
          </h2>

          <div className="flex items-center gap-1.5 ml-2 opacity-80 group-hover/row:opacity-100 transition-opacity duration-300">
            {[0, 1, 2].map((i) => (
              <div
                key={`${rowId}-dot-${i}`}
                className="rounded-full transition-all duration-300"
                style={{
                  height: '6px',
                  width: activeDot === i ? '18px' : '6px',
                  backgroundColor: activeDot === i ? accentColor : '#12121e', 
                  border: activeDot === i ? 'none' : '1px solid rgba(255,255,255,0.15)',
                  boxShadow: activeDot === i ? `0 0 8px ${accentColor}88` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity duration-300">
          {(['left', 'right'] as const).map(dir => (
            <button
              key={dir}
              onClick={() => scrollBy(dir)}
              disabled={dir === 'left' ? atStart : atEnd}
              className="w-8 h-8 flex items-center justify-center rounded-full text-white bg-zinc-900/80 border border-zinc-800/60 hover:bg-white hover:text-black disabled:opacity-0 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
              aria-label={dir === 'left' ? 'Anterior' : 'Próximo'}
            >
              {dir === 'left' ? '‹' : '›'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-visible">
        <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 pointer-events-none z-20 transition-opacity duration-300" style={{ background: 'linear-gradient(to right, #08080f 20%, transparent)', opacity: atStart ? 0 : 1 }} />
        <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 pointer-events-none z-20 transition-opacity duration-300" style={{ background: 'linear-gradient(to left, #08080f 20%, transparent)', opacity: atEnd ? 0 : 1 }} />

        {/* Adicionámos pt-4 e -mt-4 para a borda vermelha ter espaço para brilhar no topo sem desalinhar o layout */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="no-scrollbar flex overflow-x-auto gap-1.5 md:gap-2 px-4 md:px-8 pt-4 pb-6 -mt-4 snap-x snap-mandatory scroll-smooth"
        >
          {items.map(item => (
            <div 
              key={item.id} 
              /* 2. lg:w-[22.5%] - Isto é o segredo! Obriga a capa a ser maior, mostrando 4 filmes inteiros e metade do 5º (estilo Netflix/Premium) */
              className="flex-none snap-start transition-transform duration-300 will-change-transform w-[47%] sm:w-[32%] md:w-[24%] lg:w-[22.5%]"
            >
              <MovieCard movie={item} accentColor={accentColor} onClick={onMovieClick} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryRow;