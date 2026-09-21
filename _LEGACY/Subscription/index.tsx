
import React from 'react';

interface PlanProps {
  onSelect: (plan: any) => void;
  onBack: () => void;
}

const PLANS = [
  {
    id: 'mobile',
    name: 'Mobile',
    price: '1.000',
    quality: 'Boa',
    resolution: '480p',
    devices: 'Telemóvel e Tablet',
    screens: 1,
    features: ['Acesso ilimitado a filmes', 'Séries nacionais'],
    highlight: true,
    tag: 'MCX Express'
  },
  {
    id: 'standard',
    name: 'Padrão',
    price: '2.999',
    quality: 'Ótima',
    resolution: '1080p',
    devices: 'TV, Computador, Telemóvel',
    screens: 2,
    features: ['Sem anúncios', 'Download para assistir offline'],
    highlight: false
  },
  {
    id: 'family',
    name: 'Família',
    price: '3.999',
    quality: 'Excelente',
    resolution: '4K (Ultra HD)',
    devices: 'Todos os dispositivos',
    screens: 4,
    features: ['Áudio Espacial', 'Perfil Kids dedicado'],
    highlight: false
  },
  {
    id: 'vip',
    name: 'Bazar VIP',
    price: '4.999',
    quality: 'Cinemática',
    resolution: '4K + HDR',
    devices: 'Todos os dispositivos',
    screens: 4,
    features: ['Eventos ao vivo exclusivos', 'Acesso antecipado a estreias'],
    highlight: false
  }
];

export const SubscriptionPlans: React.FC<PlanProps> = ({ onSelect, onBack }) => {
  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in pb-12">
      <div className="text-center mb-8 relative">
        <button 
          onClick={onBack}
          className="md:absolute md:left-0 md:top-1 flex items-center text-gray-300 hover:text-white transition-colors mb-4 md:mb-0"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Voltar
        </button>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Escolha o seu plano</h2>
        <p className="text-gray-400">Cancele a qualquer momento. O ritmo de Angola é para todos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        {PLANS.map((plan) => (
          <div 
            key={plan.id}
            onClick={() => onSelect(plan)}
            className={`
              relative flex flex-col p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-105
              bg-black/40 backdrop-blur-xl border 
              ${plan.highlight ? 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.15)]' : 'border-white/10 hover:border-white/30'}
            `}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-600 to-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                Mais Popular
              </div>
            )}

            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
            <div className="flex items-baseline mb-6">
              <span className="text-3xl font-bold text-white">{plan.price}</span>
              <span className="text-sm text-gray-400 ml-1">KZ/mês</span>
            </div>

            <div className="space-y-4 flex-grow text-sm text-gray-300 mb-8 border-t border-white/10 pt-4">
              <div className="flex justify-between">
                <span>Qualidade</span>
                <span className="font-semibold text-white text-right">{plan.quality}</span>
              </div>
              <div className="flex justify-between">
                <span>Resolução</span>
                <span className="font-semibold text-white text-right">{plan.resolution}</span>
              </div>
              <div className="flex justify-between">
                <span>Ecrãs</span>
                <span className="font-semibold text-white text-right">{plan.screens}</span>
              </div>
               <div className="flex justify-between">
                <span>Dispositivos</span>
                <span className="font-semibold text-white text-right max-w-[50%] leading-tight">{plan.devices}</span>
              </div>
              
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-center pt-2 text-xs text-gray-400">
                   <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                   {feature}
                </div>
              ))}
            </div>

            <button className={`
              w-full py-3 rounded-lg font-bold text-sm transition-colors
              ${plan.highlight 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'}
            `}>
              Escolher {plan.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default 'SubscriptionPlans'