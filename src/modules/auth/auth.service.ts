import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'; 
import { auth, db } from '../../shared/services/firebase';

export class AuthService {
  // --- LOGIN ---
  static async login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // 🤖 INJEÇÃO DO ROBÔ: Gerar e rastrear o ID único do dispositivo
    let deviceId = localStorage.getItem('bazar_device_id');
    if (!deviceId) {
      // Cria um ID único combinando a data atual e uma string aleatória
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('bazar_device_id', deviceId);
      console.log("Novo Dispositivo Registado:", deviceId);
    }

    return cred.user;
  }

  // --- REGISTO COM MOTOR DE TRIAL (DIAS GRÁTIS) ---
  static async register(email: string, password: string, name: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    if (cred.user) {
      await updateProfile(cred.user, { displayName: name });
    }

    // 1. Vai ao CÉREBRO (Settings) ver se estás a oferecer dias grátis
    const platformSnap = await getDoc(doc(db, 'settings', 'platform'));
    let trialDays = 0;
    
    if (platformSnap.exists()) {
      trialDays = Number(platformSnap.data().freeTrialDays) || 0;
    }

    // 2. Prepara a Conta
    let initialStatus = 'waiting_payment';
    let initialPlan = 'nenhum';
    let expiryDate = null;

    // 3. Lógica do Trial: Se estiver configurado > 0, liberta a entrada!
    if (trialDays > 0) {
      initialStatus = 'active'; 
      initialPlan = 'mobile';   
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + trialDays); // Calcula a data de corte
      expiryDate = endDate;
    }

    // 4. Grava no Firebase com a Sentença de Trial aplicada
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      name,
      email: cred.user.email,
      role: 'user',
      plan: initialPlan,
      subscriptionStatus: initialStatus,
      subscriptionEnds: expiryDate, 
      createdAt: serverTimestamp(),
    });

    return cred.user;
  }

  // --- LOGOUT ---
  static async logout() {
    return signOut(auth);
  }
}