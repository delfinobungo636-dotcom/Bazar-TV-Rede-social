import React, { useState, useEffect } from 'react';
import { X, Loader, ShieldCheck, HeartHandshake, Clock, AlertTriangle } from 'lucide-react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore'; 
import { db } from '../../../shared/services/firebase';
import { useAuth } from "../../../modules/auth/auth.hooks";

interface PaymentModalProps {
  plan: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentModal({ plan, isOpen, onClose }: PaymentModalProps) {
  const { user }: any = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'instructions'>('input');
  const [userPhone, setUserPhone] = useState('');
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(180); 
  const [exactAmountWithCents, setExactAmountWithCents] = useState<number>(0);
  
  const ADMIN_PHONE = "928420341"; 

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    let timer: any;
    if (step === 'instructions' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Espião em tempo real: Fecha quando o status mudar para active
  useEffect(() => {
    if (!user || step !== 'instructions') return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (data.status === 'active' || data.subscriptionStatus === 'active') {
          alert("🎉 Pagamento detetado com sucesso! O seu catálogo está desbloqueado.");
          onClose();
          window.location.reload();
        }
      }
    });

    return () => unsubscribe();
  }, [user, step, onClose]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `0${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCreatePaymentIntent = async () => {
    if (!user) {
      setError('Sessão expirada. Faça login novamente.');
      return;
    }
    
    const cleanPhone = userPhone.replace(/\s+/g, "");
    if (cleanPhone.length < 9) {
      setError('Insira um número de telemóvel válido (mínimo 9 dígitos).');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // 1. Limpa o valor (evita o erro "NaN" no Firestore)
      let baseNumericAmount = 2999;
      if (plan && plan.price) {
        const onlyDigits = String(plan.price).replace(/[^\d]/g, '');
        baseNumericAmount = Number(onlyDigits) || 2999;
      }

      // 2. Cria os cêntimos
      const randomCents = (Math.floor(Math.random() * 90) + 10) / 100; 
      const totalAmount = Number((baseNumericAmount + randomCents).toFixed(2));
      
      console.log("💰 [TESTE] Valor que vai para o Firestore:", totalAmount);
      setExactAmountWithCents(totalAmount);

      const tempoLimite = new Date();
      tempoLimite.setMinutes(tempoLimite.getMinutes() + 3);

      // 3. GRAVA NO PERFIL DO UTILIZADOR (Garante que não falha permissões)
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        status: 'waiting_payment',
        pendingAmount: totalAmount, 
        plan: plan ? plan.name : 'standard',
        userPhone: cleanPhone,
        paymentExpiresAt: tempoLimite
      }, { merge: true });

      // 4. GRAVA NA COLEÇÃO PAYMENTS
      const paymentRef = doc(db, 'payments', user.uid);
      await setDoc(paymentRef, {
        userId: user.uid,
        userEmail: user.email || 'Sem email',
        userPhone: cleanPhone,
        amount: totalAmount, 
        plan: plan ? plan.name : 'standard',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: tempoLimite
      }, { merge: true });

      setStep('instructions');
      setTimeLeft(180);

    } catch (err: any) {
      console.error("🚨 ERRO FIRESTORE:", err);
      // Se houver erro, a tela não avança e mostra o motivo em vermelho!
      setError(`Erro ao gravar dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const formattedPrice = exactAmountWithCents.toLocaleString('pt-AO', { minimumFractionDigits: 2 });
    const message = `Olá! Fiz a transferência de ${formattedPrice} Kz do número ${userPhone}. Podem verificar?`;
    const url = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(message)}`; 
    window.open(url, '_blank');
  };

  if (!isOpen || !plan) return null;

  const formattedDisplayPrice = exactAmountWithCents > 0 
    ? exactAmountWithCents.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Number(String(plan.price).replace(/\./g, "").replace(/,/g, "")).toLocaleString('pt-AO', { minimumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-zinc-900 w-full max-w-md rounded-2xl border border-zinc-700 overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition"><X /></button>

        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Ativação Automática Bazar TV</h2>
          <p className="text-gray-400 mb-6">Plano <span className="text-red-500 font-bold">{plan.name}</span></p>

          {loading ? (
            <div className="py-10 flex flex-col items-center">
              <Loader className="animate-spin text-red-600 mb-4" size={40}/>
              <p className="text-gray-400 text-sm">A preparar a sua sessão segura...</p>
            </div>
          ) : step === 'input' ? (
            <div className="space-y-4 text-left animate-fadeIn">
              <div className="bg-zinc-800/80 p-4 rounded-xl border border-zinc-700/60 text-xs text-gray-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <HeartHandshake size={18} className="text-red-500" />
                  <span>Como funciona?</span>
                </div>
                <p>Informe o telemóvel para gerarmos os cêntimos exclusivos de ativação.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Seu telemóvel</label>
                <input 
                  type="tel"
                  placeholder="Ex: 922 000 000"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-600 text-white rounded-xl p-4 text-lg font-mono outline-none focus:border-red-500 transition"
                />
              </div>

              {error && <p className="text-red-500 text-xs font-bold">{error}</p>}

              <button 
                onClick={handleCreatePaymentIntent}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl mt-2 transition"
              >
                Avançar
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              {timeLeft > 0 ? (
                <div className="flex items-center justify-center gap-2 bg-red-600/10 text-red-500 p-3 rounded-xl border border-red-500/20 font-bold mb-4">
                   <Clock className="animate-pulse" size={20} /> Sessão Ativa: {formatTime(timeLeft)}
                </div>
              ) : (
                <div className="flex gap-3 bg-yellow-500/10 text-yellow-500 p-3 rounded-xl font-bold mb-4 text-xs text-left">
                   <AlertTriangle size={24} /> O tempo expirou.
                </div>
              )}

              <div className="bg-white text-black p-6 rounded-xl space-y-3 text-left relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-500 text-xs font-semibold">Destino</span>
                  <span className="font-mono font-bold text-lg text-blue-600">{ADMIN_PHONE}</span>
                </div>
                <div className="flex flex-col pt-1">
                  <span className="text-gray-500 text-xs font-semibold">Valor Exato (Com Cêntimos)</span>
                  <span className="font-bold text-2xl text-red-600 mt-1">{formattedDisplayPrice} Kz</span>
                </div>
              </div>

              <button onClick={handleWhatsApp} className="w-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition text-xs">
                Chamar no WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}