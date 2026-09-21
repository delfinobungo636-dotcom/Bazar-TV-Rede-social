import React from 'react';
import { Play, Trophy, Tv } from 'lucide-react';

const Desporto = () => {
  const lives = [1, 2];
  const destaques = Array.from({ length: 6 }).map((_, i) => i);

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-20">
      <div className="relative h-[55vh] min-h-[400px] w-full flex items-end px-6 md:px-12 lg:px-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/40 to-gray-900 z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-transparent z-10"></div>
        
        <div className="relative z-20 max-w-2xl animate-fadeInLeft">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-0.5 bg-red-600 text-xs font-bold uppercase tracking-widest rounded-full shadow-md animate-pulse">
              Em Direto
            </span>
            <span className="text-gray-400 text-sm font-medium">Grande Derby Nacional</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter drop-shadow-2xl">
            O Desporto Rei <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
              Na Tua Telha
            </span>
          </h1>
          <p className="text-gray-300 mt-4 text-base md:text-lg leading-relaxed">
            Acompanha as maiores emoções do futebol nacional, basquetebol, análises táticas e momentos históricos com qualidade máxima e sem paragens.
          </p>
        </div>
      </div>

      <div className="px-6 md:px-12 lg:px-24 mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Tv size={22} className="text-red-500" />
          <h2 className="text-2xl font-bold tracking-tight">Canais ao Vivo</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lives.map((canal) => (
            <div key={canal} className="group relative aspect-video bg-gray-900 rounded-xl overflow-hidden cursor-pointer border border-gray-800 shadow-lg transition-all duration-300 hover:border-red-600/50 transform-gpu will-change-transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gray-800 group-hover:scale-102 transition-transform duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
              
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></div>
                <span className="text-xs font-bold uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">Bazar Desporto {canal}</span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg group-hover:text-red-500 transition-colors">Emissão Especial e Entrevistas</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Análise detalhada do campeonato</p>
                </div>
                <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform shadow-lg">
                  <Play size={18} fill="currentColor" className="ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-12 lg:px-24">
        <div className="flex items-center gap-2 mb-6">
          <Trophy size={22} className="text-orange-500" />
          <h2 className="text-2xl font-bold tracking-tight">Competições e Resumos</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {destaques.map((item) => (
            <div key={item} className="group relative aspect-[3/4] bg-gray-900 rounded-xl overflow-hidden cursor-pointer transition-transform duration-300 hover:-translate-y-1.5 shadow-md transform-gpu will-change-transform">
              <div className="absolute inset-0 bg-gray-800 group-hover:scale-105 transition-transform duration-500"></div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                  <Play size={20} fill="currentColor" className="ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/70 to-transparent z-10 text-left">
                <span className="text-[10px] uppercase tracking-widest font-bold text-orange-500">Arquivo</span>
                <h4 className="font-bold text-sm truncate mt-0.5">Melhores Momentos</h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Desporto;