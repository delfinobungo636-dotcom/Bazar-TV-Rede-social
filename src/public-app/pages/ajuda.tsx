import React, { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';

const faqData = [
  { p: "Como posso pagar a minha subscrição?", r: "Aceitamos pagamentos por Referência Multicaixa e transferências diretas via ProxyPay." },
  { p: "Posso partilhar a minha conta?", r: "Depende do seu plano. O plano Mobile permite 1 ecrã, o Premium permite 2 e o Família até 4 ecrãs em simultâneo." },
  { p: "Os filmes têm legendas?", r: "Sim, quase todo o nosso catálogo internacional inclui legendas em Português ou dobragens de alta qualidade." },
  { p: "Como cancelar a assinatura?", r: "Basta ir à página da sua Conta e selecionar 'Gerir Assinatura'. O cancelamento é imediato e sem multas." }
  
];

const Ajuda = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#141414] pt-28 px-6 md:px-12 lg:px-24 pb-16">
      <div className="max-w-3xl mx-auto animate-fadeIn">
        <div className="flex items-center gap-4 mb-10">
          <HelpCircle size={40} className="text-red-600" />
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">Centro de Ajuda</h1>
        </div>

        <div className="space-y-4">
          {faqData.map((faq, index) => (
            <div 
              key={index} 
              className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden transition-all duration-300"
            >
              <button 
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex justify-between items-center text-left focus:outline-none"
              >
                <span className="text-lg font-medium text-white">{faq.p}</span>
                <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`} />
              </button>
              
              <div 
                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <p className="text-gray-400 leading-relaxed">{faq.r}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ajuda;