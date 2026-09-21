import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// --- 1. IMPORTAÇÕES CORRIGIDAS (O SEGREDO DOS ERROS) ---

// Componentes que usam "export function" -> PRECISAM DE CHAVES { }
import { LandingPage } from './components/LandingPage';
import { SubscriptionPlans } from './components/SubscriptionPlans';
import { AdminDashboard } from './components/AdminDashboard';
import { ContentModal } from './components/ContentModal';
import { NotificationCenter } from './components/NotificationCenter';
import { Footer } from './components/Footer';

// Componentes que usam "export default" -> NÃO USAM CHAVES
import Dashboard from './components/Dashboard'; 
import BazarStudio from './components/BazarStudio';
import UserProfile from './components/UserProfile';

// Ícones
import { LogOut, User, Lock, Clock, Smartphone, Monitor } from 'lucide-react';

export function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Detetive de Rotas: Verifica se estamos no Admin
  const isAdminRoute = location.pathname.startsWith('/admin');

  // --- DETECTOR DE DISPOSITIVO ---
  // Retorna "true" se for celular/tablet, "false" se for PC/TV
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // --- 1. VERIFICAÇÃO DE LOGIN ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Busca os dados do plano e aprovação no banco de dados
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUser({ ...currentUser, ...userDoc.data() });
        } else {
          // Se não tiver dados, assume que não está aprovado e plano é mobile
          setUser({ ...currentUser, approved: false, plan: 'mobile' }); 
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  // --- 2. TELA DE CARREGAMENTO ---
  if (loading) return (
    <div className="h-screen bg-black text-white flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // --- 3. NÃO LOGADO -> MOSTRA LANDING PAGE ---
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage onLoginSuccess={() => {}} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  // --- 4. BLOQUEIO DE SEGURANÇA: CONTA EM ANÁLISE ---
  // Se o admin ainda não aprovou (approved !== true), mostra o relógio
  if (user.approved !== true && user.role !== 'admin') {
    return (
      <div className="h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 max-w-md shadow-2xl">
          <div className="w-16 h-16 bg-yellow-900/30 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Conta em Análise</h1>
          <p className="text-gray-400 mb-6">
            Olá, <span className="text-white font-bold">{user.displayName || user.email}</span>. 
            O seu pedido está pendente. Aguarde a aprovação do administrador.
          </p>
          <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </div>
    );
  }

  // --- 5. BLOQUEIO DE PLANO: MOBILE NO PC ---
  // Se o plano for 'mobile' E o dispositivo NÃO for celular -> Bloqueia e pede Upgrade
  if (user.plan === 'mobile' && !isMobileDevice && user.role !== 'admin') {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden">
        {/* Fundo desfocado */}
        <div className="absolute inset-0 bg-[url('https://assets.nflxext.com/ffe/siteui/vlv3/f85718e0-bc46-4f47-90f8-b7870e95f456/public/PT-pt-20230807-popsignuptwoweeks-perspective_alpha_website_medium.jpg')] bg-cover opacity-20 blur-sm"></div>
        
        <div className="bg-zinc-900/90 p-10 rounded-3xl border border-zinc-700 max-w-lg shadow-2xl relative z-10 backdrop-blur-md">
          <div className="flex justify-center gap-4 mb-6">
             <div className="w-16 h-16 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center"><Smartphone size={32}/></div>
             <div className="w-16 h-16 bg-zinc-700 text-gray-400 rounded-full flex items-center justify-center"><Monitor size={32}/></div>
          </div>
          
          <h1 className="text-3xl font-bold mb-4">Acesso Restrito ao Telemóvel</h1>
          <p className="text-gray-300 mb-6 text-lg">
            O seu plano atual <b>(Mobile)</b> permite assistir apenas em telemóveis ou tablets. Detectamos que está a tentar aceder por um Computador ou TV.
          </p>

          <div className="bg-gradient-to-r from-red-900/50 to-black p-4 rounded-xl border border-red-500/30 mb-8">
            <h3 className="font-bold text-red-400 mb-1">Faça Upgrade para ver aqui!</h3>
            <p className="text-sm text-gray-400">Desbloqueie PC, TV e qualidade HD a partir de 2.999 Kz.</p>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/plans')} className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition text-lg">
              Ver Planos de Upgrade 🚀
            </button>
            <button onClick={handleLogout} className="text-gray-500 hover:text-white text-sm mt-2">
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 6. APLICAÇÃO PRINCIPAL (LOGADO E APROVADO) ---
  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col font-sans">
      
      {/* NAVBAR (Escondida se estiver no Admin) */}
      {!isAdminRoute && (
        <nav className="fixed w-full z-50 bg-gradient-to-b from-black/90 to-transparent px-4 md:px-8 py-4 flex justify-between items-center transition-all duration-300">
          <div className="flex items-center gap-8">
            <h1 className="text-red-600 text-2xl md:text-3xl font-bold tracking-tighter cursor-pointer hover:scale-105 transition" onClick={() => navigate('/')}>
              BAZAR TV
            </h1>
            <div className="hidden md:flex gap-6 text-sm font-medium text-gray-300">
              <button onClick={() => navigate('/')} className="hover:text-white transition">Início</button>
              <button onClick={() => navigate('/studio')} className="hover:text-white transition">Estúdio AI</button>
              <button onClick={() => navigate('/plans')} className="hover:text-white transition">Planos</button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Botão Admin só aparece para quem tem role='admin' */}
            {user.role === 'admin' && (
              <button onClick={() => navigate('/admin')} className="text-[10px] bg-red-600 text-white px-3 py-1 rounded font-bold hover:bg-red-700 shadow-lg">
                PAINEL ADMIN
              </button>
            )}
            
            <NotificationCenter />
            
            <div className="flex items-center gap-3">
               <button onClick={() => navigate('/profile')} className="hover:bg-white/10 p-2 rounded-full transition">
                 <User className="w-6 h-6 text-gray-300 hover:text-white" />
               </button>
               <button onClick={handleLogout} className="hover:bg-white/10 p-2 rounded-full transition">
                 <LogOut className="w-6 h-6 text-gray-300 hover:text-red-500" />
               </button>
            </div>
          </div>
        </nav>
      )}

      {/* ÁREA DE ROTAS (Se for Admin, ocupa a tela toda. Se não, deixa espaço para a Navbar) */}
      <div className={isAdminRoute ? "w-full min-h-screen" : "flex-1 pt-20"}>
        <Routes>
          {/* Dashboard passa user e função para abrir modal */}
          <Route path="/" element={<Dashboard user={user} onMovieClick={setSelectedMovie} />} />
          
          <Route path="/studio" element={<BazarStudio onBack={() => navigate('/')} />} />
          
          <Route path="/plans" element={
            <SubscriptionPlans 
              onBack={() => navigate('/')} 
              onSelect={(p:any) => console.log("Plano selecionado:", p)} 
            />
          } />
          
          <Route path="/profile" element={
             <UserProfile 
               user={user} 
               onBack={() => navigate('/')} 
               onLogout={handleLogout} 
               onUpdateUser={(u:any) => setUser(u)} 
             />
          } />
          
          {/* Rota Protegida do Admin */}
          <Route path="/admin" element={
            user.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>

      {/* FOOTER (Escondido se estiver no Admin) */}
      {!isAdminRoute && <Footer />}

      {/* MODAL GLOBAL (Abre por cima de tudo) */}
      {selectedMovie && (
        <ContentModal 
          content={selectedMovie} 
          user={user} 
          allMovies={[]} 
          onClose={() => setSelectedMovie(null)}
          onChangeContent={setSelectedMovie}
        />
      )}
    </div>
  );
}