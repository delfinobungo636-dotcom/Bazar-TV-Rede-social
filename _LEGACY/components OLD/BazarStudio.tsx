import React from 'react';
import { ArrowLeft, Sparkles, Video, Wand2 } from 'lucide-react';

interface BazarStudioProps {
  onBack: () => void;
}

export default function BazarStudio({ onBack }: BazarStudioProps) {
  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24 animate-fade-in">
      {/* Cabeçalho */}
      <div className="max-w-4xl mx-auto mb-8 flex items-center gap-4">
        <button onClick={onBack} className="bg-zinc-800 p-2 rounded-full hover:bg-zinc-700 transition">
          <ArrowLeft />
        </button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="text-pink-500"/> Bazar Studio AI
          </h1>
          <p className="text-gray-400">Crie filmes e séries usando Inteligência Artificial.</p>
        </div>
      </div>

      {/* Área de Criação (Demo) */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Formulário */}
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
          <label className="block text-sm font-bold text-gray-400 mb-2">Descreva sua ideia</label>
          <textarea 
            className="w-full h-32 bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none resize-none"
            placeholder="Ex: Um filme de ação em Luanda onde..."
          ></textarea>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
               <label className="block text-xs font-bold text-gray-500 mb-1">Gênero</label>
               <select className="w-full bg-black border border-zinc-700 rounded p-2 text-sm"><option>Ação</option><option>Drama</option><option>Sci-Fi</option></select>
            </div>
            <div>
               <label className="block text-xs font-bold text-gray-500 mb-1">Duração</label>
               <select className="w-full bg-black border border-zinc-700 rounded p-2 text-sm"><option>Curta (1 min)</option><option>Trailer</option></select>
            </div>
          </div>

          <button className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 py-3 rounded-lg font-bold hover:opacity-90 flex items-center justify-center gap-2">
            <Wand2 size={18} /> Gerar Roteiro & Vídeo
          </button>
        </div>

        {/* Preview (Visual) */}
        <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl flex flex-col items-center justify-center p-10 text-center">
          <div className="bg-zinc-800 p-4 rounded-full mb-4">
            <Video size={32} className="text-purple-500" />
          </div>
          <h3 className="font-bold text-lg">Aguardando Criação...</h3>
          <p className="text-sm text-gray-500 mt-2">Seus vídeos gerados aparecerão aqui.</p>
        </div>

      </div>
    </div>
  );
}
