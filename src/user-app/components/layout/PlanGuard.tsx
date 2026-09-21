import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../modules/auth/auth.hooks'; 
import { db } from '../../../shared/services/firebase'; 
import { doc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { AlertTriangle, Tv, Users, Loader2 } from 'lucide-react';

// ============================================================================
// CONTRATOS DE DADOS
// ============================================================================
interface UserData {
  role: 'admin' | 'user';
  plan?: string;
  activePlan?: string;
  status?: string;
  active_sessions?: string[];
  [key: string]: any;
}

interface AuthContextType {
  user: { uid: string } | null;
  userData: UserData | null;
  loading: boolean;
}

interface PlanRule {
  maxScreens: number;
  hasLive: boolean;
  mobileOnly: boolean;
}

interface PlanGuardProps {
  children: React.ReactNode;
}

// ============================================================================
// COMPONENTE PLAN GUARD V13 - BLINDADO
// ============================================================================
export default function PlanGuard({ children }: PlanGuardProps) {
  const { user, loading } = useAuth() as AuthContextType; 
  const location = useLocation();
  const navigate = useNavigate();

  const isApproved = useRef<boolean>(false);
  const [blockReason, setBlockReason] = useState<'device' | 'limit' | 'expired' | null>(null);
  const [liveBlocked, setLiveBlocked] = useState<boolean>(false);
  const [currentPlanMax, setCurrentPlanMax] = useState<number>(1);

  // Mapeamento rígido de planos globais
  const planRules = useMemo<Record<string, PlanRule>>(() => ({
    mobile:   { maxScreens: 1, hasLive: false, mobileOnly: true },
    standard: { maxScreens: 1, hasLive: false, mobileOnly: false },
    premium:  { maxScreens: 2, hasLive: true,  mobileOnly: false },
    familia:  { maxScreens: 4, hasLive: true,  mobileOnly: false }
  }), []);

  // GERADOR DE ID DE DISPOSITIVO BLINDADO
  const getDeviceId = () => {
    let id = localStorage.getItem('bazar_device_id');
    if (!id || id === 'dispositivo_desconhecido') {
      id = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('bazar_device_id', id);
    }
    return id;
  };

  useEffect(() => {
    if (loading || !user) return;

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (!snap.exists()) return;
      
      const data = snap.data() as UserData;
      
      // 1. Passe livre para Administração
      if (data.role === 'admin') {
        isApproved.current = true;
        setBlockReason(null);
        setLiveBlocked(false);
        return;
      }

      // 2. Validação de bloqueio por falta de pagamento
      if (data.status === 'expired' || data.status === 'canceled' || data.status === 'waiting_payment') {
        setBlockReason('expired');
        return;
      }

      // 3. Tradutor Universal de Planos (Resolve o bug do "1000 Kz para todos")
      const planoLido = String(data.plan || data.activePlan || 'mobile').toLowerCase().trim();
      
      const planMap: Record<string, string> = {
        '1000': 'mobile',
        '2999': 'standard',
        '3999': 'premium',
        '4999': 'familia',
        'mobile': 'mobile',
        'standard': 'standard',
        'premium': 'premium',
        'familia': 'familia'
      };

      const planoReal = planMap[planoLido] || 'mobile';
      const rules = planRules[planoReal] || planRules['mobile'];
      setCurrentPlanMax(rules.maxScreens);

      const deviceId = getDeviceId();
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // 4. Verificação de Dispositivo
      if (rules.mobileOnly && !isMobileDevice) {
        setBlockReason('device');
        return;
      }

      // 5. Verificação de Live TV
      const isLiveRoute = location.pathname.toLowerCase().includes('live');
      if (isLiveRoute && !rules.hasLive) {
        setLiveBlocked(true);
        return;
      } else {
        setLiveBlocked(false);
      }

      // 6. Verificação de Concorrência (Limites de Telas)
      const activeSessions = data.active_sessions || [];
      if (!activeSessions.includes(deviceId)) {
        if (activeSessions.length >= rules.maxScreens) {
          setBlockReason('limit');
          return;
        } else {
          // Grava a sessão ativamente no Firestore
          updateDoc(doc(db, "users", user.uid), { 
            active_sessions: arrayUnion(deviceId) 
          }).catch(err => console.error("Erro ao registar sessão:", err));
        }
      }

      // Tudo Validado
      isApproved.current = true;
      setBlockReason(null);
    }, (error) => {
      console.error("Erro Crítico no PlanGuard:", error);
    });

    return () => unsub();
  }, [loading, user, location.pathname, planRules]);

  const handleForceDisconnect = async (): Promise<void> => {
    if (!user?.uid) return;
    try {
      const functions = getFunctions();
      const desconectar = httpsCallable(functions, 'forcarDesconexao');
      const deviceId = getDeviceId();

      await desconectar({ deviceId });
      setBlockReason(null);
      window.location.reload(); 
    } catch (error) {
      console.error("Erro ao expurgar dispositivos:", error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center z-[9999]">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {children}

      {liveBlocked && (
        <BlockModal title="Área VIP" message="Os canais de Live TV são exclusivos para os planos de 3999 e 4999 Kz." icon={<Tv size={48} className="text-orange-500"/>} actionLabel="Fazer Upgrade" onAction={() => navigate('/profile')} onBack={() => navigate('/')} />
      )}

      {blockReason === 'limit' && !liveBlocked && (
        <BlockModal title="Muitas Telas" message={`O seu plano permite apenas ${currentPlanMax} ecrã(s) em simultâneo.`} icon={<Users size={48} className="text-yellow-500"/>} actionLabel="Desconectar outros aparelhos" onAction={handleForceDisconnect} secondaryActionLabel="Fazer Upgrade" onSecondaryAction={() => navigate('/profile')} />
      )}

      {blockReason === 'device' && !liveBlocked && (
        <BlockModal title="Acesso Restrito" message="O plano Mobile (1000 Kz) é exclusivo para a reprodução em telemóveis." icon={<AlertTriangle size={48} className="text-red-500"/>} actionLabel="Atualizar Assinatura" onAction={() => navigate('/profile')} />
      )}

      {blockReason === 'expired' && !liveBlocked && (
        <BlockModal title="Acesso Cortado" message="Assinatura pendente ou expirada. Efetue o pagamento." icon={<AlertTriangle size={48} className="text-red-500"/>} actionLabel="Renovar Agora" onAction={() => navigate('/profile')} />
      )}
    </>
  );
}

const BlockModal: React.FC<any> = ({ title, message, icon, actionLabel, onAction, secondaryActionLabel, onSecondaryAction, onBack }) => (
  <div className="fixed inset-0 z-[9999] bg-zinc-950/95 backdrop-blur-md flex items-center justify-center p-6 text-center">
    <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[2.5rem] max-w-md w-full flex flex-col items-center shadow-2xl">
      <div className="bg-white/5 p-5 rounded-full mb-6">{icon}</div>
      <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-3">{title}</h1>
      <p className="text-zinc-400 text-sm mb-8">{message}</p>
      <button onClick={onAction} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-blue-700 transition-colors">{actionLabel}</button>
      {secondaryActionLabel && <button onClick={onSecondaryAction} className="mt-4 text-xs font-bold text-zinc-500 uppercase tracking-wider hover:text-white transition-colors">{secondaryActionLabel}</button>}
      {onBack && <button onClick={onBack} className="mt-6 text-xs font-bold text-zinc-600 hover:text-zinc-400 transition-colors">Voltar para o Início</button>}
    </div>
  </div>
);