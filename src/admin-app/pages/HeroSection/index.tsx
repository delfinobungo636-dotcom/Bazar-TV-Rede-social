import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Upload as UploadIcon, Film, Save, Loader2, CheckCircle, AlertCircle, Link as LinkIcon, Smartphone, Monitor, MoveHorizontal, MoveVertical, Play, Info } from 'lucide-react';
import { doc, setDoc, getDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../shared/services/firebase';

const AdminHeroSection = () => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState(''); 
  const [subtitle, setSubtitle] = useState('');
  const [buttonText, setButtonText] = useState('Assistir Agora');
  const [buttonLink, setButtonLink] = useState('/movies');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  
  // 🚀 RIGOR MÁXIMO: 4 Eixos de Foco independentes!
  const [focalXMobile, setFocalXMobile] = useState(50);
  const [focalYMobile, setFocalYMobile] = useState(50);
  const [focalXPC, setFocalXPC] = useState(50);
  const [focalYPC, setFocalYPC] = useState(50);

  const [videoLinkForImage, setVideoLinkForImage] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(''); 
  const [oldStorageUrl, setOldStorageUrl] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewMode, setPreviewMode] = useState<'pc' | 'mobile'>('pc');

  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        const heroDoc = await getDoc(doc(db, 'settings', 'hero'));
        if (heroDoc.exists()) {
          const data = heroDoc.data();
          setTitle(data.title || '');
          setSubtitle(data.subtitle || '');
          setButtonText(data.buttonText || 'Assistir Agora');
          setButtonLink(data.buttonLink || '/movies');
          setMediaType(data.mediaType || 'image');
          setPreviewUrl(data.mediaUrl || '');
          
          // 🚀 Carrega os 4 focos do Firebase (se não existirem, usa 50%)
          setFocalXMobile(data.focalXMobile ?? 50);
          setFocalYMobile(data.focalYMobile ?? 50);
          setFocalXPC(data.focalXPC ?? 50);
          setFocalYPC(data.focalYPC ?? 50);
          
          if (data.mediaType === 'image' && data.videoUrl) setVideoLinkForImage(data.videoUrl);
          if (data.mediaUrl && !data.mediaUrl.startsWith('blob:')) {
            setExternalUrl(data.mediaUrl);
            if (data.mediaUrl.includes('firebasestorage.googleapis.com')) setOldStorageUrl(data.mediaUrl);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchHeroData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const maxSize = mediaType === 'video' ? 20 * 1024 * 1024 : 5 * 1024 * 1024; 
      if (selectedFile.size > maxSize) {
        setError(`Ficheiro muito grande! O limite é ${mediaType === 'video' ? '20MB' : '5MB'}.`);
        return;
      }
      setError(''); setFile(selectedFile); setExternalUrl(''); setUploadProgress(0); 
      if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleExternalUrlChange = (url: string) => {
    setExternalUrl(url);
    if (url) {
      setFile(null); setUploadProgress(0);
      if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess(false); setUploadProgress(0);

    try {
      let finalMediaUrl = externalUrl || previewUrl; 

      if (file) {
        const folder = mediaType === 'video' ? 'hero_videos' : 'hero_images';
        const fileRef = ref(storage, `${folder}/hero_banner_${Date.now()}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        finalMediaUrl = await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (err) => reject(err),
            async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
          );
        });

        if (oldStorageUrl && oldStorageUrl !== finalMediaUrl) {
          try { await deleteObject(ref(storage, oldStorageUrl)); } catch (deleteErr) {}
        }
        setOldStorageUrl(finalMediaUrl);
      }

      if (!finalMediaUrl) throw new Error("Adicione um arquivo ou link.");

      const heroData = {
        title: title || '', subtitle: subtitle || '',
        buttonText: buttonText || 'Assistir', buttonLink: buttonLink || '',
        mediaType, mediaUrl: finalMediaUrl, 
        // 🚀 Salva os 4 eixos
        focalXMobile, focalYMobile, focalXPC, focalYPC,
        videoUrl: mediaType === 'image' ? videoLinkForImage : finalMediaUrl,
        coverUrl: mediaType === 'image' ? finalMediaUrl : '',
        thumbnailUrl: mediaType === 'image' ? finalMediaUrl : '',
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'settings', 'hero'), heroData, { merge: true });
      await addDoc(collection(db, 'hero_history'), heroData);

      setSuccess(true); setFile(null); setUploadProgress(0);
      setTimeout(() => setSuccess(false), 4000);

    } catch (err: any) {
      setError(err.message || 'Erro ao guardar.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8 bg-[#0f172a] min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-500 w-12 h-12" /></div>;

  // Variáveis para controlar qual slider mostrar dependendo da pré-visualização ativa
  const currentFocalX = previewMode === 'mobile' ? focalXMobile : focalXPC;
  const currentFocalY = previewMode === 'mobile' ? focalYMobile : focalYPC;

  const handleXChange = (val: number) => previewMode === 'mobile' ? setFocalXMobile(val) : setFocalXPC(val);
  const handleYChange = (val: number) => previewMode === 'mobile' ? setFocalYMobile(val) : setFocalYPC(val);

  return (
    <div className="p-4 md:p-8 bg-[#0f172a] min-h-screen text-white w-full">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <ImageIcon className="text-blue-500" /> Destaque Principal (Hero)
          </h1>
          <p className="text-gray-400">Enquadramento absoluto. Ajusta independentemente para telemóvel e PC.</p>
        </div>

        {success && (
          <div className="p-4 bg-green-500/20 border border-green-500 rounded-xl flex items-center gap-3 text-green-400 animate-fadeIn">
            <CheckCircle className="w-6 h-6" /><span>Destaque publicado!</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500 rounded-xl flex items-center gap-3 text-red-400 animate-fadeIn">
            <AlertCircle className="w-6 h-6" /><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-gray-700 space-y-6 shadow-xl h-fit">
            <h3 className="text-xl font-bold border-b border-gray-700 pb-4">Textos e Acções</h3>
            <div>
              <label className="text-xs uppercase font-bold text-gray-500 mb-2 block">Título (Opcional)</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-xs uppercase font-bold text-gray-500 mb-2 block">Sinopse Curta</label>
              <textarea value={subtitle} onChange={e => setSubtitle(e.target.value)} rows={3} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase font-bold text-gray-500 mb-2 block">Texto Botão</label>
                <input type="text" value={buttonText} onChange={e => setButtonText(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="text-xs uppercase font-bold text-gray-500 mb-2 block">Link Botão</label>
                <input type="text" value={buttonLink} onChange={e => setButtonLink(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none font-mono text-sm" />
              </div>
            </div>
            <div className="mt-6">
              {loading && file && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs font-bold text-gray-400 mb-1">
                    <span>A Enviar Ficheiro...</span><span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-white transition-all flex justify-center items-center gap-2 shadow-lg disabled:opacity-50">
                {loading ? <><Loader2 className="animate-spin w-5 h-5" /> A Processar...</> : <><Save className="w-5 h-5" /> Publicar Alterações</>}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#1e293b] p-6 rounded-2xl border border-gray-700 shadow-xl">
              <h3 className="text-xl font-bold border-b border-gray-700 pb-4 mb-4">Mídia de Fundo</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button type="button" onClick={() => setMediaType('image')} className={`p-3 rounded-xl border flex justify-center items-center gap-2 transition-all ${mediaType === 'image' ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-black border-gray-700 text-gray-400'}`}><ImageIcon size={18} /> Imagem</button>
                <button type="button" onClick={() => setMediaType('video')} className={`p-3 rounded-xl border flex justify-center items-center gap-2 transition-all ${mediaType === 'video' ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-black border-gray-700 text-gray-400'}`}><Film size={18} /> Vídeo</button>
              </div>

              {/* 🚀 SLIDERS INTELIGENTES: Mudam dependendo se tens "Telemóvel" ou "PC" selecionado no ecrã de baixo */}
              <div className="mb-6 bg-black/30 p-4 rounded-xl border border-gray-700 space-y-4">
                <label className="text-xs uppercase font-bold text-blue-400 block">
                  Ajuste de Foco para {previewMode === 'mobile' ? 'Telemóvel' : 'Computador'}
                </label>
                
                <div className="flex items-center gap-4">
                  <MoveHorizontal size={16} className="text-gray-400 flex-none" />
                  <input type="range" min="0" max="100" value={currentFocalX} onChange={e => handleXChange(Number(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  <span className="text-sm font-black text-gray-300 w-12 text-right tabular-nums">{currentFocalX}%</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <MoveVertical size={16} className="text-gray-400 flex-none" />
                  <input type="range" min="0" max="100" value={currentFocalY} onChange={e => handleYChange(Number(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  <span className="text-sm font-black text-gray-300 w-12 text-right tabular-nums">{currentFocalY}%</span>
                </div>
              </div>

              {mediaType === 'image' && (
                <div className="mb-6 bg-blue-900/10 border border-blue-500/30 p-4 rounded-xl">
                  <label className="text-xs uppercase font-bold text-blue-400 mb-2 flex items-center gap-2"><Film size={14} /> Link do Vídeo (Ação do Botão)</label>
                  <input type="text" value={videoLinkForImage} onChange={e => setVideoLinkForImage(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm font-mono" />
                </div>
              )}

              <div className="mb-6">
                <label className="text-xs uppercase font-bold text-gray-500 mb-2 block flex items-center gap-2"><LinkIcon size={14} /> Link Direto do Fundo</label>
                <input type="text" value={externalUrl} onChange={e => handleExternalUrlChange(e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-sm font-mono" />
              </div>

              <div className="relative border-2 border-dashed border-gray-700 rounded-xl p-6 text-center hover:bg-black/50 transition-all">
                <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept={mediaType === 'video' ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp"} />
                <UploadIcon className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <span className="text-sm font-bold text-gray-300 block">Carregar Ficheiro local</span>
              </div>
            </div>

            <div className="bg-black border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-[#1e293b] px-4 py-2 border-b border-gray-800 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase">Previsualização</span>
                <div className="flex gap-2">
                  {/* Estes botões também controlam quais sliders mostras em cima! */}
                  <button type="button" onClick={() => setPreviewMode('mobile')} className={`p-1.5 rounded transition-all ${previewMode === 'mobile' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}><Smartphone size={16} /></button>
                  <button type="button" onClick={() => setPreviewMode('pc')} className={`p-1.5 rounded transition-all ${previewMode === 'pc' ? 'bg-blue-500 text-white' : 'text-gray-500'}`}><Monitor size={16} /></button>
                </div>
              </div>

              <div className={`relative flex flex-col justify-end mx-auto transition-all duration-500 ease-in-out bg-zinc-950 overflow-hidden ${previewMode === 'mobile' ? 'w-[280px] h-[450px] border-x border-gray-800 pb-10' : 'w-full aspect-video pb-16 px-12'}`}>
                
                {previewUrl ? (
                  mediaType === 'video' ? (
                    <video key={previewUrl} src={previewUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: `${currentFocalX}% ${currentFocalY}%` }} />
                  ) : (
                    <img 
                      src={previewUrl} alt="Preview" 
                      className="absolute inset-0 w-full h-full object-cover opacity-90 transition-all duration-300" 
                      style={{ objectPosition: `${currentFocalX}% ${currentFocalY}%` }}
                    />
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-600 z-0">Sem Mídia</div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent z-10"></div>
                
                <div className={`relative z-20 flex flex-col w-full ${previewMode === 'mobile' ? 'items-center text-center px-4' : 'items-start text-left'}`}>
                  {title && <h2 className={`font-black text-white mb-1 uppercase italic tracking-tighter drop-shadow-lg leading-tight max-w-[95%] ${previewMode === 'mobile' ? 'text-2xl' : 'text-5xl'}`}>{title}</h2>}
                  {subtitle && <p className={`text-gray-300 line-clamp-2 drop-shadow leading-snug mb-3 ${previewMode === 'mobile' ? 'text-[11px]' : 'text-lg max-w-2xl'}`}>{subtitle}</p>}
                  
                  <div className={`flex gap-2 w-full ${previewMode === 'mobile' ? 'flex-row justify-center' : 'justify-start'}`}>
                    <div className={`bg-white text-black font-black rounded shadow-lg uppercase whitespace-nowrap leading-none flex items-center justify-center gap-1.5 ${previewMode === 'mobile' ? 'px-4 py-2 text-[10px] flex-1' : 'px-8 py-3 text-sm'}`}>
                       <Play fill="black" className="w-3 h-3 md:w-4 md:h-4" /> {buttonText || 'ASSISTIR'}
                    </div>
                    <div className={`bg-zinc-600/60 text-white font-bold rounded shadow-lg uppercase whitespace-nowrap leading-none border border-white/10 flex items-center justify-center gap-1.5 ${previewMode === 'mobile' ? 'px-4 py-2 text-[10px] flex-1' : 'px-8 py-3 text-sm'}`}>
                       <Info className="w-3 h-3 md:w-4 md:h-4" /> INFO
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminHeroSection;