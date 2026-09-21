import React, { useState, useEffect } from 'react';
import { Tv, Plus, Trash2, Play, Image as ImageIcon, Star, BarChart, Film, Globe, Pencil, X, Save, Loader2 } from 'lucide-react';
import { db } from '../../../shared/services/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

type ChannelCategory = 'news' | 'sports' | 'movies' | 'general';
type StreamSourceType = 'hls' | 'youtube' | 'facebook' | 'tiktok' | 'other';

interface Channel {
  id: string;
  name: string;
  category: ChannelCategory;
  logoUrl: string;
  streamUrl: string;
  isAutoPlaylist?: boolean;
  sourceType: StreamSourceType;
}

const initialFormState = {
  name: '', category: 'general' as ChannelCategory, logoUrl: '', streamUrl: '', isAutoPlaylist: false, sourceType: 'hls' as StreamSourceType
};

const LiveChannels = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'channels'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const channelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Channel[];
      setChannels(channelsData);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'channels', editingId), { ...formData, updatedAt: new Date() });
      } else {
        await addDoc(collection(db, 'channels'), { ...formData, createdAt: new Date() });
      }
      setFormData(initialFormState);
      setEditingId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      alert('Erro ao guardar canal na base de dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (channel: Channel) => {
    setEditingId(channel.id);
    setFormData({
      name: channel.name, category: channel.category, logoUrl: channel.logoUrl,
      streamUrl: channel.streamUrl, isAutoPlaylist: channel.isAutoPlaylist || false, sourceType: channel.sourceType || 'hls'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => { setEditingId(null); setFormData(initialFormState); };

  const handleDelete = async (id: string) => {
    if (window.confirm('OPERAÇÃO DESTRUTIVA: Eliminar canal permanentemente?')) {
      await deleteDoc(doc(db, 'channels', id));
      if (editingId === id) cancelEdit(); 
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'news': return <Globe size={14} className="text-blue-400"/>;
      case 'sports': return <BarChart size={14} className="text-emerald-400"/>;
      case 'movies': return <Film size={14} className="text-purple-400"/>;
      default: return <Tv size={14} className="text-zinc-400"/>;
    }
  };

  return (
    <div className="p-4 md:p-8 bg-[#050505] min-h-screen text-zinc-200 w-full selection:bg-red-500/30">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex items-center gap-4 mb-10 border-b border-zinc-900 pb-8">
          <div className="w-12 h-12 bg-red-600/10 rounded-xl flex items-center justify-center border border-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.15)]">
            <Tv size={24} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white">BROADCAST <span className="text-red-500">CENTER</span></h1>
            <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mt-1">Gestor de Transmissões v6.0</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FORMULÁRIO DE CRIAÇÃO / EDIÇÃO */}
          <div className="lg:col-span-1">
            <div className={`bg-zinc-900/30 p-6 rounded-[2rem] border transition-colors sticky top-8 shadow-xl backdrop-blur-sm ${editingId ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'border-zinc-800'}`}>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-6">
                <h2 className="text-sm uppercase font-black tracking-widest flex items-center gap-2 text-white">
                  {editingId ? <Pencil className="text-blue-500" size={16}/> : <Plus className="text-red-500" size={16}/>}
                  {editingId ? 'Editar Sinal' : 'Novo Sinal'}
                </h2>
                {editingId && (
                  <button onClick={cancelEdit} className="text-zinc-500 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2 block">Nome da Emissão</label>
                  <input 
                    type="text" required placeholder="Ex: TPA 1"
                    className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white focus:border-red-500 outline-none transition-all text-sm font-bold shadow-inner"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2 block">Tipo de Conteúdo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'news', label: 'Notícias', icon: Globe },
                      { id: 'sports', label: 'Desporto', icon: BarChart },
                      { id: 'movies', label: 'Filmes', icon: Film },
                      { id: 'general', label: 'Geral', icon: Tv }
                    ].map((cat) => (
                      <button key={cat.id} type="button" onClick={() => setFormData({...formData, category: cat.id as any})}
                        className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${
                          formData.category === cat.id ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'
                        }`}
                      >
                        <cat.icon size={14} /> {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2 block">Logótipo (URL)</label>
                  <div className="flex items-center gap-3 bg-black border border-zinc-800 rounded-xl p-3 focus-within:border-red-500 transition-colors shadow-inner">
                    <ImageIcon size={16} className="text-zinc-600"/>
                    <input 
                      type="url" placeholder="https://..."
                      className="w-full bg-transparent text-white outline-none font-mono text-xs"
                      value={formData.logoUrl} onChange={e => setFormData({...formData, logoUrl: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2 block">Motor de Reprodução</label>
                  <select 
                    className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-zinc-300 font-bold text-xs uppercase tracking-widest focus:border-red-500 outline-none transition-colors appearance-none cursor-pointer shadow-inner"
                    value={formData.sourceType} onChange={e => setFormData({...formData, sourceType: e.target.value as StreamSourceType})}
                  >
                    <option value="hls">Vídeo Padrão (.m3u8 / .mp4)</option>
                    <option value="youtube">YouTube Player</option>
                    <option value="facebook">Facebook Player</option>
                    <option value="tiktok">TikTok Redirect</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div className={`p-5 rounded-xl border transition-all cursor-pointer ${formData.isAutoPlaylist ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-black border-zinc-800 hover:border-zinc-600'}`} onClick={() => setFormData({...formData, isAutoPlaylist: !formData.isAutoPlaylist})}>
                  <div className="flex items-start gap-4">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${formData.isAutoPlaylist ? 'bg-yellow-500 border-yellow-500' : 'border-zinc-600'}`}>
                      {formData.isAutoPlaylist && <Star size={12} className="text-black fill-black" />}
                    </div>
                    <div>
                      <span className={`text-xs font-black uppercase tracking-widest block mb-1 ${formData.isAutoPlaylist ? 'text-yellow-500' : 'text-zinc-400'}`}>
                        Modo Auto-Playlist
                      </span>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        Cria um canal 24h automático usando os filmes da base de dados. O Link do Stream será ignorado.
                      </p>
                    </div>
                  </div>
                </div>

                {!formData.isAutoPlaylist && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2 block">
                      Endereço do Stream (URL)
                    </label>
                    <div className="flex items-center gap-3 bg-black border border-zinc-800 rounded-xl p-3 focus-within:border-red-500 transition-colors shadow-inner">
                      <Play size={16} className="text-zinc-600"/>
                      <input 
                        type="text" required={!formData.isAutoPlaylist}
                        className="w-full bg-transparent text-white outline-none font-mono text-[10px]"
                        placeholder={formData.sourceType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://servidor.com/sinal.m3u8'}
                        value={formData.streamUrl} onChange={e => setFormData({...formData, streamUrl: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <button disabled={loading} className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 text-white disabled:opacity-50 ${editingId ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'}`}>
                  {loading ? <Loader2 size={18} className="animate-spin"/> : editingId ? <Save size={18} /> : <Plus size={18} />} 
                  {editingId ? 'Injetar Alterações' : 'Transmitir Canal'}
                </button>
              </form>
            </div>
          </div>

          {/* LISTA DE CANAIS */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-4">
              {channels.map(channel => (
                <div key={channel.id} className={`bg-zinc-900/30 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-5 group transition-all backdrop-blur-sm ${editingId === channel.id ? 'border-blue-500/50 bg-blue-900/10' : 'border-zinc-800 hover:border-zinc-600'}`}>
                  
                  <div className="w-full sm:w-24 h-32 sm:h-24 bg-black rounded-xl flex items-center justify-center overflow-hidden border border-zinc-800 shrink-0 relative">
                    {channel.logoUrl ? (
                      <img src={channel.logoUrl} alt={channel.name} className="w-full h-full object-contain p-2" />
                    ) : <Tv size={24} className="text-zinc-700" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="font-black text-lg text-white truncate">{channel.name}</h3>
                      {channel.isAutoPlaylist && (
                        <span className="text-[9px] font-black text-black bg-yellow-500 px-2 py-1 rounded uppercase tracking-widest flex items-center gap-1">
                          <Star size={10} className="fill-black"/> Auto-Loop
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-zinc-800 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                        {getCategoryIcon(channel.category)} {channel.category}
                      </span>
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                        channel.sourceType === 'youtube' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        channel.sourceType === 'hls' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        Motor: {channel.sourceType || 'HLS'}
                      </span>
                    </div>

                    <p className="text-[10px] text-zinc-500 truncate font-mono bg-black p-2.5 rounded-lg border border-zinc-800">
                      {channel.isAutoPlaylist ? 'A ler do catálogo de filmes da Firebase...' : (channel.streamUrl || 'Sem Sinal')}
                    </p>
                  </div>

                  <div className="sm:pl-4 sm:border-l border-zinc-800 flex sm:flex-col justify-end gap-2 mt-4 sm:mt-0">
                    <button onClick={() => handleEditClick(channel)} className="p-3 bg-zinc-800 hover:bg-blue-600/20 text-zinc-400 hover:text-blue-500 rounded-xl transition-all border border-zinc-700 hover:border-blue-500/30 flex-1 sm:flex-none flex justify-center" title="Editar Sinal">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(channel.id)} className="p-3 bg-zinc-800 hover:bg-red-900/30 text-zinc-400 hover:text-red-500 rounded-xl transition-all border border-zinc-700 hover:border-red-500/30 flex-1 sm:flex-none flex justify-center" title="Cortar Sinal">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {channels.length === 0 && (
                <div className="bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-3xl p-16 text-center">
                  <Tv size={48} className="text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-white font-black text-lg uppercase tracking-widest mb-2">Sinal Cortado</h3>
                  <p className="text-zinc-500 text-sm">Adiciona o primeiro canal no painel de controlo.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LiveChannels;