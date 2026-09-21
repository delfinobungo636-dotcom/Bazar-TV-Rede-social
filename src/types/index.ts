// src/types/index.ts

export interface Movie {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    videoUrl: string;
    category: string;
    type: 'movie' | 'series' | 'live';
    createdAt?: any;
  }
  
  export interface UserProfile {
    uid: string;
    email: string;
    role: 'user' | 'admin';
    plan: 'mobile' | 'premium' | 'standard' | 'familia';
    name?: string;
  }