import React from 'react';
import { User, CreditCard, Settings, LogOut } from 'lucide-react';

const Conta = () => {
  return (
    <div className="min-h-screen bg-[#141414] pt-28 px-6 md:px-12 lg:px-24 pb-16">
      <div className="max-w-5xl mx-auto animate-fadeIn">
        <h1 className="text-3xl md:text-5xl font-black text-white mb-10 tracking-tight">A Minha Conta</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Cartão de Perfil */}
          <div className="md:col-span-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gradient-to-tr from-red-600 to-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-900/20">
              <User size={40} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Utilizador Bazar TV</h2>
            <p className="text-gray-400 text-sm mb-6">cliente@email.com</p>
            <button className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors font-medium">
              <Settings size={18} /> Editar Perfil
            </button>
          </div>

          {/* Cartão de Subscrição */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-400 mb-1">Plano Atual</h3>
                  <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
                    Premium
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-2xl font-bold text-white">3.999 Kz<span className="text-sm text-gray-500 font-normal">/mês</span></p>
                  <p className="text-sm text-green-500 font-medium mt-1">Ativo até 20 de Agosto</p>
                </div>
              </div>
              <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2">
                <CreditCard size={20} /> Gerir Assinatura
              </button>
            </div>

            {/* Zona de Perigo */}
            <div className="bg-gray-900/30 border border-gray-800/50 rounded-2xl p-6">
              <button className="flex items-center gap-2 text-red-500 hover:text-red-400 font-medium transition-colors">
                <LogOut size={20} /> Terminar Sessão
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Conta;