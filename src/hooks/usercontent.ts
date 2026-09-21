import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../shared/services/firebase'; 
import { Movie } from '../types/index';

export const useContent = () => {
  const [data, setData] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔥 CORREÇÃO: Adicionei 'limit(50)' para não travar o navegador
    const q = query(
      collection(db, "canais"), 
      orderBy("createdAt", "desc"), 
      limit(50) 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Movie[];
      
      setData(list);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar conteúdo:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { data, loading };
};