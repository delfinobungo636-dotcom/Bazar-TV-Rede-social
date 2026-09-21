import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import BazarAdminAssistant from '../BazarAdminAssistant'; // 1. IMPORTA AQUI A TUA IA

const AdminLayout = () => {
  return (
    <div className="flex min-h-screen bg-[#0f172a]">
      {/* 1. Coloca a Barra Lateral fixa na esquerda */}
      <AdminSidebar />

      {/* 2. Área Principal (Onde vai aparecer o Upload) */}
      <main className="flex-1 md:ml-64 transition-all duration-300 relative">
        {/* O Outlet carrega a página que estás a visitar */}
        <Outlet />
      </main>

      {/* 3. COLOCA O ASSISTENTE AQUI NO FUNDO DO LAYOUT */}
      <BazarAdminAssistant />
    </div>
  );
};

export default AdminLayout;