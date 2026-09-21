
import React, { useEffect } from 'react';
import { User, RoutePath } from '../types';

interface AdminRouteProps {
  currentUser: User | null;
  onNavigate: (path: RoutePath) => void;
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ currentUser, onNavigate, children }) => {
  useEffect(() => {
    // Lógica do Porteiro:
    // 1. Verifica se existe um utilizador logado.
    // 2. Verifica se o email corresponde ao administrador.
    const isAuthorized = currentUser && currentUser.email === 'admin@bazartv.com';

    if (!isAuthorized) {
      // Intruso detectado! Redirecionando para a segurança da Home.
      onNavigate('/');
    }
  }, [currentUser, onNavigate]);

  // Enquanto verifica ou se não for autorizado, não renderiza nada para evitar "flash" de conteúdo
  if (!currentUser || currentUser.email !== 'admin@bazartv.com') {
    return null;
  }

  // Autorizado: Pode entrar
  return <>{children}</>;
};
export default 'AdminRoute'