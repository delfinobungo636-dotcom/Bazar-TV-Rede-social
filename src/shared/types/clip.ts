import { Timestamp } from 'firebase/firestore';

export interface AuthorSnippet {
  uid: string;
  displayName: string;
  photoURL: string;
  isSubscribed: boolean; // Indica se é assinante ativo do Bazar TV
  planBadge?: string;    // ex: "VIP", "Premium", "Gratuito"
}

export interface Clip {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  author: AuthorSnippet;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  likedBy: string[]; // Lista de UIDs que curtiram
  tags?: string[];
  status: 'active' | 'hidden' | 'flagged'; // Útil para moderação no Admin
  isFeatured?: boolean;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface ClipComment {
  id: string;
  clipId: string;
  author: AuthorSnippet;
  text: string;
  createdAt: Timestamp | Date;
}