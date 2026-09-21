// src/shared/types/index.ts

// 1. O USUÁRIO (Blindado para aceitar tudo do código antigo)
export interface UserData {
  uid?: string;
  email?: string | null;
  
  // Nomes
  name?: string;
  displayName?: string;
  
  // Imagens
  photoURL?: string;
  profileImage?: string; // Para o código antigo não reclamar

  // Negócio
  role?: 'admin' | 'user' | string;
  status?: 'active' | 'waiting_payment' | 'blocked' | string;
  plan?: 'mobile' | 'standard' | 'premium' | string;
  
  // Extras
  myList?: any[];
  phone?: string;
  createdAt?: any;

  // 👇 AQUI ESTÁ A CHAVE MESTRA (Isto resolve o erro do dbService)
  // Permite qualquer outra propriedade estranha (coverImage, bazarCardID, etc.)
  [key: string]: any; 
}

// 2. O CONTEÚDO (Filmes, Séries, Novelas, Lives)
export interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  active: boolean;
  
  type: 'movie' | 'series' | 'soap_opera' | 'live';
  
  videoUrl?: string;
  category?: string;
  channelName?: 'Bazar Sports' | 'Bazar News' | 'Bazar Entretenimento' | 'Bazar Filmes';
  isLiveNow?: boolean;
  season?: number;
  episode?: number;

  createdAt?: any; // Data de criação
}

// 3. TRADUTORES (Mantém isto para o legacy funcionar)
export type User = UserData;
export type ContentItem = Movie;