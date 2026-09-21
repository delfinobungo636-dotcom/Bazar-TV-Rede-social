import React from 'react';
import { X, Check } from 'lucide-react';
import { plans } from '../data/plans';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: any) => void;
}

const PlansModal = ({ isOpen, onClose, onSelectPlan }: PlansModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center bg-black/95 backdrop-blur-md p-2 md:p-4 animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-6xl my-4 md:my-10">
        
        {/* Cabeçalho Ajustado */}
        <div className="flex justify-between items-center mb-6 md:mb-8 px-4">
          <h2 className="text-xl md:text-3xl font-bold text-white leading-tight">
            Escolha o <br className="md:hidden" /> plano ideal
          </h2>
          <button 
            onClick={onClose} 
            className="bg-zinc-800 p-2 rounded-full text-white hover:bg-red-600 transition shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Grid Responsivo: 1 coluna no mobile, 2 em tablets, 4 em PC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 pb-10">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`relative bg-zinc-900 rounded-2xl p-5 md:p-6 border transition flex flex-col ${
                plan.highlight ? 'border-red-600 shadow-xl' : 'border-zinc-800'
              } hover:border-red-500/50`}
            >
              {plan.highlight && (
                 <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-600 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                   MAIS POPULAR
                 </span>
              )}
              
              <h3 className="text-lg md:text-xl font-bold text-white mb-1">{plan.name}</h3>
              
              <div className="flex items-end gap-1 mb-4 md:mb-6">
                {/* Preço menor no mobile para não transbordar */}
                <span className="text-2xl md:text-3xl font-black text-white">{plan.price}</span>
                <span className="text-gray-400 text-xs md:text-sm mb-1">{plan.period}</span>
              </div>

              <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8 flex-1">
                {plan.features.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-300 text-xs md:text-sm">
                    <Check size={14} className="text-green-500 mt-0.5 shrink-0" />
                    <span className="leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => onSelectPlan(plan)}
                className={`w-full py-3 rounded-xl font-bold text-sm md:text-base transition ${
                  plan.highlight 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-white/10 hover:bg-white text-white hover:text-black'
                }`}
              >
                Selecionar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlansModal;