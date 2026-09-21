import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase'; 
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { 
  Film, Users, BarChart, Tv, Check, X, Save, Activity, 
  Sparkles, Plus, Trash2, PlayCircle, Loader2, Layout, PieChart, ShieldCheck, UserPlus, UserMinus
} from 'lucide-react';

export function AdminDashboard({ user, onLogout }: any) {
  const [activeTab, setActiveTab] = useState('telemetry');
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);

  const [contentForm, setContentForm] = useState({ 
    title: '', image: '', videoUrl: '', category: 'Filmes', description: ''
  });
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [tempEp, setTempEp] = useState({ title: '', url: '' });

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubContent = onSnapshot(query(collection(db, "movies"), orderBy("createdAt", "desc")), (snap) => {
      setContents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubUsers(); unsubContent(); };
  }, []);

  const stats = useMemo(() => {
    const categories = ['Desenhos', 'Filmes', 'Live TV', 'Novelas', 'Séries'];
    const distribution = categories.map(cat => ({
      label: cat,
      count: contents.filter(c => c.category === cat).length
    }));
    const pendingCount = users.filter(u => !u.approved).length;
    const maxVal = Math.max(...distribution.map(d => d.count), 1);
    return { distribution, pendingCount, maxVal };
  }, [contents, users]);

  // --- LOGICA DE CONTROLE DE ASSINATURA (4 PLANOS) ---
  const handleUserAction = async (userId: string, action: 'approve' | 'reject', plan?: string) => {
    try {
      if (action === 'approve' && plan) {
        await updateDoc(doc(db, "users", userId), { 
          approved: true, 
          status: 'active',
          planType: plan,
          updatedAt: serverTimestamp(),
          accessUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
        alert(`Bazar TV: Conta Ativada no Plano ${plan}`);
      } else if (action === 'reject') {
        if (window.confirm("Bazar TV: Deseja realmente rejeitar/banir este utilizador?")) {
          await updateDoc(doc(db, "users", userId), { 
            approved: false, 
            status: 'banned',
            planType: 'Nenhum'
          });
          alert("Utilizador bloqueado.");
        }
      }
    } catch (e) { console.error("Erro no controle:", e); }
  };

  const addEpisodeToList = () => {
    if (tempEp.title && tempEp.url) {
      setEpisodes([...episodes, { ...tempEp }]);
      setTempEp({ title: '', url: '' });
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "movies"), {
        ...contentForm,
        episodes: (contentForm.category === 'Séries' || contentForm.category === 'Novelas') ? episodes : [],
        createdAt: serverTimestamp(),
        views: 0
      });
      alert("Sucesso: Conteúdo disponível no Bazar TV");
      setContentForm({ title: '', image: '', videoUrl: '', category: 'Filmes', description: '' });
      setEpisodes([]);
    } catch (e) { alert("Erro na publicação"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex font-sans overflow-hidden">
      
      <aside className="w-72 bg-[#0a0a0a] border-r border-zinc-900 p-8 flex flex-col fixed h-full z-50">
        <div className="mb-12">
          <h1 className="text-3xl font-black tracking-tighter uppercase">
            BAZAR <span className="text-red-600">TV</span>
          </h1>
        </div>
        
        <nav className="flex flex-col gap-2 flex-1">
          {[
            { id: 'telemetry', label: 'Telemetria', icon: <BarChart size={20}/> },
            { id: 'livetv', label: 'Canais Live', icon: <Tv size={20}/> },
            { id: 'users', label: 'Utilizadores', icon: <Users size={20}/> },
            { id: 'content', label: 'Novo Conteúdo', icon: <Film size={20}/> },
            { id: 'hero', label: 'Hero Section', icon: <Layout size={20}/> },
            { id: 'aistudio', label: 'Estúdio AI', icon: <Sparkles size={20}/> },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-4 p-4 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <button onClick={onLogout} className="text-zinc-700 hover:text-red-500 font-bold p-4 border border-zinc-900 rounded-xl transition-all uppercase text-xs tracking-widest">
          Sair do Sistema
        </button>
      </aside>

      <main className="flex-1 ml-72 p-12 overflow-y-auto h-screen bg-black">
        
        {activeTab === 'telemetry' && (
          <div className="w-full animate-in fade-in duration-700">
            <h2 className="text-4xl font-bold mb-10 flex items-center gap-3"><Activity className="text-red-600"/> Monitor de Distribuição</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <div className="bg-zinc-950 p-10 rounded-3xl border border-zinc-900">
                <h3 className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2"><PieChart size={16}/> Distribuição de Catálogo</h3>
                <div className="flex items-end justify-between h-64 gap-6 px-4">
                  {stats.distribution.map((item) => (
                    <div key={item.label} className="flex flex-col items-center gap-4 w-full group">
                      <div style={{ height: `${(item.count / stats.maxVal) * 100}%` }} className="w-full bg-gradient-to-t from-red-950 to-red-600 rounded-t-lg min-h-[4px]"></div>
                      <div className="text-center">
                        <p className="text-xl font-black">{item.count}</p>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">{item.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-950 p-10 rounded-3xl border border-zinc-900 flex flex-col justify-center text-center">
                 <h3 className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] mb-4">Pedidos Pendentes</h3>
                 <p className="text-8xl font-black text-red-600 tracking-tighter">{stats.pendingCount}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="w-full animate-in fade-in">
            <h2 className="text-4xl font-bold mb-10">Controlo de Assinaturas</h2>
            <div className="bg-zinc-950 border border-zinc-900 rounded-[30px] overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-900/50 text-zinc-600 text-[10px] uppercase font-black tracking-[0.2em]">
                  <tr>
                    <th className="p-8">Identificador do Cliente</th>
                    <th className="p-8">Status</th>
                    <th className="p-8">Plano Atual</th>
                    <th className="p-8 text-right">Aprovação Manual (Escolha o Plano)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-900/30 transition-colors group">
                      <td className="p-8 font-bold text-zinc-300">{u.email}</td>
                      <td className="p-8">
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black italic tracking-widest ${u.approved ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                          {u.approved ? 'ACTIVO' : 'BLOQUEADO'}
                        </span>
                      </td>
                      <td className="p-8 text-zinc-500 text-xs font-bold uppercase">{u.planType || 'Sem Plano'}</td>
                      <td className="p-8 flex justify-end gap-2">
                        {/* 4 OPÇÕES DE PLANO */}
                        <button onClick={() => handleUserAction(u.id, 'approve', 'Básico')} className="bg-zinc-900 hover:bg-zinc-700 p-3 rounded-xl border border-zinc-800 text-[10px] font-bold" title="Plano Básico">BÁSICO</button>
                        <button onClick={() => handleUserAction(u.id, 'approve', 'Padrão')} className="bg-zinc-900 hover:bg-green-700 p-3 rounded-xl border border-zinc-800 text-[10px] font-bold" title="Plano Padrão">PADRÃO</button>
                        <button onClick={() => handleUserAction(u.id, 'approve', 'Premium')} className="bg-zinc-900 hover:bg-red-700 p-3 rounded-xl border border-zinc-800 text-[10px] font-bold text-red-500 hover:text-white" title="Plano Premium">PREMIUM</button>
                        <button onClick={() => handleUserAction(u.id, 'approve', 'Família')} className="bg-zinc-900 hover:bg-indigo-700 p-3 rounded-xl border border-zinc-800 text-[10px] font-bold" title="Plano Família">FAMÍLIA</button>
                        
                        {/* REJEITAR */}
                        <div className="w-[1px] bg-zinc-800 mx-2 h-10 self-center"></div>
                        <button onClick={() => handleUserAction(u.id, 'reject')} className="bg-red-950/20 text-red-600 hover:bg-red-600 hover:text-white p-3 rounded-xl transition-all"><UserMinus size={20}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA: NOVO CONTEÚDO (Mantida) */}
        {activeTab === 'content' && (
          <div className="w-full animate-in slide-in-from-right-6">
            <h2 className="text-4xl font-bold mb-10">Novo Conteúdo Bazar TV</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
              <form onSubmit={handlePublish} className="bg-zinc-950 p-10 rounded-[40px] border border-zinc-900 space-y-8">
                <select className="w-full bg-black border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 font-bold"
                  value={contentForm.category} onChange={e => setContentForm({...contentForm, category: e.target.value})}>
                  <option>Desenhos</option><option>Filmes</option><option>Novelas</option><option>Séries</option>
                </select>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input placeholder="Título" className="bg-black border border-zinc-900 p-5 rounded-2xl outline-none" onChange={e => setContentForm({...contentForm, title: e.target.value})} required/>
                  <input placeholder="Capa URL" className="bg-black border border-zinc-900 p-5 rounded-2xl outline-none" onChange={e => setContentForm({...contentForm, image: e.target.value})} required/>
                </div>
                <textarea placeholder="Sinopse..." rows={4} className="w-full bg-black border border-zinc-800 p-5 rounded-2xl outline-none" onChange={e => setContentForm({...contentForm, description: e.target.value})}></textarea>
                {(contentForm.category === 'Séries' || contentForm.category === 'Novelas') && (
                  <div className="p-8 bg-[#080808] rounded-3xl border border-red-950">
                    <div className="flex gap-4 mb-6">
                      <input placeholder="Nome" value={tempEp.title} className="bg-black border border-zinc-800 p-4 rounded-xl flex-1 outline-none" onChange={e => setTempEp({...tempEp, title: e.target.value})}/>
                      <input placeholder="Link" value={tempEp.url} className="bg-black border border-zinc-800 p-4 rounded-xl flex-1 outline-none" onChange={e => setTempEp({...tempEp, url: e.target.value})}/>
                      <button type="button" onClick={addEpisodeToList} className="bg-white text-black p-4 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Plus/></button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {episodes.map((ep, i) => (
                        <div key={i} className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                          <span className="text-xs uppercase text-zinc-400">{ep.title}</span>
                          <button onClick={() => setEpisodes(episodes.filter((_, idx) => idx !== i))} className="text-zinc-700 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button disabled={loading} className="w-full bg-red-600 p-6 rounded-3xl font-black text-xl hover:bg-red-700 transition-all shadow-red-950/20 uppercase tracking-widest">
                  {loading ? <Loader2 className="animate-spin"/> : "Publicar Conteúdo"}
                </button>
              </form>
              <div className="bg-zinc-950 rounded-[40px] border border-zinc-900 p-12 flex flex-col items-center justify-center text-center">
                 <Sparkles className="text-red-600 mb-6 shadow-red-600" size={60}/>
                 <h3 className="text-3xl font-bold mb-4">Bazar TV Studio AI</h3>
                 <p className="text-zinc-600">Sua central de inteligência para gestão de entretenimento.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}