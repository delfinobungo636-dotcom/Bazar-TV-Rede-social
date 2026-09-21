import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { auth } from "../shared/services/firebase";
import { useAuth } from "../modules/auth/auth.hooks";

// Layout & Segurança
import UserLayout from "./components/layout/UserLayout";
import PlanGuard from "./components/layout/PlanGuard";

// User pages
import UserDashboard from "./pages/Dashboard";
import Movies from "./pages/Movies";
import Series from "./pages/Series";
import Desenhos from "./pages/Desenhos";
import Comedia from './pages/Comedia';
import Ficcao from './pages/Ficcao';
import Novelas from "./pages/Novelas";
import LiveTV from "./pages/LiveTV";
import MyList from "./pages/MyList";
import Profile from "./pages/Profile";

// 🚀 NOVA PÁGINA DO SCROLL VERTICAL (CLIPS)
import ClipsFeed from "./pages/ClipsFeed/ClipsFeed";
// Search, Notifications & Paywall
import SearchPage from "./pages/SearchPage";
import NotificationsPage from "./pages/NotificationPage";
import PaywallPage from "./pages/Paywallpage";
import WatchPage from "./pages/WatchPage";

// Admin
import AdminRoutes from "../admin-app/AdminRoutes";

const UserRoutes = () => {
  const { user, userData } = useAuth();

  const isAdmin = userData?.role === "admin" || user?.email === "geral@bazartv-ao.com";
  const hasPendingPayment = userData?.status === 'waiting_payment' || userData?.status === 'pending';

  return (
    <Routes>
      <Route path="/admin/*" element={isAdmin ? <AdminRoutes /> : <Navigate to="/" replace />} />

      <Route element={<UserLayout />}>

        {/* 🚨 ZONA DE BLOQUEIO DO PAYWALL (Ainda assim permite ver o Scroll de Cortes e o Perfil) */}
        {hasPendingPayment && !isAdmin ? (
          <>
            <Route index element={<ClipsFeed />} />
            <Route path="clips" element={<ClipsFeed />} />
            <Route path="pagamento" element={<PaywallPage />} />
            
            {/* ✅ CORREÇÃO: Duas rotas para o perfil (Meu perfil e Perfil de Outros) */}
            <Route path="profile" element={<Profile user={(userData || user) as any} content={[]} onPlay={() => { }} onBack={() => window.history.back()} onLogout={() => auth.signOut()} onUpdateUser={() => { }} />} />
            <Route path="profile/:userId" element={<Profile user={(userData || user) as any} content={[]} onPlay={() => { }} onBack={() => window.history.back()} onLogout={() => auth.signOut()} onUpdateUser={() => { }} />} />
            
            <Route path="*" element={<Navigate to="/clips" replace />} />
          </>
        ) : (
          /* ✅ ZONA VIP (Pagamento Aprovado) ✅ */
          <>
            {/* O Scroll é a rota inicial padrão / e /clips */}
            <Route path="clips" element={<ClipsFeed />} />

            {/* 🛡️ CORDÃO DE SEGURANÇA DO PLANGUARD PARA FILMES/SÉRIES COMPLETAS 🛡️ */}
            <Route element={<PlanGuard><Outlet /></PlanGuard>}>
              <Route index element={isAdmin ? <Navigate to="/admin" replace /> : <ClipsFeed />} />
              <Route path="dashboard" element={<UserDashboard />} />
              <Route path="movies" element={<Movies />} />
              <Route path="series" element={<Series />} />
              <Route path="Desenhos" element={<Desenhos />} />
              <Route path="ficcao" element={<Ficcao />} />
              <Route path="comedia" element={<Comedia />} />
              <Route path="novelas" element={<Novelas />} />
              <Route path="live" element={<LiveTV />} />
              <Route path="my-list" element={<MyList />} />

              <Route path="search" element={<SearchPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="watch/:id" element={<WatchPage />} />
            </Route>

            {/* ✅ CORREÇÃO: Duas rotas para o perfil (Meu perfil e Perfil de Outros) */}
            <Route path="profile" element={<Profile user={(userData || user) as any} content={[]} onPlay={() => { }} onBack={() => window.history.back()} onLogout={() => auth.signOut()} onUpdateUser={() => { }} />} />
            <Route path="profile/:userId" element={<Profile user={(userData || user) as any} content={[]} onPlay={() => { }} onBack={() => window.history.back()} onLogout={() => auth.signOut()} onUpdateUser={() => { }} />} />

            <Route path="*" element={<Navigate to="/clips" replace />} />
          </>
        )}

      </Route>
    </Routes>
  );
};

export default UserRoutes;