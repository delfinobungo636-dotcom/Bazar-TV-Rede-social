import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, AlertTriangle, CheckCircle, XCircle, Calendar, Clock, RefreshCw } from 'lucide-react';
import { db } from '../../../shared/services/firebase';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

interface User {
  id: string;
  email: string;
  plan?: string;
  status?: string; // Captura o status geral
  subscriptionStatus?: 'active' | 'expired' | 'canceled' | 'waiting_payment' | 'pending';
  subscriptionEnds?: any;
  createdAt?: any;
}

const Subscriptions = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'risk'>('all');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
      const subscribers = data.filter(u => u.subscriptionStatus === 'active' || u.subscriptionStatus === 'expired' || u.subscriptionStatus === 'canceled' || u.status === 'expired');
      setUsers(subscribers);
    });
    return () => unsubscribe();
  }, []);

  const logSystemAction = async (type: 'success' | 'warning' | 'error', message: string) => {
    try { await addDoc(collection(db, 'system_logs'), { type, message, timestamp: serverTimestamp(), origin: 'Sub_Manager' }); } catch (e) {}
  };

  const getDaysLeft = (endDate: any) => {
    if (!endDate) return 0;
    const end = endDate.toDate ? endDate.toDate() : new Date(endDate);
    const diffTime = end.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? 0 : diffDays;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '--/--/----';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleCancel = async (user: User) => {
    if (!window.confirm("Cortar Acesso imediatamente?")) return;
    try {
      await updateDoc(doc(db, 'users', user.id), { subscriptionStatus: 'canceled', status: 'canceled', subscriptionEnds: new Date() });
      await logSystemAction('warning', `Assinatura Cancelada MANUALMENTE: ${user.email}`);
    } catch (error) { alert("Erro ao cancelar."); }
  };

  const handleExtend = async (user: User) => {
    if (!window.confirm(`Adicionar 30 dias de Bónus para ${user.email}?`)) return;
    try {
      const currentEnd = user.subscriptionEnds?.toDate ? user.subscriptionEnds.toDate() : new Date();
      const baseDate = currentEnd > new Date() ? currentEnd : new Date();
      const newEnd = new Date(baseDate);
      newEnd.setDate(newEnd.getDate() + 30);

      await updateDoc(doc(db, 'users', user.id), { subscriptionStatus: 'active', status: 'active', subscriptionEnds: newEnd, plan: user.plan || 'mobile' });
      await logSystemAction('success', `Bónus de 30 Dias aplicado a: ${user.email}`);
    } catch (error) { alert("Erro ao renovar."); }
  };

  const { filtered, activeCount, riskCount } = useMemo(() => {
    let filtered = users.filter(u => (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Agora consideramos a indicação do servidor (status === 'expired')
    if (filterMode === 'active') filtered = filtered.filter(u => u.subscriptionStatus === 'active' && u.status !== 'expired' && getDaysLeft(u.subscriptionEnds) > 0);
    if (filterMode === 'risk') filtered = filtered.filter(u => u.subscriptionStatus === 'active' && u.status !== 'expired' && getDaysLeft(u.subscriptionEnds) <= 5 && getDaysLeft(u.subscriptionEnds) > 0);

    let activeCount = 0;
    let riskCount = 0;

    users.forEach(u => {
      const days = getDaysLeft(u.subscriptionEnds);
      if (u.subscriptionStatus === 'active' && u.status !== 'expired' && days > 0) {
        activeCount++;
        if (days <= 5) riskCount++;
      }
    });

    return { filtered, activeCount, riskCount };
  }, [users, searchTerm, filterMode]);

  return (
    <div className="p-4 md:p-8 bg-[#050505] min-h-screen text-zinc-200 w-full selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 border-b border-zinc-900 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/50 shadow-[0_0_25px_rgba(37,99,235,0.2)]">
              <Calendar size={24} className="text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter text-white">SUBSCRIPTION <span className="text-blue-500">ENGINE</span></h1>
              <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mt-1">Monitor de Prazos v6.0</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/20 p-6 rounded-[2rem] border border-zinc-800 flex justify-between items-center shadow-lg">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Clientes Ativos</p>
              <p className="text-4xl font-black text-white tracking-tighter">{activeCount}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20"><CheckCircle className="text-blue-500"/></div>
          </div>
          <div className="bg-zinc-900/20 p-6 rounded-[2rem] border border-yellow-500/30 flex justify-between items-center shadow-lg">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-500/70 mb-1">A Expirar (&lt;5 Dias)</p>
              <p className="text-4xl font-black text-white tracking-tighter">{riskCount}</p>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20"><Clock className="text-yellow-500"/></div>
          </div>
          <div className="bg-zinc-900/20 p-6 rounded-[2rem] border border-zinc-800 flex justify-between items-center shadow-lg">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Total Histórico</p>
              <p className="text-4xl font-black text-white tracking-tighter">{users.length}</p>
            </div>
            <div className="p-3 bg-zinc-800 rounded-2xl border border-zinc-700"><Users className="text-zinc-400"/></div>
          </div>
        </div>

        <div className="bg-black border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl mt-8">
          <div className="p-6 border-b border-zinc-800 flex flex-col xl:flex-row justify-between gap-4 bg-zinc-900/40 items-center">
            
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              <button onClick={() => setFilterMode('all')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterMode === 'all' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Todos</button>
              <button onClick={() => setFilterMode('active')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterMode === 'active' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}>Ativos</button>
              <button onClick={() => setFilterMode('risk')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterMode === 'risk' ? 'bg-yellow-600 text-white' : 'text-zinc-500'}`}>Em Risco</button>
            </div>

            <div className="relative w-full xl:w-80">
              <Search className="absolute left-4 top-3.5 text-zinc-500" size={16} />
              <input 
                type="text" placeholder="Filtrar email..." 
                className="w-full bg-black border border-zinc-800 text-white pl-11 pr-4 py-3 rounded-xl text-xs focus:border-blue-500 outline-none transition-all font-mono"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-900/80 text-zinc-500 text-[10px] uppercase font-black tracking-widest border-b border-zinc-800">
                <tr>
                  <th className="p-5">Conta / Plano</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 text-center">Prazo Restante</th>
                  <th className="p-5 text-center">Data de Corte</th>
                  <th className="p-5 text-right">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {filtered.map(user => {
                  const daysLeft = getDaysLeft(user.subscriptionEnds);
                  // Verifica as duas flags de segurança (Frontend Math + Backend Status)
                  const isActive = user.subscriptionStatus === 'active' && user.status !== 'expired' && daysLeft > 0;
                  const isWarning = isActive && daysLeft <= 5;

                  return (
                    <tr key={user.id} className="hover:bg-zinc-900/30 transition-colors group">
                      <td className="p-5">
                        <div className="font-bold text-white text-xs tracking-tight mb-1">{user.email}</div>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {user.plan || 'Indefinido'}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        {isActive ? (
                          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border flex items-center justify-center gap-1 w-max mx-auto ${isWarning ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}`}>
                            {isWarning ? <AlertTriangle size={12}/> : <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/>}
                            {isWarning ? 'Risco' : 'Live'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border bg-red-500/10 text-red-500 border-red-500/30 flex items-center justify-center gap-1 w-max mx-auto">
                            <XCircle size={12}/> Expirado
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        {isActive ? (
                          <span className={`font-mono font-black text-lg ${isWarning ? 'text-yellow-500' : 'text-zinc-200'}`}>
                            {daysLeft} <span className="text-[10px] text-zinc-500 font-sans">dias</span>
                          </span>
                        ) : <span className="font-mono text-zinc-600 font-bold">0</span>}
                      </td>
                      <td className="p-5 text-center font-mono text-[10px] text-zinc-400">
                        {formatDate(user.subscriptionEnds)}
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex justify-end gap-2 opacity-100 xl:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleExtend(user)} title="+30 Dias" className="p-2 bg-zinc-800 hover:bg-blue-600/20 text-zinc-400 hover:text-blue-500 rounded-xl border border-zinc-700 transition-all"><RefreshCw size={14} /></button>
                          {isActive && <button onClick={() => handleCancel(user)} title="Cortar Sinal" className="p-2 bg-zinc-800 hover:bg-red-900/20 text-zinc-400 hover:text-red-500 rounded-xl border border-zinc-700 transition-all"><XCircle size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;