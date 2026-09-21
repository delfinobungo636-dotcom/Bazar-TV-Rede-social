// src/modules/content/content.types.ts

export interface Content {
    id: string;
  
    title: string;
    description: string;
  
    banner: string;        // imagem de destaque
    videoUrl?: string;     // opcional (nem todo conteúdo tem vídeo)
  
    category: string;      // ex: movies, series, cartoons
  
    createdAt?: number;    // firestore timestamp simplificado
  }
  