// UserNavbar.tsx — Versão Definitiva (Bazar TV) com Modal de Amigos, Grupos e SearchPage Modal
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../modules/auth/auth.hooks';
import { db } from '../../../shared/services/firebase';
import { Bell, Video, User, Plus, UserPlus, Users, Sparkles, Camera, X, Search } from 'lucide-react';
import ChatBotBazar from '../../../shared/components/ChatBotBazar';
import FriendsPage from '../../pages/ClipsFeed/FriendsPage';
import GroupsPage from '../../pages/ClipsFeed/GroupsPage';
import SearchPage from '../../pages/ClipsFeed/SearchPage'; // <-- IMPORTAÇÃO DA PÁGINA DE PESQUISA COMO MODAL

const useTimeBasedTheme = (): boolean => {
  const [isDayTime, setIsDayTime] = useState<boolean>(true);
  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      setIsDayTime(hour >= 6 && hour < 19);
    };
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);
  return isDayTime;
};

interface AppNotification { id: string; title: string; message: string; action?: string; read: boolean; timestamp?: number; }

const UserNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, user } = useAuth();
  const isDay = useTimeBasedTheme();

  // Notificações vazias à espera dos links/dados reais do app (mensagens, gosto, comentário)
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const unreadCount = appNotifications.filter(n => !n.read).length;

  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [aiCameraMode, setAiCameraMode] = useState<'camera' | 'ai'>('camera');
  
  // ESTADOS PARA CONTROLAR AS PÁGINAS MODAIS
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false); // <-- ESTADO PARA MODAL DE PESQUISA

  const [navOffset, setNavOffset] = useState({ x: 0, y: 0 });
  const navDragStateRef = useRef<{ dragging: boolean; startX: number; startY: number; originX: number; originY: number } | null>(null);

  const isClipsPage = location.pathname === '/clips' || location.pathname === '/';
  const isProfilePage = location.pathname.includes('/profile');

  useEffect(() => {
    setNavOffset({ x: 0, y: 0 });
    setShowNotifications(false);
  }, [location.pathname]);

  const handleNavPointerDown = (e: React.PointerEvent) => {
    if (!isClipsPage) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    navDragStateRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, originX: navOffset.x, originY: navOffset.y };
  };

  const handleNavPointerMove = (e: React.PointerEvent) => {
    const dragState = navDragStateRef.current;
    if (!dragState?.dragging) return;
    setNavOffset({ x: dragState.originX + (e.clientX - dragState.startX), y: dragState.originY + (e.clientY - dragState.startY) });
  };

  const handleNavPointerUp = () => {
    if (navDragStateRef.current) navDragStateRef.current.dragging = false;
  };

  const handleNotificationClick = (id: string, actionUrl?: string) => {
    setAppNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setShowNotifications(false);
    if (actionUrl) navigate(actionUrl);
  };

  // Barra flutuante com botão central perfeitamente centralizado na pílula
  const FloatingBottomNav = () => (
    <div
      onPointerDown={handleNavPointerDown}
      onPointerMove={handleNavPointerMove}
      onPointerUp={handleNavPointerUp}
      onPointerCancel={handleNavPointerUp}
      style={{ transform: `translate(calc(-50% + ${navOffset.x}px), ${navOffset.y}px)`, touchAction: isClipsPage ? 'none' : 'auto' }}
      className={`lg:hidden fixed bottom-6 left-1/2 z-[200] w-[85%] max-w-[320px] h-[58px] ${isDay ? 'bg-white/95 border-zinc-200' : 'bg-[#1c1c1e]/95 border-white/10'} backdrop-blur-2xl border rounded-full flex items-center justify-around px-6 shadow-2xl pointer-events-auto ${isClipsPage ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <button
        onClick={() => navigate('/clips')}
        className={`flex flex-col items-center gap-1 transition-colors ${location.pathname === '/clips' || location.pathname === '/' ? (isDay ? 'text-black scale-110' : 'text-white scale-110') : 'text-zinc-500 hover:text-red-500'}`}
      >
        <Video size={24} />
      </button>

      {/* Botão central perfeitamente alinhado verticalmente no meio da altura da barra */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] active:scale-95 transition-transform"
        >
          <Plus size={26} strokeWidth={3} />
        </button>
      </div>

      <button
        onClick={() => navigate('/profile')}
        className={`flex flex-col items-center gap-1 transition-colors ${location.pathname.includes('/profile') ? (isDay ? 'text-black scale-110' : 'text-white scale-110') : 'text-zinc-500 hover:text-red-500'}`}
      >
        <User size={24} />
      </button>
    </div>
  );

  const navThemeClass = isDay ? 'bg-gradient-to-b from-white/90 to-transparent text-black' : 'bg-gradient-to-b from-black/90 to-transparent text-white';

  return (
    <>
      {/* NAVBAR SUPERIOR */}
      <nav className={`fixed top-0 w-full z-[100] px-4 md:px-12 py-3 flex items-center justify-between ${navThemeClass} pointer-events-none`}>
        <div className="text-xl md:text-2xl font-black text-red-600 tracking-tighter cursor-pointer select-none drop-shadow-md pointer-events-auto" onClick={() => navigate('/clips')}>
          BAZAR <span className={isDay ? 'text-black' : 'text-white'}>TV</span>
        </div>

        {/* Lado Direito do Topo */}
        <div className="flex items-center gap-3 md:gap-6 pointer-events-auto">
          {isProfilePage ? (
            // EXCLUSIVO NO PERFIL: Apenas o sino de notificações aguardando links/dados reais
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2 ${isDay ? 'text-zinc-700 hover:text-red-600' : 'text-gray-200 hover:text-red-500'}`} title="Notificações">
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full" />}
              </button>
              {showNotifications && (
                <div className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl p-4 border z-[250] ${isDay ? 'bg-white border-zinc-200 text-black' : 'bg-[#18181b] border-white/10 text-white'}`}>
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-500/20 mb-2">
                    <h4 className="font-bold text-sm">Notificações</h4>
                    <span className="text-[10px] text-zinc-400">Aguardando dados...</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {appNotifications.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-6">Sem notificações no momento.</p>
                    ) : (
                      appNotifications.map(n => (
                        <div key={n.id} onClick={() => handleNotificationClick(n.id, n.action)} className={`p-2 rounded-xl text-xs cursor-pointer ${!n.read ? 'bg-red-500/10' : ''} hover:bg-white/5`}>
                          <p className="font-semibold">{n.title}</p>
                          <p className="text-zinc-400 text-[11px]">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // NO CLIP FEED: 1. Grupo 3 pessoas com +, 2. Adicionar 1 pessoa, 3. Lupa abrindo o SearchPage modal
            <>
              {/* 1. Grupo 3 pessoas com + */}
              <button type="button" onClick={() => setIsGroupsOpen(true)} className={`p-2 ${isDay ? 'text-zinc-600 hover:text-red-600' : 'text-gray-200 hover:text-red-500'} relative`} title="Grupos e Mensagens">
                <Users size={20} />
                <Plus size={10} className="absolute bottom-1 right-1 bg-red-600 text-white rounded-full p-[1px] font-bold" />
              </button>

              {/* 2. Adicionar 1 pessoa */}
              <button type="button" onClick={() => setIsFriendsOpen(true)} className={`p-2 ${isDay ? 'text-zinc-600 hover:text-red-600' : 'text-gray-200 hover:text-red-500'}`} title="Adicionar Amigo">
                <UserPlus size={20} />
              </button>

              {/* 3. Lupa de pesquisa acionando a SearchPage em modo modal/overlay */}
              <button 
                type="button" 
                onClick={() => setIsSearchOpen(true)} 
                className={`p-2 ${isDay ? 'text-zinc-600 hover:text-red-600' : 'text-gray-200 hover:text-red-500'}`}
                title="Pesquisar"
              >
                <Search size={20} />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* BARRA INFERIOR ARRASTÁVEL */}
      <FloatingBottomNav />

      {/* MODAL DO BOTÃO + */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 w-full max-w-md rounded-3xl p-6 relative shadow-2xl text-white">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-white/5">
              <X size={20} />
            </button>

            <div className="flex bg-white/5 p-1 rounded-2xl mb-5">
              <button onClick={() => setAiCameraMode('camera')} className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${aiCameraMode === 'camera' ? 'bg-red-600 text-white' : 'text-zinc-400'}`}>
                <Camera size={16} /> Gravar Corte
              </button>
              <button onClick={() => setAiCameraMode('ai')} className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${aiCameraMode === 'ai' ? 'bg-red-600 text-white' : 'text-zinc-400'}`}>
                <Sparkles size={16} /> Bazar AI
              </button>
            </div>

            {aiCameraMode === 'camera' ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-red-600/20 border border-red-500/40 rounded-full flex items-center justify-center mx-auto text-red-500">
                  <Camera size={30} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Abrir Câmara Bazar TV</h3>
                  <p className="text-xs text-zinc-400 mt-1">Grave os teus vídeos em Cabinda.</p>
                </div>
                <button onClick={() => { setShowCreateModal(false); navigate('/upload'); }} className="w-full py-3 bg-red-600 text-white font-bold rounded-2xl">
                  Iniciar Gravação
                </button>
              </div>
            ) : (
              <div className="py-2">
                <ChatBotBazar provider="gemini" embedded={true} botName="Bazar AI Studio" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPONENTES MODAIS (AMIGOS, GRUPOS E PESQUISA) */}
      <FriendsPage 
        isOpen={isFriendsOpen} 
        onClose={() => setIsFriendsOpen(false)} 
        onShowToast={(msg) => alert(msg)} 
      />

      <GroupsPage 
        isOpen={isGroupsOpen} 
        onClose={() => setIsGroupsOpen(false)} 
      />

      {isSearchOpen && (
        <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative min-h-screen">
            <button 
              onClick={() => setIsSearchOpen(false)} 
              className="fixed top-4 right-4 z-[510] p-2.5 rounded-full bg-red-600 text-white shadow-lg active:scale-95"
            >
              <X size={20} />
            </button>
            <SearchPage />
          </div>
        </div>
      )}
    </>
  );
};

export default UserNavbar;