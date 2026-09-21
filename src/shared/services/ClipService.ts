import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, writeBatch, query, where, orderBy, serverTimestamp, increment } from 'firebase/firestore';
import { db } from './firebase';

export interface ClipItem {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  posterUrl?: string;
  movieId?: string;
  tags?: string;
  publisherId: string;
  createdAt?: any;
}

// Publica o corte unificando no feed global e nos cortes do próprio utilizador
export const publicarCorte = async (userId: string, videoData: { url: string; title: string; description?: string; thumbnail?: string; movieId?: string; tags?: string }) => {
  try {
    const batch = writeBatch(db);
    const globalCortesRef = doc(collection(db, 'clips')); 
    const userProfileRef = doc(collection(db, `users/${userId}/meusCortes`), globalCortesRef.id);

    const novoCorte = {
      publisherId: userId,
      videoUrl: videoData.url,
      title: videoData.title,
      description: videoData.description || '',
      posterUrl: videoData.thumbnail || '',
      movieId: videoData.movieId || '',
      tags: videoData.tags || 'BAZAR TV • COMUNIDADE',
      createdAt: serverTimestamp(),
      likes: 0
    };

    batch.set(globalCortesRef, novoCorte);
    batch.set(userProfileRef, novoCorte);
    await batch.commit();
    return { sucesso: true, id: globalCortesRef.id };
  } catch (error) {
    console.error('Erro ao publicar corte:', error);
    return { sucesso: false, error };
  }
};

// Sistema de Seguidores (Following / Followers)
export const seguirUtilizador = async (currentUserId: string, targetUserId: string) => {
  if (currentUserId === targetUserId) return;
  const followingRef = doc(db, `users/${currentUserId}/following`, targetUserId);
  const followerRef = doc(db, `users/${targetUserId}/followers`, currentUserId);

  await setDoc(followingRef, { timestamp: serverTimestamp() });
  await setDoc(followerRef, { timestamp: serverTimestamp() });

  // Incrementa contadores nas respetivas contas sem tocar em filmes
  await updateDoc(doc(db, 'users', currentUserId), { followingCount: increment(1) });
  await updateDoc(doc(db, 'users', targetUserId), { followersCount: increment(1) });
};

export const deixarDeSeguirUtilizador = async (currentUserId: string, targetUserId: string) => {
  const followingRef = doc(db, `users/${currentUserId}/following`, targetUserId);
  const followerRef = doc(db, `users/${targetUserId}/followers`, currentUserId);

  await deleteDoc(followingRef);
  await deleteDoc(followerRef);

  await updateDoc(doc(db, 'users', currentUserId), { followingCount: increment(-1) });
  await updateDoc(doc(db, 'users', targetUserId), { followersCount: increment(-1) });
};