import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../shared/services/firebase'; // Confirma se o caminho do db está certo
import { AppNotification } from './notification.types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🚀 AQUI ESTÁ O SEGREDO: O nome TEM de ser igual ao Firestore!
    const q = query(
      collection(db, 'notifications'), // Usa o nome exato que tens no Firebase
      orderBy('createdAt', 'desc')      // Usa 'created' que é o nome do teu campo no Firebase
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          message: data.message || '',
          read: data.read || false,
          createdAt: data.createdAt || null, // Mapeia o 'created' do Firebase para o 'createdAt' do teu tipo
          image: data.image || null,
          action: data.action || null,
        } as AppNotification;
      });

      setNotifications(notifsData);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    const notifRef = doc(db, 'notifications', id);
    await updateDoc(notifRef, { read: true });
  };

  const clearAll = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    if (unreadNotifs.length === 0) return;

    const batch = writeBatch(db);
    unreadNotifs.forEach(notif => {
      const notifRef = doc(db, 'notifications', notif.id);
      batch.update(notifRef, { read: true });
    });
    await batch.commit();
  };

  return { notifications, loading, unreadCount, markAsRead, clearAll };
}