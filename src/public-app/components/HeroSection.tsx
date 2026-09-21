import React from 'react';
import { ChevronRight } from 'lucide-react';

interface HeroSectionProps {
  onStart: () => void;
}

const HeroSection = ({ onStart }: HeroSectionProps) => {
  return (
    <div className="relative h-[90vh] min-h-[550px] w-full bg-[#141414] overflow-hidden pointer-events-none">
      
      {/* 1. IMAGEM DE FUNDO E GRADIENTES PROFISSIONAIS */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://firebasestorage.googleapis.com/v0/b/bazar-tv.firebasestorage.app/o/LandingPage%20images%2FIMG_3140.png?alt=media&token=7fbac419-1be1-42c8-9b9b-cfd8c2d3f55b" 
          alt="Cinema Fundo" 
          className="w-full h-full object-cover object-[80%_top] md:object-top opacity-90"
          loading="eager"
          fetchPriority="high"
        />
        
        {/* Gradientes Cinematográficos */}
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#141414] via-[#141414]/70 to-transparent"></div>
        <div className="absolute top-0 left-0 w-full md:w-2/3 h-full bg-gradient-to-r from-[#141414]/90 via-[#141414]/40 to-transparent"></div>
      </div>

      {/* 2. CONTEÚDO ADAPTATIVO */}
      <div className="relative z-10 w-full h-full pointer-events-auto">
        
        {/* TÍTULO PRINCIPAL - CENTRALIZADO E DESCIDO NO TELEMÓVEL (top-[62%]), ALINHADO À ESQUERDA NO PC (md:top-[38%]) */}
        <div className="absolute top-[62%] md:top-[38%] left-0 md:left-6 w-full md:w-auto px-4 md:px-0 text-center md:text-left max-w-full md:max-w-xl animate-fadeIn">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-black text-white leading-[1.15] tracking-tighter drop-shadow-2xl will-change-transform">
            <span className="block">O cinema angolano</span>
            <span className="block ml-0 md:ml-8 text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500 drop-shadow-lg mt-1">
              em suas mãos
            </span>
          </h1>
        </div>

        {/* SUBTÍTULO E BOTÃO - CENTRALIZADOS EM BAIXO */}
        <div className="absolute bottom-8 md:bottom-16 left-0 w-full flex flex-col items-center text-center px-4 animate-fadeIn">
          <p className="text-sm md:text-xl text-gray-200 mb-5 font-medium drop-shadow-md max-w-xl mx-auto leading-relaxed">
            Assista aos melhores filmes, séries e canais ao vivo. <br className="hidden md:block"/>
            Cancele quando quiser.
          </p>

          <button 
            onClick={onStart}
            className="bg-red-600 hover:bg-red-700 text-white text-lg md:text-2xl font-bold py-3.5 px-8 md:px-10 rounded-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 shadow-[0_0_40px_rgba(220,38,38,0.4)] will-change-transform cursor-pointer"
          >
            Começar Agora <ChevronRight size={24} />
          </button>
         
        </div>

      </div>
    </div>
  );
};

export default HeroSection;