import { useAuthContext } from '../../shared/context/AuthContext';

export const useAuth = () => {
  const auth = useAuthContext();
  
  return {
    ...auth,
    // Garantia de que o plano existe para o PlanGuard não falhar
    activePlan: auth.userData?.plan?.toLowerCase() || 'mobile',
    sessions: auth.userData?.active_sessions || []
  };
};