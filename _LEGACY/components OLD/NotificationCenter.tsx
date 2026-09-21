import React, { useState, useRef, useEffect } from 'react';

interface Notification {
  id: number;
  title: string;
  time: string;
  read: boolean;
  type: 'content' | 'system' | 'info';
  image?: string;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { 
    id: 1, 
    title: 'Novo filme: Projecto Power já disponível', 
    time: 'Há 2 min', 
    read: false, 
    type: 'content',
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=100&h=100&fit=crop&q=80'
  },
  { 
    id: 2, 
    title: 'Assinatura confirmada via MCX Express', 
    time: 'Há 1 hora', 
    read: false, 
    type: 'system' 
  },
  { 
    id: 3, 
    title: 'Bem-vindo à Bazar TV', 
    time: 'Ontem', 
    read: true, 
    type: 'info' 
  }
];

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Carrega preferência salva
  useEffect(() => {
    const savedPref = localStorage.getItem('bazartv_email_alerts');
    if (savedPref) {
      setEmailAlerts(JSON.parse(savedPref));
    }
  }, []);

  // Fecha o painel ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettings(false); // Reseta para lista ao fechar
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleMarkAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const toggleEmailAlerts = () => {
    const newValue = !emailAlerts;
    setEmailAlerts(newValue);
    localStorage.setItem('bazartv_email_alerts', JSON.stringify(newValue));
  };

  return (
    <div className="relative z-50" ref={wrapperRef}>
      {/* Botão do Sino */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-gray-300 hover:text-white transition-colors group rounded-full hover:bg-white/10"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={1.5} 
          stroke="currentColor" 
          className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-12' : 'group-hover:rotate-12'}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-2 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 border border-[#0f0f0f]"></span>
          </span>
        )}
      </button>

      {/* Painel Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 origin-top-right animate-fade-in">
          <div className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black ring-opacity-5">
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/5">
              {showSettings ? (
                <div className="flex items-center space-x-2">
                   <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white transition-colors">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                   </button>
                   <h3 className="text-sm font-bold text-white">Configurações</h3>
                </div>
              ) : (
                <h3 className="text-sm font-bold text-white">Notificações</h3>
              )}

              <div className="flex items-center space-x-3">
                {!showSettings && unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-gray-400 hover:text-white transition-colors uppercase tracking-wider font-semibold"
                  >
                    Ler todas
                  </button>
                )}
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`text-gray-400 hover:text-white transition-colors ${showSettings ? 'text-white' : ''}`}
                  title="Configurações"
                >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar min-h-[200px]">
              {showSettings ? (
                /* Painel de Configurações */
                <div className="p-4 space-y-6">
                   <div className="flex items-center justify-between">
                      <div className="pr-4">
                         <h4 className="text-sm font-bold text-gray-200">Alertas por Email</h4>
                         <p className="text-xs text-gray-500 mt-1">Receba notificações sobre estreias, pagamentos e novidades diretamente no seu email cadastrado.</p>
                      </div>
                      <button 
                        onClick={toggleEmailAlerts}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${emailAlerts ? 'bg-red-600' : 'bg-gray-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                   </div>
                   
                   {emailAlerts && (
                     <div className="bg-green-900/20 border border-green-500/30 p-3 rounded-lg flex items-start">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        <p className="text-xs text-green-200">Alertas ativos. Verifique sua pasta de spam se não receber confirmações.</p>
                     </div>
                   )}

                   <div className="pt-4 border-t border-white/5">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Preferências de Conteúdo</h4>
                      <label className="flex items-center space-x-3 text-sm text-gray-300 opacity-60 cursor-not-allowed" title="Em breve">
                         <div className="w-4 h-4 border border-gray-600 rounded bg-gray-800"></div>
                         <span>Novas Séries e Filmes</span>
                      </label>
                      <label className="flex items-center space-x-3 text-sm text-gray-300 opacity-60 cursor-not-allowed mt-2" title="Em breve">
                         <div className="w-4 h-4 border border-gray-600 rounded bg-gray-800"></div>
                         <span>Recomendações Personalizadas</span>
                      </label>
                      <p className="text-[10px] text-gray-600 mt-2 italic">*Mais opções em breve.</p>
                   </div>
                </div>
              ) : (
                /* Lista de Notificações */
                <>
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center justify-center h-full min-h-[200px]">
                      <svg className="w-10 h-10 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                      Sem notificações novas
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        onClick={() => handleMarkAsRead(notification.id)}
                        className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 relative group flex gap-3
                          ${!notification.read ? 'bg-gradient-to-r from-red-900/10 to-transparent' : ''}
                        `}
                      >
                        {!notification.read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
                        )}
                        
                        {/* Ícone ou Imagem */}
                        <div className="flex-shrink-0 mt-1">
                          {notification.image ? (
                            <img src={notification.image} alt="" className="w-10 h-10 rounded object-cover border border-white/10" />
                          ) : (
                             <div className={`w-10 h-10 rounded flex items-center justify-center border border-white/10
                               ${notification.type === 'system' ? 'bg-green-900/20 text-green-500' : 'bg-blue-900/20 text-blue-500'}
                             `}>
                               {notification.type === 'system' 
                                 ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                 : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                               }
                             </div>
                          )}
                        </div>

                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <p className={`text-sm leading-snug mb-1 ${!notification.read ? 'text-white font-semibold' : 'text-gray-400'}`}>
                              {notification.title}
                            </p>
                            {!notification.read && <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 ml-2"></span>}
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            {notification.time}
                            {notification.type === 'content' && <span className="text-[9px] border border-gray-700 px-1 rounded text-gray-400 ml-2">Filmes</span>}
                            {notification.type === 'system' && <span className="text-[9px] border border-green-900/50 px-1 rounded text-green-500 ml-2">Financeiro</span>}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!showSettings && (
              <div className="bg-black/40 p-2 text-center border-t border-white/5 hover:bg-black/60 transition-colors cursor-pointer">
                <button className="text-xs text-gray-400 hover:text-white py-1 w-full font-medium">
                  Ver histórico completo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default 'NotificationCenter'