import React from 'react';
import { Play, Sparkles, Smile } from 'lucide-react';

const Infantil = () => {
  const carrosselCores = [
    { id: 1, nome: "Animação Mágica", grad: "from-yellow-500 to-orange-500", glow: "shadow-yellow-500/20" },
    { id: 2, nome: "Aventuras Fantásticas", grad: "from-purple-500 to-pink-500", glow: "shadow-purple-500/20" },
    { id: 3, nome: "Aprender a Brincar", grad: "from-cyan-500 to-blue-500", glow: "shadow-cyan-500/20" }
  ];
  const desenhos = Array.from({ length: 6 }).map((_, i) => i);

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-20 overflow-hidden">
      <div className="relative h-[60vh] min-h-[400px] w-full flex items-end px-6 md:px-12 lg:px-24 pb-16 overflow-hidden">
        {/* BLUR OTIMIZADO - Não mata a bateria */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full blur-3xl transform-gpu will-change-transform pointer-events-none"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-yellow-500/30 rounded-full blur-3xl transform-gpu will-change-transform pointer-events-none"></div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/30 to-transparent z-10"></div>
        
        <div className="relative z-20 max-w-xl animate-fadeIn text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-black uppercase tracking-widest rounded-full mb-4 shadow-lg shadow-orange-500/20">
            <Sparkles size={12} /> Mundo Kids
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none drop-shadow-xl text-white">
            Diversão Sem Fim <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-400">
              Para Os Pequenos
            </span>
          </h1>
          <p className="text-gray-300 mt-4 text-base md:text-lg font-medium leading-relaxed">
            Um espaço 100% seguro repleto de desenhos animados, fábulas educativas e aventuras incríveis feitas para fazer sorrir e aprender.
          </p>
        </div>
      </div>

      <div className="px-6 md:px-12 lg:px-24 space-y-14">
        {carrosselCores.map((seccao) => (
          <div key={seccao.id} className="animate-fadeIn">
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${seccao.grad}`}></div>
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                {seccao.nome}
                {seccao.id === 1 && <Smile size={20} className="text-yellow-400" />}
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 md:gap-6">
              {desenhos.map((item) => (
                <div 
                  key={item} 
                  className={`group relative aspect-[3/4] bg-gray-900 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 border-2 border-transparent hover:border-white/25 transform-gpu will-change-transform shadow-lg ${seccao.glow}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${seccao.grad} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  <div className="absolute inset-0 bg-gray-800/40 group-hover:scale-102 transition-transform duration-500"></div>
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                    <div className={`w-14 h-14 bg-gradient-to-r ${seccao.grad} rounded-full flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg text-black`}>
                      <Play size={26} className="ml-1 fill-current" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-3.5 bg-gradient-to-t from-black via-black/80 to-transparent z-10 text-left">
                    <h4 className="font-bold text-sm text-white truncate">Nome da Série</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Temporada 1</p>
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

export default Infantil;