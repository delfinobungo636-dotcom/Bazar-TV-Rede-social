import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ShieldAlert, Users, Search, Shield, Trash2, Key, Activity } from 'lucide-react';
import { db } from '../../../shared/services/firebase';

interface UserData {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  plan?: string;
  status?: string;
  profileImage?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 🚀 ENGINE DE TEMPO REAL
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserData[];
      setUsers(usersList);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 🚀 TELEMETRIA LOGGER
  const logSystemAction = async (type: 'success' | 'warning' | 'error' | 'gateway', message: string) => {
    try { await addDoc(collection(db, 'system_logs'), { type, message, timestamp: serverTimestamp(), origin: 'Auth_Master' }); } catch (e) {}
  };

  // 🚀 AÇÕES COM GATILHOS DE SEGURANÇA
  const handleApproveUser = async (userId: string, email: string) => {
    if (window.confirm("FORÇAR APROVAÇÃO: Ativar conta sem passar pelo caixa?")) {
      try {
        await updateDoc(doc(db, "users", userId), { status: 'active', plan: 'mobile' });
        await logSystemAction('gateway', `Forced Override: Conta ${email} ativada manualmente pelo Admin.`);
      } catch (error) { alert("Erro ao aprovar."); }
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string, email: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (window.confirm(`SEGURANÇA: Mudar o cargo de ${email} para ${newRole.toUpperCase()}?`)) {
      try {
        await updateDoc(doc(db, "users", userId), { role: newRole });
        await logSystemAction('warning', `Security Clearance alterado: ${email} agora é ${newRole.toUpperCase()}`);
      } catch (error) { console.error(error); }
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (window.confirm(`OPERAÇÃO DESTRUTIVA: Eliminar permanentemente ${email} da base de dados?`)) {
      try {
        await deleteDoc(doc(db, "users", userId));
        await logSystemAction('error', `Data Purge: Utilizador ${email} apagado da DB.`);
      } catch (error) { console.error(error); }
    }
  };

  const filteredUsers = users.filter(user => {
    const emailMatch = (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const nameMatch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return emailMatch || nameMatch;
  });

  return (
    <div className="p-4 md:p-8 bg-[#050505] min-h-screen text-zinc-200 w-full selection:bg-red-500/30">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 border-b border-zinc-900 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600/10 rounded-xl flex items-center justify-center border border-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.15)]">
              <ShieldAlert size={24} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter text-white">SECURITY <span className="text-red-500">MASTER</span></h1>
              <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mt-1">Gestão de Credenciais v6.0</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900/20 p-6 rounded-[2rem] border border-zinc-800 flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">População Global</p>
              <p className="text-4xl font-black text-white tracking-tighter">{users.length}</p>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-2xl border border-zinc-700"><Users className="text-zinc-400"/></div>
          </div>
          <div className="bg-zinc-900/20 p-6 rounded-[2rem] border border-red-500/20 flex justify-between items-center shadow-[0_0_30px_rgba(239,68,68,0.05)]">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400/80 mb-1">Staff / Admins</p>
              <p className="text-4xl font-black text-red-500 tracking-tighter">{users.filter(u => u.role === 'admin').length}</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20"><Key className="text-red-500"/></div>
          </div>
        </div>

        <div className="bg-black border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-zinc-800 bg-zinc-900/40 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-zinc-300 text-sm uppercase tracking-widest">Controlo de Identidade</h3>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-3.5 text-zinc-500" size={16} />
              <input 
                type="text" placeholder="Procurar registo..." 
                className="w-full bg-black border border-zinc-800 text-white pl-11 pr-4 py-3 rounded-xl text-xs focus:border-red-500 outline-none transition-all font-mono shadow-inner"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-zinc-900/80 text-[10px] uppercase font-black text-zinc-500 tracking-widest border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-5">Biometria / Utilizador</th>
                  <th className="px-6 py-5 text-center">Clearance (Cargo)</th>
                  <th className="px-6 py-5 text-center">Status Interno</th>
                  <th className="px-6 py-5 text-right">Overrides (Ações)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {loading ? (
                  <tr><td colSpan={4} className="p-10 text-center"><Activity className="animate-pulse mx-auto text-red-900" size={32}/></td></tr>
                ) : filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-900/30 transition-colors group">
                    <td className="px-6 py-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold border border-zinc-700 shrink-0">
                        {u.profileImage ? <img src={u.profileImage} className="w-full h-full object-cover rounded-full" alt="perfil"/> : (u.name || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-xs tracking-tight">{u.name || "Sem Nome Registado"}</span>
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{u.email}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md border ${u.role === 'admin' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                        {u.role === 'admin' ? 'ADMINISTRATOR' : 'MEMBER'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {(u.status === 'waiting_payment' || u.status === 'pending') ? (
                        <span className="text-[9px] text-yellow-500 font-bold uppercase tracking-widest bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">Locked</span>
                      ) : (
                        <span className="text-[9px] text-green-500 font-bold uppercase tracking-widest bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">Active</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-100 xl:opacity-0 group-hover:opacity-100 transition-opacity">
                        {(u.status === 'waiting_payment' || u.status === 'pending') && (
                          <button onClick={() => handleApproveUser(u.id, u.email || '')} title="Forçar Aprovação" className="p-2 bg-zinc-900 hover:bg-green-600/20 text-zinc-500 hover:text-green-500 rounded-xl border border-zinc-800 transition-all">
                            <Shield size={16} />
                          </button>
                        )}
                        <button onClick={() => handleToggleRole(u.id, u.role || 'user', u.email || '')} title="Promover/Despromover" className="p-2 bg-zinc-900 hover:bg-purple-600/20 text-zinc-500 hover:text-purple-400 rounded-xl border border-zinc-800 transition-all">
                          <Key size={16} />
                        </button>
                        <button onClick={() => handleDeleteUser(u.id, u.email || '')} title="Eliminar (Purge)" className="p-2 bg-zinc-900 hover:bg-red-900/20 text-zinc-500 hover:text-red-500 rounded-xl border border-zinc-800 transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}