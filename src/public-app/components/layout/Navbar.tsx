import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, LayoutDashboard, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../modules/auth/auth.hooks';
//import InstallPWAButton from '../../../user-app/components/ui/InstallPWAButton';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenPlans: () => void;
}

const Navbar = ({ onOpenLogin, onOpenPlans }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 10);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 pointer-events-none ${isScrolled
          ? 'bg-[#141414] shadow-xl border-b border-white/5'
          : 'bg-transparent'
        }`}
    >
      <div className="w-full h-20 px-4 flex items-center justify-between">

        {/* LOGO (Esquerda) */}
        <div
          className="flex items-center gap-2 cursor-pointer select-none pointer-events-auto pl-2"
          onClick={() => navigate('/')}
        >
          <h1 className="text-red-600 text-3xl font-black tracking-tighter hover:scale-105 transition-transform">
            BAZAR<span className="text-white">TV</span>
          </h1>
        </div>

        {/* BOTÕES (Direita) */}
        <div className="flex items-center gap-3 md:gap-4 pointer-events-auto pr-2">

          {/* 1. Botão 1.000 Kz MCX */}
          <button
            onClick={onOpenPlans}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-full font-bold transition-transform active:scale-95 cursor-pointer shadow-lg shadow-red-900/20"
          >
            <span className="text-sm md:text-base">1.000 Kz</span>
            <span className="hidden md:flex text-xs bg-black/20 px-2 py-0.5 rounded items-center gap-1">
              MCX <CreditCard size={12} />
            </span>
          </button>

          {/* 2. Botão de Instalar PWA (Colocado exatamente ao lado do preço) */}


          {/* 3. Botão de Entrar ou Dashboard */}
          {user ? (
            <button
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 text-white border border-white/20 px-4 py-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer backdrop-blur-md"
            >
              <LayoutDashboard size={18} />
              <span className="hidden sm:inline">App</span>
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 text-white hover:text-red-500 font-medium transition-colors px-3 py-2 cursor-pointer"
            >
              <LogIn size={18} />
              <span className="hidden md:inline">Entrar</span>
            </button>
          )}

        </div>
      </div>
    </nav>
  );
};

export default Navbar;