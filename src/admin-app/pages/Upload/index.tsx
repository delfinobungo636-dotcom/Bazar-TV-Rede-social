import React, { useState, useEffect } from 'react';
import { Upload as UploadIcon, Film, Tv, Radio, CheckCircle, AlertCircle, Loader2, LogOut, Bell, Link as LinkIcon } from 'lucide-react'; 
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../../shared/services/firebase';

// 🚀 GESTOR DE MEMÓRIA GLOBAL (Fica fora do componente)
const uploadMemory = {
  isUploading: false,
  progress: 0,
  uploadingTitle: '',
  listeners: [] as Function[],
  subscribe(listener: Function) {
    this.listeners.push(listener);
    listener(this.isUploading, this.progress, this.uploadingTitle);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  },
  update(isUp: boolean, prog: number, title?: string) {
    this.isUploading = isUp;
    this.progress = prog;
    if (title !== undefined) this.uploadingTitle = title;
    this.listeners.forEach((l) => l(this.isUploading, this.progress, this.uploadingTitle));
  }
};

const UploadPage = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // 🚀 ESTADOS PARA PROGRESSO
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [memoryTitle, setMemoryTitle] = useState(''); 
  
  // Estados do Formulário
  const [contentType, setContentType] = useState('live'); 
  const [channelSlot, setChannelSlot] = useState('bazar_sport'); 
  
  // Dados Gerais
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('desenhos'); 
  const [videoUrl, setVideoUrl] = useState('');
  
  // 🔔 ESTADO DE NOTIFICAÇÃO
  const [notificationText, setNotificationText] = useState('');

  // Dados de Séries
  const [season, setSeason] = useState('1');
  const [episode, setEpisode] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');

  // Arquivos
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // 🚀 RECUPERAÇÃO DE MEMÓRIA
  useEffect(() => {
    const unsubscribe = uploadMemory.subscribe((isUp: boolean, prog: number, mTitle: string) => {
      setIsUploading(isUp);
      setProgress(prog);
      setMemoryTitle(mTitle);
    });
    return () => unsubscribe();
  }, []);

  const handleExit = () => {
    auth.signOut();
    window.location.href = '/';
  };

  // 🚀 MOTOR DE UPLOAD COM BARRA DE PROGRESSO GLOBAL
  const uploadWithProgress = (file: File, path: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          uploadMemory.update(true, Math.round(percentage)); 
        }, 
        (err) => { reject(err); }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    uploadMemory.update(true, 0, title);

    try {
      let coverUrl = '';
      let fileUrl = '';

      if (coverImage) {
        const folder = contentType === 'series' ? 'series_covers' : 'thumbnails';
        coverUrl = await uploadWithProgress(coverImage, `${folder}/${Date.now()}_${coverImage.name}`);
      }

      if (contentType !== 'live' && videoFile) {
        const folder = contentType === 'series' ? `episodes/${title.replace(/\s+/g, '_')}` : 'videos';
        fileUrl = await uploadWithProgress(videoFile, `${folder}/${Date.now()}_${videoFile.name}`);
      }

      // Garante que o link do Bunny.net é atribuído à variável
      const finalVideoUrl = videoUrl.trim() !== '' ? videoUrl : (fileUrl || '');
      let targetId = ''; 

      if (contentType === 'series') {
        const q = query(collection(db, "movies"), where("title", "==", title), where("type", "==", "series"));
        const querySnapshot = await getDocs(q);
        let seriesId = '';

        // 1. Cria ou recupera a Série na coleção 'movies' (para o Hero Section)
        if (querySnapshot.empty) {
          const seriesRef = await addDoc(collection(db, "movies"), {
            title, 
            description, 
            category, 
            thumbnailUrl: coverUrl,
            videoUrl: finalVideoUrl, // GRAVADO COMO videoUrl PARA O HERO SECTION
            type: 'series', 
            createdAt: serverTimestamp(), 
            active: true, 
            views: 0
          });
          seriesId = seriesRef.id;
        } else {
          seriesId = querySnapshot.docs[0].id;
        }

        // 2. CRIA O EPISÓDIO DIRETAMENTE NA COLEÇÃO 'episodes'
        await addDoc(collection(db, "episodes"), {
          seriesId: seriesId,
          seriesTitle: title, // Guarda o nome da série para facilitar leituras
          season: Number(season),
          number: Number(episode),
          title: episodeTitle || `Episódio ${episode}`,
          videoUrl: finalVideoUrl, // GRAVADO COMO videoUrl PARA O WATCH PAGE
          thumbnailUrl: coverUrl,
          createdAt: serverTimestamp()
        });
        
        targetId = seriesId;
      } else {
        // Se for Filme normal ou Live
        const movieRef = await addDoc(collection(db, "movies"), {
          type: contentType, title, description, category,
          thumbnailUrl: coverUrl, videoUrl: finalVideoUrl, // GRAVADO COMO videoUrl
          channelSlot: contentType === 'live' ? channelSlot : null,
          createdAt: serverTimestamp(), active: true, views: 0
        });
        targetId = movieRef.id; 
      }

      if (notificationText.trim() !== '') {
        await addDoc(collection(db, "notifications"), {
          title: `Novidade: ${title}`,
          message: notificationText,
          image: coverUrl,
          type: contentType,
          read: false,
          action: `/watch/${targetId}`, 
          createdAt: serverTimestamp()
        });
      }

      setSuccess(true);
      setTitle(''); setDescription(''); setVideoUrl(''); setSeason('1'); setEpisode(''); setEpisodeTitle(''); setCoverImage(null); setVideoFile(null);
      setNotificationText(''); 
      setTimeout(() => setSuccess(false), 3000);

    } catch (err: any) {
      setError("Erro ao publicar: " + err.message);
    } finally {
      setLoading(false);
      uploadMemory.update(false, 0, '');
    }
  };

  return (
    <div className="p-8 bg-[#0f172a] min-h-screen text-white w-full font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-gray-800 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent uppercase tracking-tighter">
              Bazar Estúdio Admin
            </h1>
            <p className="text-gray-400 mt-1 uppercase text-xs font-bold tracking-widest">Painel de Upload Inteligente</p>
          </div>
          <button onClick={handleExit} className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-900/20">
            <LogOut size={18} /> Sair
          </button>
        </div>

        {/* 🚀 BARRA DE PROGRESSO VISUAL */}
        {isUploading && (
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-blue-500/40 animate-pulse shadow-2xl shadow-blue-900/20">
            <div className="flex justify-between items-center mb-3">
              <span className="text-blue-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <Loader2 className="animate-spin" size={14}/> A Enviar {memoryTitle || title}...
              </span>
              <span className="text-white font-black text-xl">{progress}%</span>
            </div>
            <div className="w-full bg-black rounded-full h-5 overflow-hidden border border-gray-700 p-1">
              <div 
                className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(37,99,235,0.6)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {success && <div className="p-4 bg-green-500/20 border border-green-500 rounded-xl flex items-center gap-3 text-green-400 font-bold"> <CheckCircle /> Upload feito com sucesso para as coleções Movies e Episodes! 🚀</div>}
        {error && <div className="p-4 bg-red-500/20 border border-red-500 rounded-xl flex items-center gap-3 text-red-400 font-bold"> <AlertCircle /> {error}</div>}

        <form onSubmit={handleUpload} className="space-y-6">
          {/* SELEÇÃO DE TIPO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button type="button" onClick={() => setContentType('live')} className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${contentType === 'live' ? 'border-red-500 bg-red-500/10 scale-105 shadow-xl' : 'border-gray-700 bg-gray-800/30 text-gray-500 hover:border-gray-400'}`}>
              <Radio size={32} /> <span className="font-black uppercase text-[10px] tracking-tighter">Canal em Direto</span>
            </button>
            <button type="button" onClick={() => setContentType('movie')} className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${contentType === 'movie' ? 'border-blue-500 bg-blue-500/10 scale-105 shadow-xl' : 'border-gray-700 bg-gray-800/30 text-gray-500 hover:border-gray-400'}`}>
              <Film size={32} /> <span className="font-black uppercase text-[10px] tracking-tighter">Filme Único</span>
            </button>
            <button type="button" onClick={() => setContentType('series')} className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${contentType === 'series' ? 'border-purple-500 bg-purple-500/10 scale-105 shadow-xl' : 'border-gray-700 bg-gray-800/30 text-gray-500 hover:border-gray-400'}`}>
              <Tv size={32} /> <span className="font-black uppercase text-[10px] tracking-tighter">Série / Desenhos</span>
            </button>
          </div>

          <div className="bg-[#1e293b] p-6 md:p-8 rounded-3xl border border-gray-800 space-y-6 shadow-2xl">
            
            <div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/20">
                <label className="text-blue-400 text-[10px] font-black mb-2 flex items-center gap-2 uppercase tracking-widest">
                   <Bell size={14}/> Notificação Push (O que o usuário vai ler?)
                </label>
                <input 
                  type="text" 
                  value={notificationText} 
                  onChange={e => setNotificationText(e.target.value)} 
                  placeholder="Ex: Acaba de chegar o novo episódio! Assista agora." 
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" 
                />
            </div>

            {contentType === 'series' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn bg-black/40 p-5 rounded-2xl border border-purple-500/30">
                <div className="md:col-span-3">
                  <label className="text-purple-400 text-[10px] font-black mb-2 block uppercase tracking-widest">Nome do Episódio</label>
                  <input type="text" value={episodeTitle} onChange={e => setEpisodeTitle(e.target.value)} placeholder="Ex: O Início do Fim" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-purple-400 text-[10px] font-black mb-2 block uppercase tracking-widest">Temporada</label>
                  <input type="number" value={season} onChange={e => setSeason(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white" />
                </div>
                <div>
                  <label className="text-purple-400 text-[10px] font-black mb-2 block uppercase tracking-widest">Nº Episódio</label>
                  <input type="number" value={episode} onChange={e => setEpisode(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white" required />
                </div>
              </div>
            )}

            {contentType === 'live' && (
              <div className="animate-fadeIn">
                <label className="block text-[10px] font-black text-red-500 mb-2 uppercase tracking-widest">Slot de Transmissão</label>
                <select value={channelSlot} onChange={(e) => setChannelSlot(e.target.value)} className="w-full bg-black border border-zinc-700 rounded-xl p-4 text-white focus:border-red-500">
                  <option value="bazar_sport">⚽ Bazar Sport</option>
                  <option value="bazar_news">📰 Bazar News</option>
                  <option value="bazar_movie">🎬 Bazar Movie</option>
                  <option value="tpa_angola">🇦🇴 TPA Angola</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-gray-400 text-[10px] font-black mb-2 block uppercase tracking-widest">Título da Série / Filme</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Avatar" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" required />
              </div>
              
              <div>
                <label className="text-gray-400 text-[10px] font-black mb-2 block uppercase tracking-widest">Categoria</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)} 
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:border-blue-500"
                >
                  <option value="desenhos">Desenhos & Animes</option>
                  <option value="acao">Ação</option>
                  <option value="comedia">Comédia</option>
                  <option value="drama">Drama</option>
                  <option value="novelas">Novelas</option>
                  <option value="terror">Terror</option>
                  <option value="desporto">Desporto</option>
                  <option value="ficcao">Ficção</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-[10px] font-black mb-2 block uppercase tracking-widest">Sinopse / Descrição</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
            </div>
          </div>

          {/* FONTES DE MÍDIA */}
          <div className="bg-[#1e293b] p-6 md:p-8 rounded-3xl border border-gray-800 space-y-6 shadow-2xl">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Ficheiros e Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center cursor-pointer hover:bg-black/40 relative group transition-all">
                   <input type="file" onChange={e => setCoverImage(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                   <UploadIcon className="w-10 h-10 mx-auto text-red-500 mb-3 group-hover:scale-110 transition-transform" />
                   <span className="font-bold text-gray-300 block text-sm">{coverImage ? coverImage.name : "Capa Principal"}</span>
                </div>
                {contentType !== 'live' && (
                  <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center cursor-pointer hover:bg-black/40 relative group transition-all">
                     <input type="file" onChange={e => setVideoFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 opacity-0 cursor-pointer" accept="video/*" />
                     <Film className="w-10 h-10 mx-auto text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                     <span className="font-bold text-gray-300 block text-sm">{videoFile ? videoFile.name : "Vídeo MP4"}</span>
                  </div>
                )}
            </div>
            <div className="pt-4 border-t border-zinc-800">
               <label className="text-gray-500 text-[10px] font-black mb-2 flex items-center gap-2 uppercase tracking-widest">
                 <LinkIcon size={14}/> Link Direto (Bunny.net / Servidor Externo)
               </label>
               <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://..." className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-zinc-400 font-mono text-xs" />
            </div>
          </div>

          <button type="submit" disabled={loading || isUploading} className="w-full py-5 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl font-black text-white uppercase shadow-2xl shadow-red-900/40 hover:scale-[1.01] transition-all active:scale-95 disabled:opacity-50">
            {(loading || isUploading) ? <><Loader2 className="animate-spin w-6 h-6 inline mr-2" /> {progress}% A PUBLICAR...</> : 'Publicar na Bazar TV'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadPage;