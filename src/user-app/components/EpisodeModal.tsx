import React, { useState, useMemo } from 'react';
import { Play, Clock } from 'lucide-react';

// ── Tipos adaptados exatamente ao teu Firebase ─────────────────────────────
interface Episodio {
  id: string;
  title: string;
  thumbnailUrl?: string;
  season?: number | string;  // Lendo o campo 'season' do Firebase
  number?: number | string;  // Lendo o campo 'number' do Firebase
  duration?: string;
  description?: string;
}

interface SerieModalProps {
  episodios: Episodio[]; 
  accentColor?: string;
  onPlay: (ep: Episodio) => void;
}

const EpisodiosSection = ({ episodios, accentColor = '#e63946', onPlay }: SerieModalProps) => {

  // 1. 🧠 Descobrir as temporadas lendo o campo 'season'
  const temporadasDisponiveis = useMemo(() => {
    const temps = episodios.map(ep => Number(ep.season) || 1);
    const unicas = Array.from(new Set(temps));
    return unicas.sort((a, b) => a - b);
  }, [episodios]);

  // 2. 🎯 Controlar a temporada ativa
  const [temporadaAtiva, setTemporadaAtiva] = useState<number>(
    temporadasDisponiveis.length > 0 ? temporadasDisponiveis[0] : 1
  );

  // 3. ✂️ Filtrar pela 'season' e ordenar pelo 'number'
  const episodiosParaMostrar = useMemo(() => {
    return episodios
      .filter(ep => (Number(ep.season) || 1) === temporadaAtiva)
      .sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
  }, [episodios, temporadaAtiva]);

  if (!episodios || episodios.length === 0) return null;

  return (
    <div className="w-full mt-8">
      
      {/* ── ABAS DE TEMPORADAS ── */}
      <div className="flex overflow-x-auto gap-4 border-b border-white/10 mb-6 pb-2 no-scrollbar">
        {temporadasDisponiveis.map(temp => {
          const isActive = temp === temporadaAtiva;
          return (
            <button
              key={`temp-${temp}`}
              onClick={() => setTemporadaAtiva(temp)}
              className={`flex-none px-4 py-2 text-sm md:text-base font-black uppercase tracking-widest transition-all duration-300 border-b-2 ${
                isActive 
                  ? 'text-white' 
                  : 'text-gray-500 hover:text-gray-300 border-transparent'
              }`}
              style={{ 
                borderColor: isActive ? accentColor : 'transparent',
                textShadow: isActive ? `0 0 12px ${accentColor}88` : 'none'
              }}
            >
              Temporada {temp}
            </button>
          );
        })}
      </div>

      {/* ── LISTA DE EPISÓDIOS DA TEMPORADA ATIVA ── */}
      <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
        {episodiosParaMostrar.map((ep, index) => (
          <div 
            key={ep.id}
            onClick={() => onPlay(ep)}
            className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer group"
          >
            {/* Número da ordem na lista */}
            <span className="text-xl font-black text-gray-500 group-hover:text-white w-8 text-center transition-colors">
              {index + 1}
            </span>

            {/* Thumbnail */}
            <div className="relative w-32 md:w-40 aspect-video rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0">
              {ep.thumbnailUrl ? (
                <img 
                  src={ep.thumbnailUrl} 
                  alt={ep.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                   <Play size={20} className="text-gray-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                <Play fill="white" size={24} className="text-white" />
              </div>
            </div>

            {/* Info do Episódio */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-sm md:text-base font-bold text-white truncate pr-4">
                  {/* Usa o campo 'number' para colocar o número antes do título */}
                  {ep.number ? `${ep.number}. ` : ''}{ep.title}
                </h4>
                {ep.duration && (
                  <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
                    <Clock size={12} /> {ep.duration}
                  </span>
                )}
              </div>
              {ep.description && (
                <p className="text-xs text-gray-400 line-clamp-2 md:line-clamp-3">
                  {ep.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default EpisodiosSection;