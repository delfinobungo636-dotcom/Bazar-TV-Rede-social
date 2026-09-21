import React, { useState } from 'react';
import { Bot, Sparkles, Film, Save, Video, Image as ImageIcon, Gauge, CheckCircle, Loader2, Star } from 'lucide-react';
import { db } from '../../../shared/services/firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";

// 🚨 AVISO: Aconselho vivamente a gerares uma nova chave no Google AI Studio depois, 
// pois esta chave esteve exposta.
const GEMINI_API_KEY = "AIzaSyBtu5ljLfDw1ZA464NmW9dZ042xuXHvWvc"; 
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const StudioAI = () => {
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  
  const [sendToHero, setSendToHero] = useState(false);
  
  const [movie, setMovie] = useState({
    title: '',
    genre: 'Ação',
    description: '',
    coverUrl: '',
    videoUrl: '',
    year: new Date().getFullYear(),
    duration: '', 
    rating: '12', 
    aiScore: 0 
  });

  const handleAIGenerate = async () => {
    if (!movie.title) return alert("Escreva primeiro o título do filme!");
    
    setAiGenerating(true);
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        Aja como um crítico de cinema profissional e argumentista de Hollywood. 
        Crie uma sinopse muito empolgante, cativante e comercial (máximo de 3 frases) para um filme chamado "${movie.title}" do género "${movie.genre}". 
        Depois da sinopse, salte uma linha e escreva APENAS um número entre 70 e 99 que represente a probabilidade de sucesso de bilheteira deste filme.
      `;

      const result = await model.generateContent(prompt);
      const response = result.response; // ⬅️ Corrigido: sem o "await" extra
      const text = response.text();

      // ⬅️ Limpeza de dados mais inteligente para evitar erros
      const lines = text.trim().split('\n').filter(line => line.trim() !== '');
      const scoreString = lines.pop()?.replace(/[^0-9]/g, '') || "85"; 
      const generatedDesc = lines.join('\n').trim(); 

      setMovie(prev => ({
        ...prev,
        description: generatedDesc,
        aiScore: parseInt(scoreString, 10)
      }));

    } catch (error: any) {
      console.error("Erro DETALHADO no Gemini:", error);
      alert(`Falha ao contactar a IA: ${error?.message || "Erro desconhecido. Aperte F12 e veja a aba Console."}`);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Guarda sempre no catálogo geral (movies)
      await addDoc(collection(db, 'movies'), {
        ...movie,
        rating: Number(movie.rating), // ⬅️ Previne falhas futuras no front-end, força a ser número
        type: 'movie', 
        createdAt: serverTimestamp(),
        isTrending: movie.aiScore > 90 
      });

      // 2. A MÁGICA DO HERO SECTION
      if (sendToHero) {
        await setDoc(doc(db, 'settings', 'hero'), {
          title: movie.title,
          subtitle: movie.description,
          buttonText: 'Assistir Agora',
          buttonLink: '/movies', 
          mediaType: 'image', 
          mediaUrl: movie.coverUrl,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      alert(sendToHero ? 'Filme publicado no Catálogo e no DESTAQUE PRINCIPAL! 🌟' : 'Magia feita! Filme adicionado ao catálogo. 🎬');
      
      // Limpa tudo
      setMovie({ title: '', genre: 'Ação', description: '', coverUrl: '', videoUrl: '', year: new Date().getFullYear(), duration: '', rating: '12', aiScore: 0 });
      setSendToHero(false);
      
    } catch (error) {
      console.error(error);
      alert('Erro ao guardar na Base de Dados (Firebase).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-[#0f172a] min-h-screen text-white w-full">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-end mb-8 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-4xl font-black flex items-center gap-3 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              <Bot size={40} className="text-purple-500" /> STUDIO AI
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Crie conteúdos virais com a Inteligência Artificial do Google Gemini.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2">
            <form onSubmit={handleSave} className="bg-[#1e293b] p-8 rounded-3xl border border-gray-700 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -z-0 pointer-events-none"></div>

              <h2 className="text-2xl font-bold mb-8 flex items-center gap-2 relative z-10 text-white">
                <Film size={24} className="text-purple-500"/> Ficha Técnica do Filme
              </h2>

              <div className="space-y-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400 mb-2 block">Título da Obra</label>
                    <input type="text" required className="w-full bg-black border border-gray-700 p-4 rounded-xl text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-lg" placeholder="Ex: O Código da Morte" value={movie.title} onChange={e => setMovie({...movie, title: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400 mb-2 block">Género Principal</label>
                    <select className="w-full bg-black border border-gray-700 p-4 rounded-xl text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-lg" value={movie.genre} onChange={e => setMovie({...movie, genre: e.target.value})}>
                      <option value="Ação">Ação / Aventura</option>
                      <option value="Drama">Romance / Drama</option>
                      <option value="Comédia">Comédia</option>
                      <option value="Terror">Terror</option>
                      <option value="Ficção Científica">Ficção Científica</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/20 p-6 rounded-2xl border border-purple-500/30 shadow-inner">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <label className="text-sm uppercase font-bold text-purple-300 flex items-center gap-2">
                      <Sparkles size={16}/> Sinopse Gerada por IA
                    </label>
                    <button type="button" onClick={handleAIGenerate} disabled={aiGenerating} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-full flex items-center justify-center gap-2 transition-all disabled:opacity-50 font-bold shadow-lg shadow-purple-900/50 hover:scale-105">
                      {aiGenerating ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
                      {aiGenerating ? 'O Gemini está a escrever...' : 'Gerar Sinopse Automática'}
                    </button>
                  </div>
                  <textarea rows={5} required className="w-full bg-black/60 border border-purple-500/20 p-4 rounded-xl text-gray-100 focus:border-purple-500 outline-none transition-colors resize-y leading-relaxed text-lg" placeholder="Escreva o título acima e deixe o Google Gemini criar a magia..." value={movie.description} onChange={e => setMovie({...movie, description: e.target.value})} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400 mb-2 block">Link da Capa (URL)</label>
                    <div className="flex items-center gap-3 bg-black border border-gray-700 rounded-xl p-3 focus-within:border-purple-500 transition-colors">
                      <ImageIcon size={20} className="text-gray-500"/>
                      <input type="text" required className="bg-transparent w-full outline-none text-white text-base" placeholder="https://..." value={movie.coverUrl} onChange={e => setMovie({...movie, coverUrl: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400 mb-2 block">Link do Filme/Trailer (URL)</label>
                    <div className="flex items-center gap-3 bg-black border border-gray-700 rounded-xl p-3 focus-within:border-purple-500 transition-colors">
                      <Video size={20} className="text-gray-500"/>
                      <input type="text" className="bg-transparent w-full outline-none text-white text-base" placeholder="https://..." value={movie.videoUrl} onChange={e => setMovie({...movie, videoUrl: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-2">
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400 mb-2 block">Ano</label>
                    <input type="number" className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-purple-500" value={movie.year} onChange={e => setMovie({...movie, year: Number(e.target.value)})}/>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400 mb-2 block">Duração</label>
                    <input type="text" className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-purple-500" placeholder="1h 50m" value={movie.duration} onChange={e => setMovie({...movie, duration: e.target.value})}/>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold text-gray-400 mb-2 block">Idade</label>
                    <select className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-purple-500" value={movie.rating} onChange={e => setMovie({...movie, rating: e.target.value})}>
                      <option>Livre</option><option>+10</option><option>+12</option><option>+16</option><option>+18</option>
                    </select>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border transition-all ${sendToHero ? 'bg-blue-500/10 border-blue-500/50' : 'bg-black/50 border-gray-700 hover:border-gray-600'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-blue-500 rounded cursor-pointer"
                      checked={sendToHero}
                      onChange={e => setSendToHero(e.target.checked)}
                    />
                    <div>
                      <span className={`font-bold flex items-center gap-2 text-base ${sendToHero ? 'text-blue-400' : 'text-gray-300'}`}>
                        <Star size={18} className={sendToHero ? "fill-blue-400 text-blue-400" : ""} /> 
                        Destacar na Página Inicial
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Ao publicar, este filme vai ser automaticamente colocado no banner gigante da tela inicial (Hero Section).
                      </p>
                    </div>
                  </label>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-lg py-5 rounded-2xl shadow-2xl shadow-purple-900/40 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] mt-6">
                  {loading ? <><Loader2 className="animate-spin w-6 h-6" /> A Processar Magia...</> : <><Save size={24} /> {sendToHero ? 'Publicar & Destacar ⭐' : 'Publicar no Catálogo'}</>}
                </button>

              </div>
            </form>
          </div>

          <div className="lg:col-span-1 space-y-8">
            <div className="bg-[#1e293b] p-8 rounded-3xl border border-gray-700 flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-2xl h-[340px]">
              <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent opacity-50"></div>
              <Gauge size={64} className={`mb-6 transition-all duration-700 relative z-10 ${movie.aiScore > 0 ? 'text-green-400 scale-110' : 'text-gray-600'}`} />
              <h3 className="text-gray-400 font-bold uppercase text-sm tracking-widest mb-2 relative z-10">Score do Gemini</h3>
              <p className={`text-7xl font-black transition-all duration-1000 relative z-10 ${movie.aiScore > 0 ? 'text-white' : 'text-gray-700'}`}>
                {movie.aiScore}%
              </p>
              {movie.aiScore > 90 && (
                <span className="mt-6 bg-green-500/20 text-green-400 text-sm font-bold px-5 py-2 rounded-full border border-green-500/50 flex items-center gap-2 animate-fadeIn relative z-10 shadow-lg shadow-green-900/20">
                  <CheckCircle size={16}/> Sucesso Garantido
                </span>
              )}
            </div>

            <div className="bg-[#1e293b] p-5 rounded-3xl border border-gray-700 text-center shadow-xl">
              <p className="text-gray-400 text-xs uppercase font-bold mb-4 tracking-wider flex items-center justify-center gap-2">
                <ImageIcon size={14}/> Preview da Capa
              </p>
              {movie.coverUrl ? (
                <img src={movie.coverUrl} alt="Preview" className="w-full h-[340px] object-cover rounded-2xl shadow-inner border border-gray-800" />
              ) : (
                <div className="w-full h-[340px] bg-black rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-700">
                  <ImageIcon size={48} className="text-gray-700 mb-3"/>
                  <span className="text-sm text-gray-500 px-8">Insira o link da imagem no formulário</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudioAI;