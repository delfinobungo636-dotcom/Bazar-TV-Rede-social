import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Database, HardDrive, Cpu, Globe, 
  ShieldCheck, Zap, Server, 
  BarChart3, Terminal, AlertOctagon, 
  RefreshCcw, Trash2, Lock, X, Info
} from 'lucide-react';
import { auth, db } from '../../../shared/services/firebase';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { 
  collection, query, onSnapshot, limit, deleteDoc, doc, getDocs, getCountFromServer
} from 'firebase/firestore';

// ============================================================================
// CONTRATOS DE DADOS (INTERFACES RIGOROSAS)
// ============================================================================

interface ProvinceStats {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface SystemLog {
  id: string;
  type: 'info' | 'error' | 'success' | 'warning' | 'gateway';
  message: string;
  timestamp: Date;
  origin: string;
}

interface PerformanceStats {
  memoryUsage: string;
  loadTime: string;
  uptime: string;
}

interface DashboardStats {
  totalUsers: number;
  totalMovies: number;
  activeSessions: number;
  estimatedCost: string;
}

interface ActiveSession {
  id: string;
  title: string;
  userId: string;
  resolution: string;
  deviceType: 'mobile' | 'desktop' | 'unknown';
  timestamp: Date;
  location?: string;
  provincia?: string;
}

interface CloudStatsResponse {
  totalUsers: number;
  totalMovies: number;
  activeSessions: number;
  lastUpdate: number;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  trend: string;
  color: 'blue' | 'purple' | 'emerald' | 'orange';
  detailsTitle: string;
  detailsContent: React.ReactNode;
}

const Telemetry: React.FC = () => {
  // --- STATE CORE ---
  const [isLive, setIsLive] = useState<boolean>(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalMovies: 0,
    activeSessions: 0,
    estimatedCost: 'Calculando...' 
  });

  const [activeSessionsList, setActiveSessionsList] = useState<ActiveSession[]>([]);
  const [provinces, setProvinces] = useState<ProvinceStats[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [perf, setPerf] = useState<PerformanceStats>({
    memoryUsage: 'Otimizada',
    loadTime: '0ms',
    uptime: '0h 0m'
  });

  // --- SENSORES VIVOS ---
  const [dbLatency, setDbLatency] = useState<number>(0);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([0,0,0,0,0,0,0,0,0,0]);
  const [networkStatus, setNetworkStatus] = useState<'Conectado' | 'Offline'>(navigator.onLine ? 'Conectado' : 'Offline');
  const [nodeStatus, setNodeStatus] = useState<'stable' | 'warning' | 'critical'>('stable');
  const [isKilling, setIsKilling] = useState<string | null>(null);

  // --- ESTADOS PARA MODAIS EXCLUSIVAS (Heatmap, Logs, Sensores, etc.) ---
  const [modalHeatmapOpen, setModalHeatmapOpen] = useState(false);
  const [modalLogsOpen, setModalLogsOpen] = useState(false);
  const [modalSessionsOpen, setModalSessionsOpen] = useState(false);
  const [modalSensorsOpen, setModalSensorsOpen] = useState(false);

  // --- 1. SENSORES DE HARDWARE E REDE ---
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('Conectado');
    const handleOffline = () => setNetworkStatus('Offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- 2. PING REAL AO FIREBASE ---
  const pingFirebase = useCallback(async () => {
    if (!isLive || networkStatus === 'Offline') return;
    const start = performance.now();
    try {
      await getDocs(query(collection(db, "active_sessions"), limit(1)));
      const currentLatency = Math.round(performance.now() - start);
      setDbLatency(currentLatency);
      
      setLatencyHistory(prev => {
        const newHistory = [...prev.slice(1), currentLatency];
        return newHistory;
      });

      if (currentLatency > 1500) setNodeStatus('critical');
      else if (currentLatency > 600) setNodeStatus('warning');
      else setNodeStatus('stable');
    } catch (e) {
      setDbLatency(999);
      setNodeStatus('critical');
      setLatencyHistory(prev => [...prev.slice(1), 500]); 
    }
  }, [isLive, networkStatus]);

  useEffect(() => {
    const pingInterval = setInterval(pingFirebase, 5000);
    return () => clearInterval(pingInterval);
  }, [pingFirebase]);

  // --- 3. CORE DATA FETCHING (CONTAGEM REAL DE FILMES NO FIRESTORE + CLOUD FUNCTION) ---
  useEffect(() => {
    const fetchCoreMetrics = async () => {
      try {
        // Contagem direta da coleção movies para garantir satisfação imediata no VOD
        const moviesSnapshot = await getCountFromServer(collection(db, 'movies'));
        const moviesCount = moviesSnapshot.data().count;

        const functions = getFunctions();
        const obterStats = httpsCallable<void, CloudStatsResponse>(functions, 'obterEstatisticasBazar');
        const response: HttpsCallableResult<CloudStatsResponse> = await obterStats();
        const { totalUsers } = response.data;

        setStats(prev => ({
          ...prev,
          totalUsers: totalUsers,
          totalMovies: moviesCount,
          estimatedCost: `$${((moviesCount * 0.05) + (totalUsers * 0.01)).toFixed(2)}/mês`
        }));
      } catch (error) {
        console.error("Erro na telemetria Backend:", error);
      }
    };

    fetchCoreMetrics();
    const interval = setInterval(fetchCoreMetrics, 45000); 
    return () => clearInterval(interval);
  }, []);

  // --- 4. REAL-TIME LOGS & HEATMAP ---
  useEffect(() => {
    if (!isLive) return;

    const q = query(collection(db, 'active_sessions'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      
      const validDocs = snapshot.docs.filter(docSnap => {
        const data = docSnap.data();
        if (!data.timestamp) return true;
        const sessionTime = data.timestamp.toDate ? data.timestamp.toDate() : new Date();
        return (now.getTime() - sessionTime.getTime()) / 60000 <= 20; 
      });

      const activeCount = validDocs.length;
      setStats(prev => ({ ...prev, activeSessions: activeCount }));

      const parsedSessions: ActiveSession[] = validDocs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: String(data.title || 'Catálogo VIP'),
          userId: String(data.userId || 'ANON'),
          resolution: String(data.resolution || 'HD'),
          deviceType: (data.deviceType === 'mobile' || data.deviceType === 'desktop') ? data.deviceType : 'unknown',
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
          provincia: data.provincia ? String(data.provincia) : undefined
        };
      });

      setActiveSessionsList(parsedSessions);

      const logsData: SystemLog[] = parsedSessions.slice(0, 30).map(session => ({
        id: session.id,
        type: 'info',
        message: `Stream ativo: [${session.title}]`,
        timestamp: session.timestamp,
        origin: 'CDN_Node'
      }));
      setLogs(logsData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));

      const locationCounts: Record<string, number> = {};
      parsedSessions.forEach(session => {
        const loc = session.provincia || 'Desconhecida';
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      });

      const colors = ['bg-blue-600', 'bg-blue-400', 'bg-indigo-500', 'bg-purple-500', 'bg-emerald-500'];
      const newProvinces: ProvinceStats[] = Object.keys(locationCounts).map((key, index) => {
        const count = locationCounts[key];
        return {
          id: key,
          name: key,
          count: count,
          percentage: activeCount > 0 ? (count / activeCount) * 100 : 0,
          color: colors[index % colors.length]
        };
      });
      
      setProvinces(newProvinces.sort((a, b) => b.count - a.count).slice(0, 5));

    }, (err) => {
      console.error(err);
      setNodeStatus('critical');
    });

    return () => unsubscribe();
  }, [isLive]);

  // --- 5. BROWSER PERFORMANCE MONITOR ---
  useEffect(() => {
    const startTime = Date.now();
    let lastTick = performance.now();

    const monitorPerf = () => {
      const now = Date.now();
      const currentTick = performance.now();
      const uptimeSec = Math.floor((now - startTime) / 1000);
      
      const tickDelta = currentTick - lastTick;
      const loadStatus = tickDelta > 2100 ? "Sobrecarga" : "Estável";
      lastTick = currentTick;

      let loadMs = 0;
      if (window.performance && window.performance.getEntriesByType) {
        const navEntries = window.performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
        if (navEntries.length > 0) loadMs = Math.round(navEntries[0].domContentLoadedEventEnd);
      }

      setPerf({
        memoryUsage: loadStatus,
        loadTime: `${loadMs > 0 ? loadMs : dbLatency}ms`,
        uptime: `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`
      });
    };

    const pInterval = setInterval(monitorPerf, 2000);
    return () => clearInterval(pInterval);
  }, [dbLatency]);

  // --- 6. KILL SWITCH ---
  const handleKill = async (id: string) => {
    setIsKilling(id);
    try {
      await deleteDoc(doc(db, 'active_sessions', id));
    } catch (e) {
      console.error("Erro ao matar sessão:", e);
    } finally {
      setIsKilling(null);
    }
  };

  const topProvince = provinces.length > 0 ? provinces[0] : null;

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#050505] text-zinc-300 font-sans p-4 md:p-8 selection:bg-blue-500/30 relative">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-zinc-900 pb-8">
        <div className="flex items-center gap-5">
          <div className={`p-3 rounded-2xl border transition-colors ${nodeStatus === 'critical' ? 'bg-red-600/20 border-red-500/50' : 'bg-blue-600/10 border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.2)]'}`}>
            {nodeStatus === 'critical' ? <AlertOctagon className="text-red-500 animate-pulse" size={32} /> : <Activity className="text-blue-500 animate-pulse" size={32} />}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
              Estúdio Bazar <span className={nodeStatus === 'critical' ? 'text-red-500' : 'text-blue-500'}>v11.0_Core</span>
            </h1>
            <div className="flex items-center gap-3 text-xs mt-1">
              <span className={`flex items-center gap-1 font-bold uppercase ${nodeStatus === 'critical' ? 'text-red-500' : 'text-green-500'}`}>
                <span className={`w-2 h-2 rounded-full ${nodeStatus === 'critical' ? 'bg-red-500' : 'bg-green-500 animate-ping'}`} /> 
                {nodeStatus === 'critical' ? 'SISTEMA COMPROMETIDO' : 'KERNEL ONLINE'}
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-500 font-mono tracking-widest uppercase">Global_Telemetry_Node</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Impacto Financeiro (Estimado)</p>
            <div className="flex items-center justify-end gap-2">
              <span className="text-white font-mono text-sm font-bold text-orange-400">{stats.estimatedCost}</span>
            </div>
          </div>
          <div className="text-right border-l border-zinc-800 pl-8">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Health Index</p>
            <p className={`${nodeStatus === 'critical' ? 'text-red-500' : nodeStatus === 'warning' ? 'text-yellow-500' : 'text-green-400'} font-mono text-sm font-bold`}>
              {nodeStatus === 'critical' ? '32.14%' : nodeStatus === 'warning' ? '85.40%' : '99.98%'}
            </p>
          </div>
        </div>
      </header>

      {/* --- AS 4 MÉTRICAS DE TOPO COM CAIXAS INDEPENDENTES (INCLUINDO HISTÓRICO DE PING) --- */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <MetricCard 
          label="Latência de I/O" 
          value={`${dbLatency}ms`} 
          sub="Tempo de resposta Firebase (Clique para histórico)" 
          icon={<Zap size={20} />} 
          trend="Monitor Real" 
          color={nodeStatus === 'critical' ? 'orange' : 'blue'}
          detailsTitle="Diagnóstico e Escalabilidade de I/O (Histórico)"
          detailsContent={
            <div className="space-y-4 text-xs">
              <p className="text-zinc-400">Histórico em tempo real das últimas leituras de ping executadas no Firestore:</p>
              <div className="bg-black/60 p-4 rounded-2xl border border-zinc-800">
                <div className="flex items-end gap-2 h-24 mb-3">
                  {latencyHistory.map((h, i) => {
                    const heightPerc = Math.min(100, Math.max(10, (h / 500) * 100));
                    return (
                      <div key={i} className="flex-1 bg-blue-500/40 hover:bg-blue-500 transition-all rounded-t-sm relative group" style={{ height: `${heightPerc}%` }}>
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono opacity-0 group-hover:opacity-100 bg-black px-1 rounded text-white">{h}ms</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                  <span>Início do ciclo</span>
                  <span className="text-green-400 flex items-center gap-1"><ShieldCheck size={12}/> Banco Protegido</span>
                  <span>Atual: {dbLatency}ms</span>
                </div>
              </div>
            </div>
          }
        />

        <MetricCard 
          label="Sessões Ativas" 
          value={stats.activeSessions.toLocaleString()} 
          sub="Clientes a assistir agora (Clique para detalhes)" 
          icon={<Activity size={20} />} 
          trend="Real-time" 
          color="purple"
          detailsTitle="Monitorização de Espectadores Ativos"
          detailsContent={
            <div className="space-y-3 text-xs">
              <p className="text-zinc-400">Total de sessões ativas registadas no ecossistema da Bazar TV.</p>
              <div className="p-3 bg-black/50 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 block font-mono mb-1">Espectadores:</span>
                <span className="text-purple-400 font-bold text-lg">{stats.activeSessions} Online</span>
              </div>
            </div>
          }
        />

        <MetricCard 
          label="Performance do DOM" 
          value={perf.loadTime} 
          sub={`Uptime: ${perf.uptime} (Clique para detalhes)`} 
          icon={<Cpu size={20} />} 
          trend={perf.memoryUsage} 
          color="emerald"
          detailsTitle="Métricas de Desempenho do Cliente"
          detailsContent={
            <div className="space-y-3 text-xs">
              <p className="text-zinc-400">Avalia a estabilidade do navegador e os tempos de carga do painel de administração.</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-black/50 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block font-mono text-[10px]">Load Time:</span>
                  <span className="text-emerald-400 font-bold">{perf.loadTime}</span>
                </div>
                <div className="p-3 bg-black/50 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block font-mono text-[10px]">Uptime:</span>
                  <span className="text-white font-bold">{perf.uptime}</span>
                </div>
              </div>
            </div>
          }
        />

        <MetricCard 
          label="Infraestrutura VOD" 
          value={stats.totalMovies.toLocaleString()} 
          sub="Títulos armazenados (Clique para detalhes)" 
          icon={<HardDrive size={20} />} 
          trend="Catálogo" 
          color="orange"
          detailsTitle="Capacidade e Conteúdo VOD"
          detailsContent={
            <div className="space-y-3 text-xs">
              <p className="text-zinc-400">Sincronização direta com a base de dados de filmes no Firestore e servidores de armazenamento.</p>
              <div className="p-3 bg-black/50 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 block font-mono mb-1">Títulos Disponíveis:</span>
                <span className="text-orange-400 font-bold text-lg">{stats.totalMovies} Filmes</span>
              </div>
            </div>
          }
        />
      </section>

      {/* --- BLOCOS INFERIORES COM CAIXAS MODAIS INDEPENDENTES --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-8 space-y-8">
          
          {/* 1. HEATMAP CARD INTERATIVO */}
          <div 
            onClick={() => setModalHeatmapOpen(true)}
            className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-8 backdrop-blur-sm shadow-xl cursor-pointer hover:border-blue-500/50 transition-all group relative overflow-hidden"
          >
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <Globe className="text-blue-500" size={24} />
                <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Heatmap de Tráfego VIVO (Por Província)</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest border border-zinc-800 px-3 py-1 rounded-full flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> SESSÕES REAIS
                </span>
                <Info size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pointer-events-none">
              <div className="space-y-6">
                {provinces.length > 0 ? provinces.map((p) => (
                  <div key={p.id}>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="font-bold text-zinc-400 uppercase">{p.name}</span>
                      <span className="font-mono text-blue-500">{p.count} acessos</span>
                    </div>
                    <div className="w-full bg-zinc-800/50 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${p.color} rounded-full`} style={{ width: `${p.percentage}%` }} />
                    </div>
                  </div>
                )) : (
                  <p className="text-zinc-600 italic text-sm">A aguardar conexões dos clientes para mapeamento...</p>
                )}
              </div>
              
              <div className="flex flex-col justify-center items-center p-8 bg-black/40 rounded-3xl border border-zinc-800/50 relative">
                <BarChart3 size={48} className="text-blue-500/50 mb-4" />
                <p className="text-xs text-center text-zinc-400 max-w-[200px]">
                  {topProvince ? `Pico atual: ${topProvince.name} (${topProvince.count} sessões)` : "Sem dados geográficos suficientes."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* 2. CARD DE SENSORES CORE INTERATIVO */}
            <div 
              onClick={() => setModalSensorsOpen(true)}
              className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-6 shadow-xl cursor-pointer hover:border-emerald-500/50 transition-all group flex flex-col justify-between"
            >
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Server size={14}/> Sensores Core
                </h4>
                <Info size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
              </div>
              <div className="space-y-4 pointer-events-none">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-zinc-400">NODE_AUTH_MASTER</span>
                  <span className={auth.currentUser ? 'text-green-500' : 'text-yellow-500'}>{auth.currentUser ? 'OPERATIONAL' : 'IDLE'}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-zinc-400">CDN_VIDEO_EDGE</span>
                  <span className={networkStatus === 'Conectado' ? 'text-green-500' : 'text-red-500'}>{networkStatus === 'Conectado' ? 'STABLE' : 'DISCONNECTED'}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-zinc-400">FIREBASE_CLOUD_FUNC</span>
                  <span className={dbLatency < 800 ? 'text-green-500' : 'text-red-500'}>{dbLatency < 800 ? 'SECURE' : 'DEGRADED'}</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-6 shadow-xl flex flex-col justify-center items-center text-center">
              <p className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-widest mb-1">Estado da Rede Global</p>
              <p className="text-white font-black text-sm tracking-tight uppercase">{networkStatus} - Região África/Luanda</p>
            </div>

          </div>
        </div>

        {/* COLUNA LATERAL (LIVE STREAMS & CONTROLO DE SESSÕES) */}
        <aside className="lg:col-span-4 space-y-8">
          
          {/* 3. LIVE STREAM TERMINAL INTERATIVO */}
          <div 
            onClick={() => setModalLogsOpen(true)}
            className="bg-black border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[350px] relative cursor-pointer hover:border-blue-500 transition-all group"
          >
            <div className="bg-zinc-900/80 p-4 border-b border-zinc-800 flex justify-between items-center relative z-10">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-tighter flex items-center gap-2">
                <Terminal size={12}/> Live_Node_Stream (Expandir)
              </span>
            </div>

            <div className="p-6 overflow-y-auto font-mono text-[11px] space-y-4 custom-scrollbar bg-[#050505] relative z-10 flex-1 pointer-events-none">
              {logs.length > 0 ? logs.map((log) => (
                <div key={log.id} className="flex gap-3 leading-relaxed border-b border-zinc-900/50 pb-2">
                  <span className="text-zinc-600 shrink-0">[{log.timestamp.toLocaleTimeString()}]</span>
                  <span className="font-bold shrink-0 text-blue-500">INFO</span>
                  <span className="text-zinc-400">{log.message}</span>
                </div>
              )) : (
                <div className="flex items-center gap-2 h-full justify-center text-zinc-600 italic">
                  Aguardando novos streams...
                </div>
              )}
            </div>
          </div>
          
          {/* 4. CONTROLO DE SESSÕES INTERATIVO */}
          <div 
            onClick={() => setModalSessionsOpen(true)}
            className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 shadow-xl max-h-[400px] flex flex-col cursor-pointer hover:border-red-500 transition-all group"
          >
            <h4 className="text-xs font-black text-zinc-400 mb-4 uppercase tracking-widest flex items-center justify-between">
              <span className="flex items-center gap-2"><Lock size={14}/> Controle de Sessões (Expandir)</span>
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px]">{activeSessionsList.length} ONLINE</span>
            </h4>
            
            <div className="overflow-y-auto space-y-2 pr-2 flex-1 custom-scrollbar pointer-events-none">
              {activeSessionsList.map((session) => (
                <div key={session.id} className="bg-black/50 p-3 rounded-xl border border-zinc-800 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white truncate max-w-[150px]">{session.title}</p>
                    <p className="text-[9px] text-zinc-500 font-mono mt-1">ID: {session.userId.slice(0, 6)}...</p>
                  </div>
                  <span className="text-[10px] text-zinc-400">Ativo</span>
                </div>
              ))}
              {activeSessionsList.length === 0 && (
                <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest font-black py-8">Catálogo Vazio</p>
              )}
            </div>
          </div>

        </aside>

      </div>

      {/* ========================================================================== */}
      {/* MODAIS EXCLUSIVAS PARA CADA BLOCO INFERIOR                              */}
      {/* ========================================================================== */}

      {/* Modal Heatmap */}
      {modalHeatmapOpen && (
        <ModalWrapper title="Mapeamento Geográfico de Tráfego" onClose={() => setModalHeatmapOpen(false)}>
          <div className="space-y-4 text-xs">
            <p className="text-zinc-400">Distribuição pormenorizada dos espectadores ativos por província em Angola:</p>
            <div className="space-y-3">
              {provinces.map(p => (
                <div key={p.id} className="bg-black/50 p-3 rounded-xl border border-zinc-800 flex justify-between items-center">
                  <span className="font-bold text-white uppercase">{p.name}</span>
                  <span className="font-mono text-blue-400">{p.count} acessos ({p.percentage.toFixed(1)}%)</span>
                </div>
              ))}
              {provinces.length === 0 && <p className="text-zinc-500 italic">Sem dados de regiões ativos.</p>}
            </div>
          </div>
        </ModalWrapper>
      )}

      {/* Modal Logs / Live Stream */}
      {modalLogsOpen && (
        <ModalWrapper title="Terminal Live Node Stream Completo" onClose={() => setModalLogsOpen(false)}>
          <div className="space-y-2 font-mono text-[11px] max-h-[300px] overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="p-2 bg-black/40 rounded border border-zinc-800 flex justify-between">
                <span className="text-blue-400">[{log.timestamp.toLocaleTimeString()}]</span>
                <span className="text-zinc-300">{log.message}</span>
              </div>
            ))}
          </div>
        </ModalWrapper>
      )}

      {/* Modal Controle de Sessões */}
      {modalSessionsOpen && (
        <ModalWrapper title="Gestão e Kill Switch de Sessões" onClose={() => setModalSessionsOpen(false)}>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {activeSessionsList.map(session => (
              <div key={session.id} className="bg-black/50 p-3 rounded-xl border border-zinc-800 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-white">{session.title}</p>
                  <p className="text-[9px] text-zinc-500 font-mono">Utilizador: {session.userId}</p>
                </div>
                <button 
                  onClick={() => handleKill(session.id)}
                  disabled={isKilling === session.id}
                  className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-bold transition-all"
                >
                  {isKilling === session.id ? 'A encerrar...' : 'Terminar Sessão'}
                </button>
              </div>
            ))}
            {activeSessionsList.length === 0 && <p className="text-zinc-500 text-xs italic">Nenhuma sessão ativa neste momento.</p>}
          </div>
        </ModalWrapper>
      )}

      {/* Modal Sensores Core */}
      {modalSensorsOpen && (
        <ModalWrapper title="Diagnóstico dos Sensores Core" onClose={() => setModalSensorsOpen(false)}>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-black/50 rounded-xl border border-zinc-800 flex justify-between">
              <span className="text-zinc-400">NODE_AUTH_MASTER</span>
              <span className="text-green-400 font-bold">OPERATIONAL</span>
            </div>
            <div className="p-3 bg-black/50 rounded-xl border border-zinc-800 flex justify-between">
              <span className="text-zinc-400">CDN_VIDEO_EDGE</span>
              <span className="text-green-400 font-bold">STABLE</span>
            </div>
            <div className="p-3 bg-black/50 rounded-xl border border-zinc-800 flex justify-between">
              <span className="text-zinc-400">FIREBASE_CLOUD_FUNC</span>
              <span className="text-green-400 font-bold">SECURE</span>
            </div>
          </div>
        </ModalWrapper>
      )}

    </div>
  );
};

// --- COMPONENTE DE CARTÃO MÉTRICO COM MODAL ISOLADA ---
const MetricCard: React.FC<MetricCardProps> = ({ label, value, sub, icon, trend, color, detailsTitle, detailsContent }) => {
  const [isOpen, setIsOpen] = useState(false);

  const colorMap: Record<string, string> = {
    blue: 'text-blue-500 border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50 hover:bg-blue-500/10',
    purple: 'text-purple-500 border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50 hover:bg-purple-500/10',
    emerald: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10',
    orange: 'text-orange-500 border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50 hover:bg-orange-500/10'
  };

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className={`p-6 rounded-[2rem] border transition-all duration-500 group ${colorMap[color]} shadow-lg cursor-pointer relative overflow-hidden`}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="p-2.5 bg-black/60 rounded-xl backdrop-blur-sm border border-white/5 group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black font-mono tracking-tighter opacity-60 uppercase bg-black/40 px-2 py-1 rounded-md">
              {trend}
            </span>
            <Info size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">{label}</p>
          <h2 className="text-3xl font-black text-white tracking-tighter mb-1 drop-shadow-md">{value}</h2>
          <p className="text-[10px] opacity-70 font-medium italic">{sub}</p>
        </div>
      </div>

      {isOpen && (
        <ModalWrapper title={detailsTitle} onClose={() => setIsOpen(false)}>
          {detailsContent}
        </ModalWrapper>
      )}
    </>
  );
};

// --- COMPONENTE AUXILIAR DE MODAL REUTILIZÁVEL ---
const ModalWrapper: React.FC<{ title: string; children: React.ReactNode; onClose: () => void }> = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
      <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-full transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="mb-6">{children}</div>
      <button onClick={onClose} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-colors">
        Fechar Painel
      </button>
    </div>
  </div>
);

export default Telemetry;