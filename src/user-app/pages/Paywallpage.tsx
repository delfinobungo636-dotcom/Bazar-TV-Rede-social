import React, { useState } from 'react';
import PlansModal from '../../public-app/components/modals/PlansModal'; // Ajuste o caminho se necessário
import PaymentModal from '../../public-app/components/modals/PaymentModal'; // Ajuste o caminho se necessário

const PaywallPage = () => {
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);
    setIsPlansOpen(false);
    setIsPaymentOpen(true); // Abre o modal do Multicaixa logo a seguir
  };

  return (
    <div className="min-h-screen bg-[#141414] bg-[url('https://images.unsplash.com/photo-1574267432553-4b4628081c31?q=80&w=2031&auto=format&fit=crop')] bg-cover bg-center flex items-center justify-center relative">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md"></div>
      
      <div className="relative z-10 text-center max-w-2xl px-6">
        <div className="bg-red-600/20 text-red-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 drop-shadow-lg">Acesso Bloqueado</h1>
        <p className="text-xl text-gray-300 mb-8 font-medium">
          A sua conta está a aguardar confirmação de pagamento. Escolha um plano para ativar o seu catálogo e assistir sem limites.
        </p>
        
        <button 
          onClick={() => setIsPlansOpen(true)}
          className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-transform hover:scale-105 shadow-xl shadow-red-900/20"
        >
          Escolher Plano de Acesso
        </button>
      </div>

      {/* Renderiza os seus Modais de pagamento aqui */}
      <PlansModal 
        isOpen={isPlansOpen} 
        onClose={() => setIsPlansOpen(false)} 
        onSelectPlan={handlePlanSelect} 
      />
      
      <PaymentModal 
        plan={selectedPlan} 
        isOpen={isPaymentOpen} 
        onClose={() => setIsPaymentOpen(false)} 
      />
    </div>
  );
};

export default PaywallPage;