export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface User {
  name: string;
  email: string;
  password?: string;
  plan?: string;
  status?: string;
  phone?: string;
  profileImage?: string;
  coverImage?: string;
  isAdmin?: boolean;
  bazarCardId?: string;
  bazarCardBalance?: number;
  resetToken?: string;
  // Estes campos corrigem os erros vermelhos do dbService:
  myList?: string[];
  notifications?: Notification[];
  validUntil?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  type: 'movie' | 'series' | 'novelas' | 'cartoon' | 'live';
  coverUrl: string;
  videoUrl?: string;
  year: number;
  rating: string;
  views?: number;
}

export type RoutePath = '/' | '/series' | '/filmes' | '/bombasticos' | '/minha-lista' | '/perfil' | '/live' | '/novelas' | '/desenhos' | '/studio';