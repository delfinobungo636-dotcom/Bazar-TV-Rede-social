import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  plan?: string;
  active_sessions?: string[]; 
  subscriptionStatus?: string;
  subscriptionEnds?: any; 
  [key: string]: any;
}

export interface SystemConfig {
  maintenanceMode: boolean;
  maxVideoQuality: string;
  dataSaverMode: boolean;
  allowVpn: boolean;
  freeTrialDays: number;
  pricing: { mobile: number; standard: number; premium: number; familia: number; };
  platformName: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAdmin: boolean;
  isExpired: boolean; 
  sysConfig: SystemConfig | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [sysConfig, setSysConfig] = useState<SystemConfig | null>(null);

  // 🚀 LOGOUT LIMPO
  const logout = async () => {
    try {
      if (user?.uid) {
        const deviceId = localStorage.getItem('bazar_device_id');
        const ref = doc(db, 'users', user.uid);
        if (deviceId) await updateDoc(ref, { active_sessions: arrayRemove(deviceId) });
      }
      await signOut(auth);
    } catch (e) { console.error("Erro logout:", e); }
  };

  useEffect(() => {
    // 1. Configurações Globais
    const unsubSettings = onSnapshot(doc(db, 'settings', 'platform'), (snap) => {
      if (snap.exists()) setSysConfig(snap.data() as SystemConfig);
    });

    let unsubscribeFirestore: (() => void) | null = null;

    // 2. Monitor de Autenticação
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (!firebaseUser) {
        setUserData(null);
        setIsExpired(false);
        setLoading(false); // Só para o loading aqui se não houver user
        return;
      }

      const ref = doc(db, 'users', firebaseUser.uid);
      unsubscribeFirestore = onSnapshot(ref, async (snap) => {
        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const data = snap.data() as UserData;
        let userIsExpired = false;

        // Lógica de Expiração (Apenas Leitura para evitar Loops)
        if (data.role !== 'admin') {
          if (data.subscriptionEnds) {
            const endDate = data.subscriptionEnds.toDate ? data.subscriptionEnds.toDate() : new Date(data.subscriptionEnds);
            if (new Date() > endDate) userIsExpired = true;
          }
          if (data.subscriptionStatus !== 'active') userIsExpired = true;
        }

        // REGISTO AUTOMÁTICO DE DISPOSITIVO (Native Session Logic)
        const deviceId = localStorage.getItem('bazar_device_id') || Math.random().toString(36).substring(2, 15);
        if (!localStorage.getItem('bazar_device_id')) localStorage.setItem('bazar_device_id', deviceId);
        
        const sessions = data.active_sessions || [];
        if (!sessions.includes(deviceId) && data.role !== 'admin') {
           // Só tentamos registar se ainda houver espaço no plano (evita erro de permissão no Firebase)
           const limits: any = { mobile: 1, standard: 1, premium: 2, familia: 4 };
           if (sessions.length < (limits[data.plan?.toLowerCase() || 'mobile'])) {
             updateDoc(ref, { active_sessions: arrayUnion(deviceId) }).catch(() => {});
           }
        }

        setIsExpired(userIsExpired);
        setUserData(data);
        setLoading(false); // 🚀 O LOADING SÓ PARA QUANDO TEMOS TUDO
      });
    });

    return () => {
      unsubSettings();
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      isAdmin: userData?.role === 'admin', 
      isExpired, 
      sysConfig,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('O useAuthContext deve ser usado dentro do AuthProvider!');
  return ctx;
};