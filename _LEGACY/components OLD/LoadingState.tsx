import React from 'react';

export const LoadingState: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto aspect-video bg-[#121212] rounded-xl border border-gray-800 flex flex-col items-center justify-center p-8 space-y-6 relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 via-black to-red-900/5 animate-pulse"></div>
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h3 className="text-2xl font-bold text-white tracking-tight">Gerando Comercial <span className="text-red-600">Veo</span>...</h3>
        <p className="text-gray-400 text-base mt-2 max-w-md text-center">
          A inteligência artificial está criando cenas vibrantes para a Bazar TV.
        </p>
      </div>
      
      {/* Progress Bar */}
      <div className="w-80 h-1 bg-gray-800 rounded-full overflow-hidden relative z-10 mt-4">
        <div className="h-full bg-gradient-to-r from-red-600 to-red-800 animate-[loading_20s_ease-in-out_infinite]" style={{width: '70%'}}></div>
      </div>
    </div>
  );
};
export default 'LoadingState'