import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout do Admin (menu, topo, etc)
import AdminLayout from "./layout/AdminLayout";

// Páginas do Admin
import AdminDashboard from "./pages/Dashboard";
import AdminUpload from "./pages/Upload";
import AdminUsers from "./pages/Users";
import AdminSettings from "./pages/Settings";
import AdminTelemetry from "./pages/Telemetry";
import AdminStudioAI from "./pages/StudioAI";
import AdminPayments from "./pages/Payments";
import AdminHeroSection from "./pages/HeroSection"; 

// 🚨 AS 3 PÁGINAS QUE FALTAVAM (Ajuste o nome das pastas se for diferente no seu VS Code)
import ContentManager from "./pages/Content"; 
import Subscriptions from "./pages/Subscriptions"; 
import LiveChannels from "./pages/LiveChannels"; 

const AdminRoutes = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {/* /admin */}
        <Route index element={<AdminDashboard />} />

        {/* /admin/dashboard */}
        <Route path="dashboard" element={<Navigate to="/admin" replace />} />

        {/* Rotas de Conteúdo e Geral */}
        <Route path="upload" element={<AdminUpload />} />
        <Route path="telemetry" element={<AdminTelemetry />} />
        <Route path="studio-ai" element={<AdminStudioAI />} />
        
        {/* 🚨 ROTAS DA BIBLIOTECA E CANAIS */}
        <Route path="content" element={<ContentManager />} />
        <Route path="channels" element={<LiveChannels />} />
        
        {/* Gestão */}
        <Route path="users" element={<AdminUsers />} />
        <Route path="payments" element={<AdminPayments />} />
        
        {/* 🚨 ROTA DE ASSINATURAS (Para ver quem tem dias a expirar) */}
        <Route path="subscriptions" element={<Subscriptions />} /> 
        
        <Route path="settings" element={<AdminSettings />} />
        
        {/* Personalização */}
        <Route path="hero-section" element={<AdminHeroSection />} /> 

      </Route>

      {/* Qualquer rota errada dentro do admin volta ao dashboard */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default AdminRoutes;