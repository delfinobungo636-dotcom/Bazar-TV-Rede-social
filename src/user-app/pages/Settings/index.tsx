import React from 'react';
import { User, Settings as SettingsIcon, Bell, Shield, HelpCircle, LogOut, ChevronRight, Wifi } from 'lucide-react';
import { useAuth } from '../../../modules/auth/auth.hooks';
import { auth } from '../../../shared/services/firebase'; // Importamos o auth direto para garantir que o logout funciona

const Settings = () => {
  // Usamos userData para ter os dados do Firestore (plano, role, etc.)
  const { user, userData } = useAuth();

  // Função segura para sair
  const handleLogout = () => {
    auth.signOut();
  };

  // Definição dos itens do menu
  const sections = [
    {
      title: 'A Minha Conta',
      items: [
        { 
          icon: <User size={20} />, 
          label: 'Email', 
          value: user?.email, 
          highlight: false 
        },
        { 
          icon: <Shield size={20} />, 
          label: 'Plano Atual', 
          value: (userData?.plan || 'Gratuito').toUpperCase(), 
          highlight: true 
        },
      ]
    },
    {
      title: 'Preferências',
      items: [
        { icon: <Wifi size={20} />, label: 'Uso de Dados', value: 'Automático', highlight: false },
        { icon: <SettingsIcon size={20} />, label: 'Qualidade de Vídeo', value: 'Alta (HD)', highlight: false },
        { icon: <Bell size={20} />, label: 'Notificações', value: 'Ativado', highlight: false },
      ]
    },
    {
      title: 'Suporte',
      items: [
        { icon: <HelpCircle size={20} />, label: 'Central de Ajuda', value: 'Em breve', highlight: false },
      ]
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#141414] text-white p-6 md:p-12 pb-32 animate-fadeIn">
      <div className="max-w-3xl mx-auto mt-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 border-l-4 border-red-600 pl-4">Definições</h1>

        <div className="space-y-8">
          {sections.map((section, index) => (
            <div key={index} className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-white/5 shadow-lg">
              {/* Título da Secção */}
              <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                <h3 className="font-bold text-gray-200 text-sm tracking-wider uppercase">{section.title}</h3>
              </div>
              
              {/* Lista de Opções */}
              <div className="divide-y divide-white/5">
                {section.items.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/5 transition cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-zinc-800 text-gray-400 group-hover:text-white group-hover:bg-red-600 transition duration-300">
                        {item.icon}
                      </div>
                      <span className="text-sm md:text-base font-medium">{item.label}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {item.highlight ? (
                        <span className="bg-red-600/20 text-red-400 text-xs px-2 py-1 rounded font-bold border border-red-600/30">
                          {item.value}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">{item.value}</span>
                      )}
                      <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Botão de Logout */}
          <button 
            onClick={handleLogout}
            className="w-full mt-8 p-4 rounded-xl border border-red-900/30 text-red-500 hover:bg-red-900/10 hover:border-red-600 flex items-center justify-center gap-2 font-bold transition duration-300 group"
          >
            <LogOut size={20} className="group-hover:scale-110 transition"/>
            Terminar Sessão
          </button>
          
          <p className="text-center text-zinc-700 text-xs mt-8 font-mono">
            Bazar TV v1.0.0 • ID: {user?.uid ? user.uid.slice(0,8) : '---'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;