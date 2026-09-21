import React from 'react';
import { Play, Radio, Clock, Newspaper, ArrowUpRight } from 'lucide-react';

const Noticias = () => {
  const canaisAoVivo = [1, 2];
  const ultimasNoticias = Array.from({ length: 4 }).map((_, i) => i);

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-20">
      <div className="relative h-[50vh] min-h-[350px] w-full flex items-end px-6 md:px-12 lg:px-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 to-transparent z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-transparent z-10"></div>
        
        <div className="relative z-20 max-w-2xl animate-fadeInLeft">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 bg-blue-600 text-[10px] font-bold uppercase tracking-widest rounded-md shadow-md">
              Atualidade
            </span>
            <span className="text-gray-400 text-sm font-medium">Informação de Confiança</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
            Acontece no País <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-red-500">
              E No Mundo
            </span>
          </h1>
          <p className="text-gray-300 mt-4 text-base md:text-lg leading-relaxed">
            Acompanha a cobertura jornalística completa, os principais blocos informativos em direto e análises profundas sobre a economia, política e sociedade.
          </p>
        </div>
      </div>

      <div className="px-6 md:px-12 lg:px-24 mb-16">
        <div className="flex items-center gap-2 mb-6">
          <Radio size={22} className="text-blue-500 animate-pulse" />
          <h2 className="text-2xl font-bold tracking-tight">Canais de Notícias 24/7</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {canaisAoVivo.map((canal) => (
            <div key={canal} className="group relative aspect-video bg-gray-900 rounded-xl overflow-hidden cursor-pointer border border-gray-800/80 shadow-md transition-all duration-300 hover:border-blue-600/50 transform-gpu will-change-transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-slate-800 opacity-20 group-hover:scale-102 transition-transform duration-500"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent z-10"></div>
              
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></div>
                <span className="text-xs font-bold uppercase tracking-wider bg-red-600 px-2 py-0.5 rounded shadow-sm">Direto</span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">Jornal das Próximas Horas</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Acompanhamento das principais manchetes</p>
                </div>
                <div className="w-10 h-10 bg-white/10 hover:bg-white text-white hover:text-black rounded-full flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all shadow-lg border border-white/20">
                  <Play size={18} fill="currentColor" className="ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-12 lg:px-24">
        <div className="flex items-center gap-2 mb-6">
          <Newspaper size={20} className="text-gray-400" />
          <h2 className="text-2xl font-bold tracking-tight border-l-4 border-blue-600 pl-3">
            Últimas Reportagens
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ultimasNoticias.map((item) => (
            <div key={item} className="group bg-gray-900/40 border border-gray-800/50 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:bg-gray-900/80 hover:border-gray-700 transform-gpu will-change-transform hover:-translate-y-1 shadow-sm hover:shadow-md">
              <div className="aspect-video bg-gray-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors"></div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-[10px] font-mono rounded text-gray-300 flex items-center gap-1">
                  <Clock size={10} /> 14 min
                </div>
              </div>
              <div className="p-4 text-left">
                <h4 className="font-bold text-base text-gray-100 line-clamp-2 group-hover:text-blue-400 transition-colors">
                  Desenvolvimento Tecnológico e Infraestruturas no Setor Digital Local
                </h4>
                <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                  <span>Hoje às 19:30</span>
                  <span className="flex items-center gap-0.5 text-blue-500 font-medium group-hover:underline">
                    Ver <ArrowUpRight size={12} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Noticias;