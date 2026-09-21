import React, { useState } from 'react';
import { LayoutDashboard, Upload, Users, Settings, LogOut, Menu, X, Activity, DollarSign, Bot, Image as ImageIcon, Film, ShieldCheck, Tv } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom'; 
import { auth } from '../../shared/services/firebase'; 

const AdminSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation(); 

  const handleLogout = async () => {
    await auth.signOut();
    window.location.href = '/';
  };

  const getLinkClass = (path: string) => {
    const isActive = location.pathname.includes(path);
    return `flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
      isActive ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
    }`;
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg md:hidden text-white cursor-pointer"
      >
        {isOpen ? <X /> : <Menu />}
      </button>

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-[#1e293b] border-r border-gray-700 flex flex-col transition-transform duration-300 z-40
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Estúdio Bazar</h2>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto pb-10 custom-scrollbar">
          
          <p className="text-xs font-bold text-gray-500 uppercase mt-2 mb-2 px-2">Geral</p>
          <Link to="/admin/dashboard" className={getLinkClass('/admin/dashboard')}>
            <LayoutDashboard className="w-5 h-5" /> <span>Dashboard</span>
          </Link>
          <Link to="/admin/telemetry" className={getLinkClass('/admin/telemetry')}>
            <Activity className="w-5 h-5" /> <span>Telemetria</span>
          </Link>

          <p className="text-xs font-bold text-gray-500 uppercase mt-6 mb-2 px-2">Conteúdo</p>
          <Link to="/admin/upload" className={getLinkClass('/admin/upload')}>
            <Upload className="w-5 h-5" /> <span>Upload de Vídeos</span>
          </Link>
          <Link to="/admin/content" className={getLinkClass('/admin/content')}>
            <Film className="w-5 h-5" /> <span>Biblioteca</span>
          </Link>
          <Link to="/admin/channels" className={getLinkClass('/admin/channels')}>
            <Tv className="w-5 h-5" /> <span>Canais ao Vivo</span>
          </Link>
          <Link to="/admin/hero-section" className={getLinkClass('/admin/hero-section')}>
            <ImageIcon className="w-5 h-5" /> <span>Destaque (Hero)</span>
          </Link>
          <Link to="/admin/studio-ai" className={getLinkClass('/admin/studio-ai')}>
            <Bot className="w-5 h-5" /> <span>Studio AI</span>
          </Link>

          <p className="text-xs font-bold text-gray-500 uppercase mt-6 mb-2 px-2">Gestão</p>
          <Link to="/admin/users" className={getLinkClass('/admin/users')}>
            <Users className="w-5 h-5" /> <span>Utilizadores</span>
          </Link>
          <Link to="/admin/subscriptions" className={getLinkClass('/admin/subscriptions')}>
             <ShieldCheck className="w-5 h-5" /> <span>Assinaturas</span>
          </Link>
          <Link to="/admin/payments" className={getLinkClass('/admin/payments')}>
            <DollarSign className="w-5 h-5" /> <span>Financeiro</span>
          </Link>
          <Link to="/admin/settings" className={getLinkClass('/admin/settings')}>
            <Settings className="w-5 h-5" /> <span>Configurações</span>
          </Link>

        </nav>

        <div className="p-4 border-t border-gray-700 mt-auto flex-shrink-0">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 text-gray-400 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair da Conta</span>
          </button>
        </div>

      </aside>
    </>
  );
};

export default AdminSidebar;