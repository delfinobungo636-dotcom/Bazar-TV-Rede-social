import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Play, Info } from 'lucide-react';
// 🚀 CORREÇÃO 1: Importamos o 'useNotification' do teu Facade correto (Foto 3)
import { useNotification } from '../../../modules/Notification/notificationcenter';

const NotificationsPage = () => {
  const navigate = useNavigate();
  
  // 🚀 CORREÇÃO 2: Extraímos as propriedades EXATAS que a tua arquitetura definiu
  const { 
    notifications, 
    loading, 
    unreadCount, // O teu motor já nos dá a contagem, não precisamos calcular!
    markAsRead,  
    clearAll     // O nome correto no teu sistema é clearAll
  } = useNotification();

  // Função para lidar com o clique na notificação
  const handleNotificationClick = async (id: string, action?: string) => {
    try {
      if (markAsRead) {
        await markAsRead(id);
      }
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
    navigate(action || '/');
  };

  // 🚀 CORREÇÃO 3: Formatação usando 'createdAt' conforme a tua AppNotification (Foto 2)
  const formatTime = (createdAt: any) => {
    if (!createdAt) return 'Agora mesmo';
    if (typeof createdAt === 'string') return createdAt;
    if (createdAt.toDate) {
      return createdAt.toDate().toLocaleDateString('pt-PT', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    }
    return 'Recente';
  };

  return (
    <div className="min-h-screen bg-[#141414] pt-32 px-6 md:px-12 pb-20 font-sans">
      
      {/* Cabeçalho da Página */}
      <div className="max-w-4xl mx-auto mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-zinc-500 text-sm uppercase tracking-widest font-black flex items-center gap-2">
            <Bell size={16} /> Central de Avisos
          </h1>
          <h2 className="text-white text-3xl md:text-5xl font-black uppercase italic tracking-tighter mt-2">
            Notificações {unreadCount > 0 && <span className="text-red-600">({unreadCount})</span>}
          </h2>
        </div>
        
        {/* Usamos a função clearAll aqui */}
        {unreadCount > 0 && clearAll && (
          <button 
            onClick={clearAll}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <Check size={16} /> Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Lista de Notificações */}
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        {loading ? (
          // Skeleton Loader de Alta Qualidade
          <div className="animate-pulse flex gap-6 p-4 md:p-6 bg-zinc-900/50 rounded-xl border border-white/5">
            <div className="w-16 h-16 md:w-24 md:h-16 bg-zinc-800 rounded-md"></div>
            <div className="flex-1">
              <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-zinc-800 rounded w-2/3"></div>
            </div>
          </div>
        ) : notifications && notifications.length > 0 ? (
          // O `notif: any` garante que propriedades flexíveis como 'image' ou 'action' passem no TypeScript
          notifications.map((notif: any) => (
            <div 
              key={notif.id}
              onClick={() => handleNotificationClick(notif.id, notif.action)}
              className={`group relative flex items-center gap-6 p-4 md:p-6 rounded-xl cursor-pointer transition-all duration-300 border-l-4 ${
                notif.read 
                  ? 'bg-zinc-900/50 border-transparent hover:bg-zinc-800/80' 
                  : 'bg-zinc-900 border-red-600 shadow-lg shadow-red-600/5 hover:bg-zinc-800'
              }`}
            >
              {/* Bolinha de Não Lido (Mobile) */}
              {!notif.read && (
                <div className="absolute top-4 right-4 w-2 h-2 bg-red-600 rounded-full md:hidden" />
              )}

              {/* Imagem ou Ícone da Notificação */}
              <div className="flex-shrink-0 w-16 h-16 md:w-24 md:h-16 bg-black rounded-md overflow-hidden flex items-center justify-center border border-white/5 relative">
                {notif.image ? (
                  <>
                    <img src={notif.image} alt="Capa" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play fill="white" size={20} className="text-white" />
                    </div>
                  </>
                ) : (
                  <Info size={24} className="text-zinc-500" />
                )}
              </div>

              {/* Conteúdo de Texto */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className={`text-sm md:text-base font-bold uppercase tracking-tight truncate ${notif.read ? 'text-zinc-300' : 'text-white'}`}>
                    {notif.title}
                  </h3>
                  {!notif.read && (
                    <span className="hidden md:inline-block w-2 h-2 bg-red-600 rounded-full" />
                  )}
                </div>
                <p className="text-zinc-500 text-xs md:text-sm truncate">
                  {notif.message}
                </p>
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-2">
                  {formatTime(notif.createdAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          /* Estado Vazio Premium */
          <div className="py-32 flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
            <Bell size={64} className="text-zinc-800 mb-6" />
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-lg">Sem Notificações</p>
            <p className="text-zinc-600 text-sm mt-2">Não tens mensagens novas no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;