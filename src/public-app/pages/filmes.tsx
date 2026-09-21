import React from 'react';
import { Play, Star, Clapperboard } from 'lucide-react';

const Filmes = () => {
  const categorias = [
    { id: 1, nome: "Cinema Angolano Premium", cor: "border-red-600" },
    { id: 2, nome: "Grandes Sucessos Internacionais", cor: "border-orange-500" },
    { id: 3, nome: "Comédia e Drama", cor: "border-yellow-500" }
  ];
  const itens = Array.from({ length: 6 }).map((_, i) => i);

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-20">
      <div className="relative h-[65vh] min-h-[450px] w-full flex items-end px-6 md:px-12 lg:px-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 to-transparent z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent z-10"></div>
        
        <div className="relative z-20 max-w-xl animate-fadeIn">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-1 rounded-md">
              <Star size={12} fill="currentColor" /> Exclusivo Bazar TV
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none drop-shadow-2xl">
            Histórias Que <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
              Inspiram Gerações
            </span>
          </h1>
          <p className="text-gray-300 mt-4 text-base md:text-lg leading-relaxed drop-shadow-md">
            Explora uma coleção única de longas-metragens, clássicos eternos e produções independentes que dão voz à nossa cultura e ao melhor do cinema mundial.
          </p>
        </div>
      </div>

      <div className="px-6 md:px-12 lg:px-24 space-y-12">
        {categorias.map((cat) => (
          <div key={cat.id} className="animate-fadeIn">
            <div className="flex items-center gap-2 mb-6">
              <Clapperboard size={20} className="text-red-500" />
              <h2 className={`text-2xl font-bold tracking-tight border-l-4 ${cat.cor} pl-3`}>
                {cat.nome}
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {itens.map((filme) => (
                <div key={filme} className="group relative aspect-[2/3] bg-gray-900 rounded-xl overflow-hidden cursor-pointer shadow-md transition-transform duration-300 hover:-translate-y-2 border border-gray-800/40 transform-gpu will-change-transform shadow-red-900/10 hover:shadow-lg hover:shadow-red-900/30">
                  <div className="absolute inset-0 bg-gray-800 group-hover:scale-105 transition-transform duration-500"></div>
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                    <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl">
                      <Play size={24} className="text-white ml-1" fill="currentColor" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent z-10 text-left translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h4 className="font-bold text-sm truncate text-white">Título do Filme</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">2026 • 2h 15m</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Filmes;