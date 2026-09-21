import { create } from 'zustand';

// Definimos o que a nossa Store vai guardar
interface AdminState {
  adminEmail: string | null;
  isAuthenticated: boolean;
  setAdmin: (email: string | null) => void;
  logout: () => void;
}

// Criamos o "Cofre" (Store)
export const useAdminStore = create<AdminState>((set) => ({
  adminEmail: null,
  isAuthenticated: false,

  // Função para guardar o admin quando ele faz login
  setAdmin: (email) => set({ 
    adminEmail: email, 
    isAuthenticated: !!email 
  }),

  // Função para limpar tudo quando sair
  logout: () => set({ 
    adminEmail: null, 
    isAuthenticated: false 
  }),
}));