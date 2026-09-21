import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import Navbar from './UserNavbar';

export default function UserLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-red-600 selection:text-white cursor-default overflow-x-hidden">
      
      {/* Navbar principal sempre visível */}
      <Navbar />

      {/* Menu Mobile Otimizado (Sem a redundância da Minha Lista aqui) */}
      <div className={`
        fixed inset-0 z-[70] transform transition-transform duration-500 ease-in-out md:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="absolute inset-0 bg-[#0a0a0a] h-full flex flex-col">
          
          {/* Cabeçalho do Menu Mobile */}
          <div className="flex justify-between items-center p-6 border-b border-white/5">
            <span className="text-xl font-black text-red-600 tracking-tighter">BAZAR TV</span>
            <button 
              onClick={closeMenu} 
              className="p-2 text-gray-400 hover:text-white bg-zinc-900 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Links de Navegação Mobile */}
          <nav className="flex flex-col space-y-4 p-8 text-center text-lg font-bold">
            <MobileLink to="/" label="Início" onClick={closeMenu} end />
            <MobileLink to="/movies" label="Filmes " onClick={closeMenu} />
            <MobileLink to="/series" label="Séries " onClick={closeMenu} />
            <MobileLink to="/cartoons" label="Desenhos " onClick={closeMenu} />
            <MobileLink to="/novelas" label="Novelas " onClick={closeMenu} />
            <MobileLink to="/live" label="Live TV 📡" onClick={closeMenu} />
            
            <div className="w-20 h-px bg-white/10 mx-auto my-4" />
            
            {/* 🚨 Removido o link 'Minha Lista' daqui para aparecer apenas no Profile */}
            <MobileLink to="/profile" label="Meu Perfil 👤" onClick={closeMenu} />
          </nav>
        </div>
      </div>

      {/* Ajuste de Padding: 
          pt-0 para o Dashboard (que usa Hero de tela cheia)
          pt-24 para as outras páginas para não esconder conteúdo atrás da Navbar 
      */}
      <main className={`relative min-h-screen transition-all duration-300 ${
        location.pathname === '/' ? 'pt-0' : 'pt-20 md:pt-24'
      }`}>
        <Outlet />
      </main>
    </div>
  );
}

function MobileLink({ to, label, onClick, end = false }: any) {
  return (
    <NavLink 
      to={to} 
      end={end}
      onClick={onClick}
      className={({ isActive }) => 
        `block py-3 rounded-xl transition-all duration-300 cursor-pointer ${
          isActive 
            ? 'bg-red-600 text-white scale-105 shadow-lg shadow-red-900/20' 
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`
      }
    >
      {label}
    </NavLink>
  );
}