import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Check, X, Calendar, Search, Smartphone, Tv, Monitor, Users, Zap, FileText, RotateCcw, AlertCircle, ShieldCheck, Activity, RefreshCw } from 'lucide-react';
import { db } from '../../../shared/services/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';

interface Payment {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  plan: string;
  status: 'pending' | 'approved' | 'rejected';
  reference?: string;
  proofUrl?: string;
  createdAt: any;
  approvedAt?: any;
}

const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 🚀 ENGINE DE SINCRONIZAÇÃO
  useEffect(() => {
    const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[];
      setPayments(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 🚀 FUNÇÃO PARA ENVIAR LOGS PARA A TELEMETRIA (V6)
  const logSystemAction = async (type: 'success' | 'warning' | 'error', message: string) => {
    try {
      await addDoc(collection(db, 'system_logs'), {
        type, message, timestamp: serverTimestamp(), origin: 'Payments_Node'
      });
    } catch (e) { console.error("Erro ao gravar log:", e); }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '--/--/----';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
  };

  // 🚀 APROVAR PAGAMENTO (Convergência com Subscrições)
  const handleApprove = async (payment: Payment) => {
    if (!window.confirm(`Confirmar entrada de ${Number(payment.amount).toLocaleString()} Kz e ativar plano ${payment.plan}?`)) return;
    try {
      const approvalDate = new Date();
      // 1. Atualiza o Pagamento
      await updateDoc(doc(db, 'payments', payment.id), { status: 'approved', approvedAt: approvalDate });
      
      // 2. Calcula 30 dias e Atualiza o Cliente (Ativa o Sinal)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      await updateDoc(doc(db, 'users', payment.userId), {
        plan: (payment.plan || '').toLowerCase(),
        subscriptionStatus: 'active', 
        subscriptionEnds: expiryDate 
      });

      // 3. Dispara Log para a Telemetria
      await logSystemAction('success', `Pagamento Aprovado: ${payment.userEmail} (${payment.plan}) - ${payment.amount} Kz`);
      alert(`Sucesso! Cliente ativado.`);
    } catch (error) {
      await logSystemAction('error', `Falha ao aprovar pagamento de ${payment.userEmail}`);
    }
  };

  // 🚀 ANULAR PAGAMENTO (Corta o Sinal)
  const handleUndo = async (payment: Payment) => {
    if (!window.confirm(`Anular aprovação de ${payment.userEmail}? O cliente perderá acesso aos filmes.`)) return;
    try {
      await updateDoc(doc(db, 'payments', payment.id), { status: 'pending', approvedAt: null });
      await updateDoc(doc(db, 'users', payment.userId), { plan: 'nenhum', subscriptionStatus: 'waiting_payment', subscriptionEnds: null });
      await logSystemAction('warning', `Aprovação Anulada: ${payment.userEmail}. Acesso bloqueado.`);
    } catch (error) { console.error(error); }
  };

  const handleReject = async (payment: Payment) => {
    if (!window.confirm('Rejeitar este pagamento?')) return;
    await updateDoc(doc(db, 'payments', payment.id), { status: 'rejected' });
    await logSystemAction('error', `Pagamento Rejeitado: ${payment.userEmail}`);
  };

  // 🚀 MATEMÁTICA FINANCEIRA VIVA
  const stats = useMemo(() => {
    const approved = payments.filter(p => p.status === 'approved');
    const pending = payments.filter(p => p.status === 'pending');
    
    return {
      totalApproved: approved.reduce((acc, curr) => acc + Number(curr.amount), 0),
      totalPending: pending.reduce((acc, curr) => acc + Number(curr.amount), 0),
      countMobile: approved.filter(p => (p.plan || '').toLowerCase().includes('mobile')).length,
      countStandard: approved.filter(p => (p.plan || '').toLowerCase().includes('standard')).length,
      countPremium: approved.filter(p => (p.plan || '').toLowerCase().includes('premium')).length,
      countFamilia: approved.filter(p => (p.plan || '').toLowerCase().includes('familia')).length,
    };
  }, [payments]);

  const filteredPayments = payments.filter(p => (p.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 md:p-8 bg-[#050505] min-h-screen text-zinc-200 w-full selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 border-b border-zinc-900 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center border border-green-500/50 shadow-[0_0_25px_rgba(34,197,94,0.2)]">
              <DollarSign size={24} className="text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter text-white">FINANCE <span className="text-green-500">GATEWAY</span></h1>
              <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest mt-1">Gestão de Caixa v6.0</p>
            </div>
          </div>
          <div className="bg-zinc-900/30 p-3 rounded-2xl border border-zinc-800 flex items-center gap-3">
            <ShieldCheck size={16} className="text-green-500"/>
            <span className="text-[10px] font-bold uppercase text-zinc-400">Transações Encriptadas</span>
          </div>
        </header>

        {/* CARDS DE TOTAIS FINANCEIROS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/20 p-8 rounded-[2rem] border border-green-500/30 relative overflow-hidden shadow-lg group">
            <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 relative z-10">Total Faturado (Aprovado)</p>
            <p className="text-4xl font-black text-white tracking-tighter relative z-10">{stats.totalApproved.toLocaleString()} <span className="text-green-500 text-xl">Kz</span></p>
          </div>
          
          <div className="bg-zinc-900/20 p-8 rounded-[2rem] border border-yellow-500/30 relative overflow-hidden shadow-lg group">
            <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 relative z-10">Caixa Pendente (A Aguardar)</p>
            <p className="text-4xl font-black text-white tracking-tighter relative z-10">{stats.totalPending.toLocaleString()} <span className="text-yellow-500 text-xl">Kz</span></p>
          </div>

          <div className="bg-zinc-900/20 p-8 rounded-[2rem] border border-zinc-800 relative overflow-hidden shadow-lg flex items-center justify-between">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Volume de Vendas</p>
              <p className="text-4xl font-black text-white tracking-tighter">{payments.filter(p => p.status === 'approved').length}</p>
              <p className="text-[10px] text-zinc-500 mt-1 font-bold">Assinaturas Validadas</p>
            </div>
            <Activity size={48} className="text-zinc-800 relative z-10" />
          </div>
        </div>

        {/* DESEMPENHO POR PLANOS */}
        <div className="pt-4">
          <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-zinc-400">
            <Zap size={16} className="text-blue-500"/> Distribuição de Ativos por Plano
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <PlanStatCard icon={<Smartphone size={16}/>} title="Mobile" count={stats.countMobile} color="blue" />
            <PlanStatCard icon={<Monitor size={16}/>} title="Standard" count={stats.countStandard} color="emerald" />
            <PlanStatCard icon={<Tv size={16}/>} title="Premium" count={stats.countPremium} color="purple" />
            <PlanStatCard icon={<Users size={16}/>} title="Família" count={stats.countFamilia} color="orange" />
          </div>
        </div>

        {/* TABELA DE TRANSAÇÕES */}
        <div className="bg-black border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl mt-8">
          <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-900/40">
            <h3 className="font-bold text-zinc-300 text-sm uppercase tracking-widest">Auditoria de Caixa</h3>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-3.5 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Pesquisar cliente..." 
                className="w-full bg-black border border-zinc-800 text-white pl-11 pr-4 py-3 rounded-xl text-xs focus:border-green-500 outline-none transition-all font-mono shadow-inner"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-900/80 text-zinc-500 text-[10px] uppercase font-black tracking-widest border-b border-zinc-800">
                <tr>
                  <th className="p-5">Cliente</th>
                  <th className="p-5">Pacote & Valor</th>
                  <th className="p-5">Timestamp</th>
                  <th className="p-5 text-center">Comprovativo</th>
                  <th className="p-5 text-right">Ação / Decisão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50">
                {loading ? (
                  <tr><td colSpan={5} className="p-10 text-center"><RefreshCw className="animate-spin mx-auto text-zinc-600" /></td></tr>
                ) : filteredPayments.map(payment => (
                  <tr key={payment.id} className="hover:bg-zinc-900/30 transition-colors group">
                    <td className="p-5">
                      <div className="font-bold text-white text-xs tracking-tight">{payment.userEmail}</div>
                      <div className="text-[9px] text-zinc-600 font-mono mt-1">ID: {payment.id.slice(0,8)}...</div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="font-black text-zinc-400 uppercase text-[10px] tracking-widest mb-1">{payment.plan}</span>
                        <span className="text-green-400 font-bold font-mono text-sm">{Number(payment.amount).toLocaleString()} Kz</span>
                      </div>
                    </td>
                    <td className="p-5 text-[10px] font-mono text-zinc-400">
                      <div className="flex items-center gap-2"><Calendar size={12} className="text-zinc-600"/> {formatDate(payment.createdAt)}</div>
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex flex-col items-center gap-2">
                        {payment.reference ? (
                          <span className="font-mono text-[10px] text-zinc-300 bg-zinc-800 px-2 py-1 rounded">REF: {payment.reference}</span>
                        ) : <span className="text-[10px] text-zinc-600 italic">Sem REF</span>}
                        
                        {payment.proofUrl && (
                          <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1">
                            <FileText size={12}/> Abrir Recibo
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-2">
                        {payment.status === 'pending' ? (
                          <>
                            <button onClick={() => handleApprove(payment)} className="bg-green-600/20 hover:bg-green-600 text-green-500 hover:text-white border border-green-500/50 p-2.5 rounded-xl transition-all" title="Aprovar e Ativar Sinal">
                              <Check size={16} />
                            </button>
                            <button onClick={() => handleReject(payment)} className="bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-900/50 p-2.5 rounded-xl transition-all" title="Rejeitar Fraude">
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${payment.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
                              {payment.status === 'approved' ? 'APROVADO' : 'REJEITADO'}
                            </span>
                            {payment.status === 'approved' && (
                              <button onClick={() => handleUndo(payment)} title="Anular Aprovação" className="text-zinc-600 hover:text-yellow-500 p-1 transition-colors">
                                <RotateCcw size={14} />
                              </button>
                            )}
                          </div>
                        )}
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
};

// COMPONENTE ATÓMICO PARA O DESIGN
const PlanStatCard = ({ icon, title, count, color }: any) => {
  const colors: Record<string, string> = {
    blue: 'text-blue-500 border-blue-500/30 bg-blue-500/5',
    emerald: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5',
    purple: 'text-purple0-500 border-purple-500/30 bg-purple-500/5',
    orange: 'text-orange-500 border-orange-500/30 bg-orange-500/5',
  };
  return (
    <div className={`p-4 rounded-2xl border ${colors[color]} flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        <div className="opacity-70">{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</span>
      </div>
      <span className="text-xl font-black">{count}</span>
    </div>
  );
};

export default Payments;