import React from 'react';
import { useAuthContext } from './shared/context/AuthContext';
import { AlertTriangle } from 'lucide-react';
import PublicRoutes from './public-app/PublicRoutes';
import UserRoutes from './user-app/UserRoutes';
import './styles/index.css';
import ChatBotBazar from './shared/components/ChatBotBazar';

export default function App() {
  const { user, loading, sysConfig, isAdmin } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mb-4"></div>
      </div>
    );
  }

  // 🚨 AQUI ESTÁ O BLOQUEIO REAL DO MODO DE MANUTENÇÃO 🚨
  if (sysConfig?.maintenanceMode === true && !isAdmin) {
    return (
      <div className="fixed inset-0 min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-6 text-center z-[9999]">
        <AlertTriangle size={80} className="text-red-500 mb-6 animate-pulse" />
        <h1 className="text-4xl font-black mb-4 uppercase italic">Sistema em Atualização</h1>
        <p className="text-zinc-400 max-w-md">Voltaremos online em breve com melhorias na rede.</p>
      </div>
    );
  }

  // 🚀 VERIFICAÇÃO DE ROTA: Descobre se estamos no painel de administração
  const isAdminRoute = window.location.pathname.startsWith('/admin');

  return (
    <>
      {user ? <UserRoutes /> : <PublicRoutes />}
      
      {/* O CHATBOT VERMELHO SÓ APARECE SE NÃO ESTIVERMOS NO ADMIN APP */}
      {!isAdminRoute && (
        <ChatBotBazar provider="gemini" accentColor="#e63946" side="right" botName="Bazar AI (Gemini)" />
      )}
    </>
  );
}