import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Users, Activity, Database, AlertTriangle, 
  Zap, ShieldCheck, Globe, Trash2, Power,
  Settings, Layers, Wifi, RefreshCcw, Terminal, AlertOctagon, WifiOff,
  Search, ShieldAlert, Clock
} from 'lucide-react';

// FIREBASE CORE
import { db } from '../../../shared/services/firebase';
import { 
  collection, 
  query, 
  limit, 
  onSnapshot, 
  getCountFromServer, 
  getDocs,
  doc,
  deleteDoc
} from 'firebase/firestore';

// ENGINE DE VISUALIZAÇÃO
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

interface InfraMetrics {
  totalUsers: number;
  activeSessions: number;
  totalContent: number;
  systemHealth: number;
  realBandwidth: number; 
  lastSync: Date;
}

interface SessionData {
  id: string;
  title: string;
  resolution: string;
  bandwidth: number;
  timestamp: Date;
  userId?: string;
}

const AdminDashboardV7 = () => {
  const [isLive, setIsLive] = useState(true);
  const [metrics, setMetrics] = useState<InfraMetrics>({
    totalUsers: 0,
    activeSessions: 0,
    totalContent: 0,
    systemHealth: 100,
    realBandwidth: 0,
    lastSync: new Date()
  });

  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);
  const [activeSessionsList, setActiveSessionsList] = useState<SessionData[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [nodeStatus, setNodeStatus] = useState<'stable' | 'warning' | 'critical'>('stable');
  const [isKilling, setIsKilling] = useState<string | null>(null);

  // SENSORES DE FLUXO (REFS para evitar lag no DOM)
  const activeSessionsRef = useRef(0);
  const currentBandwidthRef = useRef(0); 
  const [dbLatency, setDbLatency] = useState(0);
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine ? 'Conectado' : 'Offline');
  const [region, setRegion] = useState('A detetar...');
  
  const isSSL = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

  // 1. FUNÇÃO DE REGISTO NO TERMINAL (LOGS INTERNOS)
  const addSystemLog = useCallback((type: 'INFO' | 'ERROR' | 'WARN' | 'ACTION', message: string) => {
    setRecentLogs(prev => {
      const newLog = { id: Math.random().toString(36), type, message, time: new Date() };
      return [newLog, ...prev].slice(0, 50); // Mantém apenas os últimos 50 logs na memória
    });
  }, []);

  // 2. SINCRONIZAÇÃO GLOBAL DE MÉTRICAS BASE
  const syncGlobalCounts = useCallback(async () => {
    try {
      addSystemLog('INFO', 'A sincronizar agregadores globais do Firestore...');
      const [userSnapshot, movieSnapshot] = await Promise.all([
        getCountFromServer(collection(db, "users")),
        getCountFromServer(collection(db, "movies"))
      ]);

      setMetrics(prev => ({
        ...prev,
        totalUsers: userSnapshot.data().count,
        totalContent: movieSnapshot.data().count,
        lastSync: new Date()
      }));
      addSystemLog('INFO', 'Agregadores atualizados com sucesso.');
    } catch (error: any) {
      addSystemLog('ERROR', `Falha na sincronização global: ${error.message}`);
    }
  }, [addSystemLog]);

  // 3. PING DE LATÊNCIA (HEARTBEAT)
  const pingFirebase = useCallback(async () => {
    if (!isLive) return;
    const start = performance.now();
    try {
      await getDocs(query(collection(db, "active_sessions"), limit(1)));
      const end = performance.now();
      setDbLatency(Math.round(end - start));
    } catch (e: any) {
      setDbLatency(999);
      setNodeStatus('critical');
      addSystemLog('ERROR', `Falha de Ping no Gateway: ${e.message}`);
    }
  }, [isLive, addSystemLog]);

  // 4. SENSORES DE REDE FÍSICA
  useEffect(() => {
    setRegion(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Desconhecida');
    const handleOnline = () => { setNetworkStatus('Conectado'); addSystemLog('INFO', 'Conexão restabelecida com a rede física.'); };
    const handleOffline = () => { setNetworkStatus('Offline'); setNodeStatus('critical'); addSystemLog('ERROR', 'Perda total de conexão com a Internet.'); };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [addSystemLog]);

  // 5. MOTOR DE LEITURA À PROVA DE FALHAS (A Cura para a "Cegueira")
  useEffect(() => {
    if (!isLive) return;

    const qSessions = query(collection(db, "active_sessions"), limit(100));
    addSystemLog('INFO', 'A iniciar stream contínuo da coleção "active_sessions"...');

    const unsubscribeSessions = onSnapshot(qSessions, (snapshot) => {
      const currentActive = snapshot.size;
      activeSessionsRef.current = currentActive;

      let totalCalculatedBandwidth = 0;
      let parsedSessions: SessionData[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        let sessionBandwidth = 0.2; 

        if (data.resolution) {
          const res = String(data.resolution).toLowerCase();
          if (res === '4k') sessionBandwidth = 2.5;
          else if (res === '1080p') sessionBandwidth = 0.6;
          else if (res === '720p') sessionBandwidth = 0.3;
          else if (res === '480p' || res === 'sd') sessionBandwidth = 0.15;
        } else if (data.bandwidthUsage) {
          sessionBandwidth = Number(data.bandwidthUsage);
        } else {
          sessionBandwidth = 0.6; 
        }

        totalCalculatedBandwidth += sessionBandwidth;

        parsedSessions.push({
          id: doc.id,
          title: data.title || 'Sessão Anónima (Catálogo)',
          resolution: data.resolution || 'Auto (HD)',
          bandwidth: sessionBandwidth,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
          userId: data.userId
        });
      });

      parsedSessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      if (currentActive === 0) totalCalculatedBandwidth = 0;

      currentBandwidthRef.current = totalCalculatedBandwidth;
      setActiveSessionsList(parsedSessions);
      setMetrics(prev => ({ 
        ...prev, 
        activeSessions: currentActive,
        realBandwidth: totalCalculatedBandwidth 
      }));

    }, (error) => {
      console.error("Erro crítico no Stream:", error);
      addSystemLog('ERROR', `A escuta de sessões falhou. Motivo: ${error.message}`);
      setNodeStatus('critical');
    });

    const countInterval = setInterval(syncGlobalCounts, 60000);
    const pingInterval = setInterval(pingFirebase, 15000);

    syncGlobalCounts();
    pingFirebase();

    return () => {
      unsubscribeSessions();
      clearInterval(countInterval);
      clearInterval(pingInterval);
      addSystemLog('WARN', 'Stream de dados pausado pelo operador.');
    };
  }, [isLive, syncGlobalCounts, pingFirebase, addSystemLog]);

  // 6. TICKER FLUIDO DO GRÁFICO (Desacoplado do DOM)
  useEffect(() => {
    const ticker = setInterval(() => {
      if (!isLive) return;
      
      const currentActive = activeSessionsRef.current;
      const actualTraffic = currentBandwidthRef.current; 

      const microVariance = currentActive > 0 ? (Math.random() * 0.08 - 0.04) : 0;
      const finalGraphValue = Math.max(0, actualTraffic + microVariance);

      setPerformanceHistory(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          load: Number(finalGraphValue.toFixed(2)), 
          active: currentActive
        };
        return [...prev.slice(-19), newPoint];
      });

      if (networkStatus === 'Offline' || dbLatency > 1500) setNodeStatus('critical');
      else if (dbLatency > 800) setNodeStatus('warning');
      else setNodeStatus('stable');

    }, 2000);

    return () => clearInterval(ticker);
  }, [isLive, dbLatency, networkStatus]);

  // 7. AÇÃO ADMINISTRATIVA: MATAR SESSÃO MANUALMENTE
  const handleKillSession = async (sessionId: string, userName: string) => {
    if (!window.confirm(`ATENÇÃO: Tem a certeza que deseja derrubar a sessão ativa de "${userName}"?`)) return;
    
    setIsKilling(sessionId);
    addSystemLog('ACTION', `Iniciando protocolo de expulsão para o ecrã ID: ${sessionId}...`);
    try {
      await deleteDoc(doc(db, "active_sessions", sessionId));
      addSystemLog('INFO', `Sessão ${sessionId} foi liquidada com sucesso.`);
    } catch (error: any) {
      addSystemLog('ERROR', `Falha ao tentar liquidar sessão: ${error.message}`);
    } finally {
      setIsKilling(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans p-4 lg:p-8 selection:bg-blue-500/30 flex flex-col gap-8 w-full max-w-[100vw] overflow-x-hidden">
      
      {/* HEADER ESTRUTURAL */}
      <nav className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-900 pb-6 w-full">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.2)] ${nodeStatus === 'critical' ? 'bg-red-600 animate-pulse' : nodeStatus === 'warning' ? 'bg-yellow-500' : 'bg-blue-600'}`}>
            <ShieldAlert size={24} fill="white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter truncate">BAZAR <span className="text-zinc-500">CONTROL</span></h1>
            <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-widest truncate">Enterprise Command Center v7.0</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-zinc-900/40 p-2.5 rounded-2xl border border-zinc-800/50 backdrop-blur-md w-full md:w-auto overflow-x-auto">
          <button 
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap ${isLive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            {isLive ? <RefreshCcw size={16} className="animate-spin-slow" /> : <Power size={16} />}
            {isLive ? 'SISTEMA ONLINE' : 'SISTEMA PAUSADO'}
          </button>
          <div className="h-10 w-[1px] bg-zinc-800 mx-2 shrink-0" />
          <div className="px-4 text-right shrink-0">
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Última Sincronização</p>
            <p className="text-xs font-mono font-bold text-blue-400">{metrics.lastSync.toLocaleTimeString()}</p>
          </div>
        </div>
      </nav>

      {/* MÉTRICAS GLOBAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        <MetricCard icon={<Users size={20}/>} title="Utilizadores Registados" value={metrics.totalUsers.toLocaleString()} detail="Contas criadas na BD" color="#3b82f6" />
        <MetricCard icon={<Activity size={20}/>} title="Sessões Concorrentes" value={metrics.activeSessions.toLocaleString()} detail="Espectadores neste momento" color="#a855f7" pulse={isLive && metrics.activeSessions > 0} />
        <MetricCard icon={<Database size={20}/>} title="Títulos no Catálogo" value={metrics.totalContent.toLocaleString()} detail="Capacidade de entrega" color="#10b981" />
        <MetricCard icon={<Wifi size={20}/>} title="Tráfego Estimado" value={`${metrics.realBandwidth.toFixed(2)} MB/s`} detail="Cálculo agregado de saída" color={nodeStatus === 'critical' ? '#ef4444' : '#f59e0b'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 w-full">
        
        {/* COLUNA ESQUERDA: GRÁFICO E TERMINAL */}
        <div className="xl:col-span-2 flex flex-col gap-8 w-full min-w-0">
          
          {/* O GRÁFICO PULSANTE */}
          <div className="bg-zinc-900/20 border border-zinc-800 p-4 sm:p-8 rounded-[2.5rem] relative overflow-hidden h-[450px] flex flex-col w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400">Monitor de Tráfego</h3>
              </div>
              <div className="flex items-center gap-4 sm:gap-6">
                <span className="flex items-center gap-2 text-[10px] font-black tracking-widest text-blue-500 uppercase"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" /> Tráfego (MB/s)</span>
                <span className="flex items-center gap-2 text-[10px] font-black tracking-widest text-purple-500 uppercase"><div className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Sessões Ativas</span>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceHistory}>
                  <defs>
                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                  <XAxis dataKey="time" stroke="#555" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#555" fontSize={10} axisLine={false} tickLine={false} dx={-10} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px', color: '#fff' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  <Area isAnimationActive={false} type="monotone" dataKey="load" stroke="#3b82f6" strokeWidth={3} fill="url(#colorLoad)" />
                  <Area isAnimationActive={false} type="step" dataKey="active" stroke="#a855f7" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* O TERMINAL DE LOGS */}
          <div className="bg-[#050505] border border-zinc-800 p-6 rounded-[2.5rem] shadow-inner h-[300px] flex flex-col relative overflow-hidden w-full">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-zinc-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Terminal do Sistema</h3>
              </div>
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-4 font-mono text-[11px] space-y-2 custom-scrollbar">
              {recentLogs.length > 0 ? recentLogs.map((log) => (
                <div key={log.id} className="flex flex-col sm:flex-row gap-2 sm:gap-4 border-b border-zinc-900/50 pb-2 hover:bg-zinc-900/40 p-1.5 rounded transition-colors break-words">
                  <span className="text-zinc-600 shrink-0">[{log.time.toLocaleTimeString()}]</span>
                  <span className={`shrink-0 font-bold ${log.type === 'ERROR' ? 'text-red-500' : log.type === 'WARN' ? 'text-yellow-500' : log.type === 'ACTION' ? 'text-purple-400' : 'text-blue-400'}`}>[{log.type}]</span>
                  <span className={log.type === 'ERROR' ? 'text-red-300' : 'text-zinc-400'}>{log.message}</span>
                </div>
              )) : (
                <div className="text-zinc-700 italic flex items-center justify-center h-full">Nenhum evento registado no motor.</div>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: SESSÕES E DIAGNÓSTICO */}
        <div className="xl:col-span-1 flex flex-col gap-8 w-full min-w-0">
          
          {/* TABELA DE CONTROLO DE SESSÕES (KILL SWITCH) */}
          <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-[2.5rem] flex-1 flex flex-col h-[450px] w-full">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                  <Search size={16} className="text-blue-500 shrink-0"/> Inspeção de Telas
                </h3>
                <span className="bg-blue-600/20 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full border border-blue-600/30 shrink-0">
                  {metrics.activeSessions} ONLINE
                </span>
             </div>

             <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {activeSessionsList.length > 0 ? activeSessionsList.map((session) => (
                  <div key={session.id} className="bg-black/50 border border-zinc-800 p-4 rounded-2xl relative group hover:border-zinc-600 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] font-mono text-zinc-500 uppercase truncate pr-2">
                        ID: {session.userId ? session.userId.slice(0, 8) : 'ANONIMO'}***
                      </p>
                      <button 
                        onClick={() => handleKillSession(session.id, session.title)}
                        disabled={isKilling === session.id}
                        className="text-zinc-600 hover:text-red-500 transition-colors p-1 shrink-0"
                        title="Derrubar Ecrã Imediatamente"
                      >
                        {isKilling === session.id ? <RefreshCcw size={14} className="animate-spin text-red-500" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1 truncate" title={session.title}>{session.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest mt-3">
                      <span className="text-blue-400 bg-blue-400/10 px-2 py-1 rounded">{session.resolution}</span>
                      <span className="text-purple-400 bg-purple-400/10 px-2 py-1 rounded">{session.bandwidth} MB/s</span>
                      <span className="text-zinc-500 ml-auto flex items-center gap-1"><Clock size={10}/> {session.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center">
                    <Users size={32} className="mb-3 opacity-20" />
                    <p className="text-xs font-black uppercase tracking-widest">Nenhuma sessão ativa encontrada.</p>
                  </div>
                )}
             </div>
          </div>

          {/* ESTADO DOS NÓS */}
          <div className="bg-black border border-zinc-800 p-6 rounded-[2.5rem] w-full">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
              <Layers size={14} /> DIAGNÓSTICO DE NÓS
            </h3>
            <div className="space-y-5">
              <NodeItem label="Firestore Realtime" status={dbLatency > 800 ? "Lento" : "Operacional"} latency={`${dbLatency}ms`} health={Math.max(10, 100 - (dbLatency / 20))} />
              <NodeItem label="Gateway Auth" status={networkStatus === 'Conectado' ? "Estável" : "Offline"} latency="-- ms" health={networkStatus === 'Conectado' ? 100 : 0} />
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-6 w-full">
        <HealthBadge icon={isSSL ? <ShieldCheck className="text-blue-500" /> : <AlertTriangle className="text-red-500" />} title="Segurança da Camada" status={isSSL ? "Conexão Segura" : "Inseguro"} danger={!isSSL} />
        <HealthBadge icon={<Globe className="text-emerald-500" />} title="Região de Controlo" status={region} />
        <HealthBadge icon={networkStatus === 'Conectado' ? <Wifi className="text-purple-500" /> : <WifiOff className="text-red-500" />} title="Status da Rede" status={networkStatus} danger={networkStatus === 'Offline'} />
      </footer>

    </div>
  );
};

// ============================================================================
// COMPONENTES DE SUPORTE VISUAL (UI KIT)
// ============================================================================

const MetricCard = ({ icon, title, value, detail, color, pulse }: any) => (
  <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-[2.5rem] hover:bg-zinc-900/50 transition-all group relative overflow-hidden w-full">
    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 blur-[80px] group-hover:opacity-10 transition-opacity" style={{ backgroundColor: color }} />
    <div className="flex justify-between items-start mb-6 relative z-10">
      <div className="p-3 bg-black rounded-2xl text-zinc-500 group-hover:text-white transition-colors border border-zinc-800 shadow-xl" style={{ color: pulse ? color : '' }}>
        {icon}
      </div>
      {pulse && <div className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: color }} />}
    </div>
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 relative z-10 truncate">{title}</p>
    <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-2 relative z-10 truncate" style={{ color: color }}>{value}</h2>
    <p className="text-[11px] text-zinc-600 font-medium relative z-10 truncate">{detail}</p>
  </div>
);

const NodeItem = ({ label, status, latency, health }: any) => {
  const isDegraded = status === 'Lento' || status === 'Offline';
  return (
    <div className="group w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[11px] font-bold text-zinc-400">{label}</span>
        <span className={`text-[9px] font-black uppercase ${isDegraded ? 'text-red-500' : 'text-green-500'}`}>{status}</span>
      </div>
      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden shadow-inner">
        <div className={`h-full rounded-full transition-all duration-1000 ${isDegraded ? 'bg-red-600' : 'bg-blue-600'}`} style={{ width: `${health}%` }} />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase">LATÊNCIA: {latency}</span>
        <span className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase">SAÚDE: {Math.round(health)}%</span>
      </div>
    </div>
  );
};

const HealthBadge = ({ icon, title, status, danger }: any) => (
  <div className={`bg-zinc-900/20 border p-6 rounded-3xl flex items-center gap-4 transition-colors w-full overflow-hidden ${danger ? 'border-red-900/50 bg-red-900/10' : 'border-zinc-800/80'}`}>
    <div className={`p-3.5 bg-black rounded-2xl border shrink-0 ${danger ? 'border-red-800' : 'border-zinc-800'} shadow-lg`}>{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 truncate">{title}</p>
      <h4 className={`text-xs font-bold uppercase tracking-wider truncate ${danger ? 'text-red-400' : 'text-white'}`}>{status}</h4>
    </div>
  </div>
);

export default AdminDashboardV7;