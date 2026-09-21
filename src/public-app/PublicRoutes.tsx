import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Importações Originais
import ShowCase from './pages/ShowCase'; 
import Home from "./pages/Home";
import Pricing from "./pages/Pricing"; // Confirma se tens esta página ou remove

// Novas Importações (Links Rápidos)
import Conta from "./pages/conta";
import Ajuda from "./pages/ajuda";
import TermosDeUso from "./pages/TermosDeUso";
import Privacidade from "./pages/privacidade";

// Novas Importações (Categorias)
import Desporto from "./pages/desporto";
import Filmes from "./pages/filmes";
import Noticias from "./pages/noticias";
import Infantil from "./pages/infantil";

const PublicRoutes = () => {
  return (
    <Routes>
      {/* Rota Principal: Landing Page */}
      <Route path="/" element={<Home />} />

      <Route path="/descobrir" element={<ShowCase />} />
      
      {/* Outras páginas públicas */}
      <Route path="/pricing" element={<Pricing />} />

      {/* ==========================================
          ROTAS DOS LINKS RÁPIDOS E RODAPÉ
      ========================================== */}
      <Route path="/conta" element={<Conta />} />
      <Route path="/ajuda" element={<Ajuda />} />
      <Route path="/termos-de-uso" element={<TermosDeUso />} />
      <Route path="/privacidade" element={<Privacidade />} />

      {/* ==========================================
          ROTAS DAS CATEGORIAS (SHOWCASES)
      ========================================== */}
      <Route path="/desporto" element={<Desporto />} />
      <Route path="/filmes" element={<Filmes />} />
      <Route path="/noticias" element={<Noticias />} />
      <Route path="/infantil" element={<Infantil />} />

      {/* 🛑 CORREÇÃO: Catch-all seguro.
          Se o usuário tentar uma rota maluca na parte pública, manda para Home. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default PublicRoutes;