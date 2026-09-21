import React, { useState } from 'react';
import { X, UploadCloud, Film, Image as ImageIcon } from 'lucide-react';
import { db, storage } from '../../shared/services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

interface StoryCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onShowToast: (msg: string) => void;
}

export const StoryCreator: React.FC<StoryCreatorProps> = ({ isOpen, onClose, user, onShowToast }) => {
  const [file, setFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setMediaType(selected.type.startsWith('video') ? 'video' : 'image');
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user?.uid) {
      onShowToast("Seleciona um ficheiro.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const storageRef = ref(storage, `stories/${user.uid}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        (err) => {
          console.error(err);
          onShowToast("Erro no upload do story.");
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await addDoc(collection(db, 'stories'), {
            userId: user.uid,
            userName: user.name || 'Membro Bazar',
            userAvatar: user.profileImage || '',
            mediaUrl: downloadURL,
            mediaType: mediaType,
            viewedBy: [],
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
          });

          onShowToast("Story publicado!");
          setFile(null);
          setUploading(false);
          onClose();
        }
      );
    } catch (e) {
      console.error(e);
      onShowToast("Falha ao publicar story.");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[350] flex items-center justify-center p-4 animate-fade-in text-left">
      <div className="bg-[#181818] border border-zinc-800 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Criar Novo Story</h2>
          <button onClick={onClose} disabled={uploading} className="p-1.5 bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handlePublish} className="p-5 space-y-4 text-xs">
          <div className="border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-2xl p-6 text-center bg-zinc-900/40 relative cursor-pointer">
            <input type="file" accept="image/*,video/*" onChange={handleFileChange} required className="absolute inset-0 opacity-0 cursor-pointer" />
            <UploadCloud size={28} className="mx-auto mb-2 text-zinc-400" />
            <p className="font-bold text-zinc-300">{file ? file.name : 'Selecionar Foto ou Vídeo'}</p>
          </div>

          {uploading && (
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}

          <button type="submit" disabled={uploading || !file} className="w-full py-3 rounded-full font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:opacity-50">
            {uploading ? `A enviar (${progress}%)...` : 'Publicar Story'}
          </button>
        </form>
      </div>
    </div>
  );
};