import { useNotifications } from './useNotifications';
import type { AppNotification } from './notification.types';

/**
 * Facade do sistema de notificações
 * Mantém compatibilidade com o Dashboard
 * NÃO contém lógica de Firestore
 */
export function useNotification(): {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
} {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    clearAll
  } = useNotifications();

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    clearAll
  };
}