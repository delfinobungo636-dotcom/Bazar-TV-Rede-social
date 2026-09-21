import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import HeroSection from '../components/HeroSection';
import LoginModal from '../components/modals/LoginModal';
import RegisterModal from '../components/modals/RegisterModal';
import PlansModal from '../components/modals/PlansModal';
import ChatBotBazar from '../../shared/components/ChatBotBazar'; // Confirma se o caminho é este

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

const Home = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const isDay = useTimeBasedTheme();

  // Função auxiliar: Quando escolhem um plano na Janela, abre o Registo
  const handlePlanSelected = (plan: any) => {
    console.log("Plano escolhido:", plan);
    setShowPlansModal(false); // Fecha a janela dos planos
    setShowRegister(true);    // Abre o registo
  };

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden transition-colors duration-500 ${isDay ? 'bg-[#f5f5f5] text-black' : 'bg-[#141414] text-white'}`}>
      
      {/* 1. Barra de Navegação */}
      <Navbar 
        onOpenLogin={() => setShowLogin(true)} 
        onOpenPlans={() => setShowPlansModal(true)} 
      />

      {/* 2. Hero Section */}
      <HeroSection onStart={() => setShowPlansModal(true)} />

      {/* 4. Rodapé */}
      <Footer />

      {/* --- AS JANELAS (MODAIS) --- */}
      {showPlansModal && (
        <PlansModal 
          isOpen={showPlansModal}
          onClose={() => setShowPlansModal(false)}
          onSelectPlan={handlePlanSelected}
        />
      )}

      {showLogin && (
        <LoginModal 
          isOpen={showLogin} 
          onClose={() => setShowLogin(false)} 
          onSwitchToRegister={() => { setShowLogin(false); setShowRegister(true); }}
        />
      )}
      
      {showRegister && (
        <RegisterModal 
          isOpen={showRegister} 
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={() => { setShowRegister(false); setShowLogin(true); }}
        />
      )}
      {/* 🔵 ARENA DO DUELO DE IAS */}
      {/* <ChatBotBazar /> */}

    </div>
  );
};

export default Home;