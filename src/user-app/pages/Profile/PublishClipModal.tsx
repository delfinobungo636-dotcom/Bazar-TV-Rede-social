import React, { useState, useRef } from 'react';
import { db, storage } from '../../../shared/services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Upload, X, Film, Sparkles, Loader2, Play } from 'lucide-react';

interface PublishClipModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  showToast: (msg: string) => void;
}

export const PublishClipModal: React.FC<PublishClipModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
  showToast
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('BAZAR TV • COMUNIDADE');
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Selecionar Vídeo e Gerar Pré-visualização com Validação de Peso
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('video/')) {
      showToast('Por favor seleciona um ficheiro de vídeo válido (MP4, MOV...).');
      return;
    }

    // Alerta se o vídeo passar de 80MB antes da compressão
    if (selectedFile.size > 80 * 1024 * 1024) {
      showToast('O vídeo é demasiado pesado. Escolhe um ficheiro com menos de 80MB.');
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  // Limpar Seleção
  const handleClearFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  // Função auxiliar para comprimir/otimizar o vídeo antes do envio
  const compressVideoFile = async (videoFile: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const videoElement = document.createElement('video');
      videoElement.src = URL.createObjectURL(videoFile);
      videoElement.muted = true;
      videoElement.playsInline = true;

      videoElement.onloadedmetadata = () => {
        videoElement.play();
        const canvas = document.createElement('canvas');
        
        // Redimensionar para formato vertical padrão otimizado (Max 720p de largura)
        const targetWidth = 720;
        const scale = targetWidth / videoElement.videoWidth;
        canvas.width = targetWidth;
        canvas.height = Math.round(videoElement.videoHeight * scale);

        const ctx = canvas.getContext('2d');
        const stream = canvas.captureStream(30); // 30 FPS estável para evitar travamentos
        
        let mediaRecorder: MediaRecorder;
        try {
          mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 1500000 // 1.5 Mbps - Ideal para Clips fluídos sem pesar
          });
        } catch {
          try {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
          } catch {
            // Se o browser não suportar gravação via Canvas, retorna o ficheiro original otimizado
            resolve(videoFile);
            return;
          }
        }

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: 'video/webm' });
          resolve(compressedBlob.size < videoFile.size ? compressedBlob : videoFile);
        };

        mediaRecorder.start();

        const drawFrame = () => {
          if (videoElement.ended || videoElement.paused) {
            mediaRecorder.stop();
            return;
          }
          ctx?.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        };

        videoElement.onplay = () => {
          drawFrame();
        };

        videoElement.ontimeupdate = () => {
          if (videoElement.currentTime >= videoElement.duration) {
            videoElement.pause();
          }
        };
      };

      videoElement.onerror = () => {
        resolve(videoFile); // Em caso de erro, prossegue com o original
      };
    });
  };

  // Publicar o Corte no Firebase com Compressão Integrada
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = user?.uid || user?.id;

    if (!file || !title.trim() || !userId) {
      showToast('Preenche o título e escolhe um vídeo.');
      return;
    }

    try {
      setUploading(true);
      setProgress(10);
      showToast('⚙️ A otimizar e comprimir vídeo para máxima fluidez...');

      // Otimizar o ficheiro antes de enviar
      const optimizedBlob = await compressVideoFile(file);
      setProgress(40);

      // 1. Upload do Vídeo Otimizado para o Firebase Storage
      const fileName = `clips/${userId}/${Date.now()}_clip.webm`;
      const storageRef = ref(storage, fileName);
      const uploadTask = uploadBytesResumable(storageRef, optimizedBlob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const p = 40 + Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 60);
          setProgress(p);
        },
        (error) => {
          console.error('Erro no upload do vídeo:', error);
          showToast('Falha ao carregar o vídeo.');
          setUploading(false);
        },
        async () => {
          // 2. Obter URL do vídeo otimizado
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // 3. Guardar documento na coleção 'clips' do Firestore
          await addDoc(collection(db, 'clips'), {
            title: title.trim(),
            description: description.trim(),
            tags: tags.trim() || 'BAZAR TV',
            videoUrl: downloadURL,
            userId: userId,
            authorName: user?.name || 'Utilizador Bazar',
            authorImage: user?.profileImage || '',
            createdAt: serverTimestamp(),
            likesCount: 0,
            viewsCount: 0
          });

          setUploading(false);
          showToast('🚀 Corte publicado com sucesso e otimizado!');
          
          if (onSuccess) onSuccess();
          handleClose();
        }
      );
    } catch (err) {
      console.error('Erro ao publicar:', err);
      showToast('Erro ao criar o corte.');
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (uploading) return;
    handleClearFile();
    setTitle('');
    setDescription('');
    setProgress(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#121212] w-full max-w-lg rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-red-500" />
            <h3 className="text-lg font-black text-white tracking-tight uppercase">Publicar Novo Corte (Modo Leve)</h3>
          </div>
          <button 
            onClick={handleClose} 
            disabled={uploading} 
            className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handlePublish} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Zona de Upload / Pré-visualização */}
          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-red-500/80 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-full bg-zinc-800 group-hover:bg-red-600/20 text-zinc-300 group-hover:text-red-500 flex items-center justify-center mb-3 transition-colors">
                <Upload size={26} />
              </div>
              <p className="text-white font-bold text-sm mb-1">Clica para selecionar o teu vídeo</p>
              <p className="text-zinc-500 text-xs">Será comprimido automaticamente para rodar sem travar</p>
            </div>
          ) : (
            <div className="relative aspect-[9/16] max-h-64 w-full mx-auto bg-black rounded-xl overflow-hidden border border-zinc-700 group shadow-lg">
              <video src={previewUrl} className="w-full h-full object-cover" controls={false} autoPlay loop muted />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleClearFile}
                  disabled={uploading}
                  className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg hover:bg-red-700 transition-colors"
                >
                  Trocar Vídeo
                </button>
              </div>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="video/*" 
            className="hidden" 
          />

          {/* Título */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Título do Corte *
            </label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Jogada incrível na partida de hoje!"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors"
              maxLength={80}
              required
              disabled={uploading}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Descrição (Opcional)
            </label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto do vídeo..."
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl px-4 py-3 text-sm text-white outline-none resize-none transition-colors"
              maxLength={180}
              disabled={uploading}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Etiquetas / Categoria
            </label>
            <input 
              type="text" 
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ex: FUTEBOL • CABINDA"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl px-4 py-3 text-xs text-zinc-300 font-mono outline-none transition-colors"
              disabled={uploading}
            />
          </div>

          {/* Barra de Progresso */}
          {uploading && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin text-red-500" /> A otimizar e enviar...
                </span>
                <span className="text-red-500 font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-red-600 to-red-400 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Botão de Submeter */}
          <button
            type="submit"
            disabled={!file || !title.trim() || uploading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black py-3.5 rounded-xl uppercase tracking-wider text-xs shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {uploading ? (
              <>A Processar...</>
            ) : (
              <>
                <Film size={16} /> Publicar Vídeo Fluído
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};