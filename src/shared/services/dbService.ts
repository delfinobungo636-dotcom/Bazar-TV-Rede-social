import { 
  collection, doc, setDoc, getDoc, getDocs, updateDoc, 
  increment, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, updateProfile 
} from 'firebase/auth';
import { auth, db } from './firebase'; 
import { User, ContentItem } from '../types';

const USERS_COLLECTION = 'users';
const CONTENT_COLLECTION = 'content';

export const dbService = {
  // --- FUNÇÕES BÁSICAS ---
  init: async () => { console.log("Firebase Online"); },
  
  getCurrentUser: async (): Promise<User | null> => {
    if (!auth.currentUser) return null;
    // CORREÇÃO: Usamos UID, não email
    const ref = doc(db, USERS_COLLECTION, auth.currentUser.uid);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as User) : null;
  },

  login: async (email: string, password?: string): Promise<User> => {
    const uc = await signInWithEmailAndPassword(auth, email, password || '');
    // CORREÇÃO: Busca pelo UID
    const ref = doc(db, USERS_COLLECTION, uc.user.uid);
    const snap = await getDoc(ref);
    // Se não tiver perfil, retornamos dados básicos do Auth para não crashar
    if (!snap.exists()) {
       return { uid: uc.user.uid, email: uc.user.email, role: 'user' } as User;
    }
    return snap.data() as User;
  },

  register: async (name: string, email: string, password: string, phone?: string, plan?: string): Promise<User> => {
    const uc = await createUserWithEmailAndPassword(auth, email, password);
    
    const newUser: User = { 
        uid: uc.user.uid, // Importante guardar o UID dentro do doc também
        name, 
        email, 
        phone: phone || '', 
        plan: plan || 'mobile', 
        status: 'active', // Active por defeito ou 'pendente' se tiveres verificação
        role: 'user',
        profileImage: '', 
        bazarCardId: 'BZ-' + Math.floor(Math.random() * 900000), 
        bazarCardBalance: 0, 
        myList: [], 
        notifications: [], 
        createdAt: new Date().toISOString()
    };

    // CORREÇÃO CRÍTICA: Gravamos usando o UID como chave
    await setDoc(doc(db, USERS_COLLECTION, uc.user.uid), newUser);
    await updateProfile(uc.user, { displayName: name });
    
    return newUser; 
  },

  logout: async () => { await signOut(auth); },

  // --- FUNÇÕES DE CONTEÚDO (Mantidas, parecem ok) ---
  addContent: async (item: ContentItem) => {
      const newItem = { ...item, id: Date.now().toString(), views: 0 };
      await setDoc(doc(db, CONTENT_COLLECTION, newItem.id), newItem);
      return newItem;
  },
  getContent: async (): Promise<ContentItem[]> => {
      const snap = await getDocs(collection(db, CONTENT_COLLECTION));
      return snap.docs.map(d => d.data() as ContentItem);
  },
  incrementView: async (id: string) => { 
    const ref = doc(db, CONTENT_COLLECTION, id);
    // Verificação de segurança simples
    try { await updateDoc(ref, { views: increment(1) }); } catch(e) { console.log("View não contada"); }
  },
  
  updateContent: async (item: ContentItem) => { 
      const { id, ...data } = item;
      await updateDoc(doc(db, CONTENT_COLLECTION, id), data as any); 
      return []; 
  },
  removeContent: async (id: string) => { await deleteDoc(doc(db, CONTENT_COLLECTION, id)); return []; },

  // --- FUNÇÕES DE ADMIN ---
  getUsers: async (): Promise<User[]> => {
      const snap = await getDocs(collection(db, USERS_COLLECTION));
      return snap.docs.map(d => d.data() as User);
  },
  // CORREÇÃO: Recebe UID em vez de email para ser preciso
  approveUser: async (uid: string) => {
      const validDate = new Date(); validDate.setDate(validDate.getDate() + 30);
      await updateDoc(doc(db, USERS_COLLECTION, uid), { status: 'active', validUntil: validDate.toISOString() });
  },
  removeUser: async (uid: string) => { await deleteDoc(doc(db, USERS_COLLECTION, uid)); },

  // --- HELPERS ---
  updateUser: async (uid: string, data: Partial<User>) => { 
      await updateDoc(doc(db, USERS_COLLECTION, uid), data as any); 
      const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
      return snap.data() as User; 
  },
  toggleMyList: async (uid: string, cId: string) => {
      const ref = doc(db, USERS_COLLECTION, uid); 
      const s = await getDoc(ref);
      if(s.exists()) { 
          let l = s.data().myList || []; 
          l.includes(cId) ? l = l.filter((i:string) => i !== cId) : l.push(cId); 
          await updateDoc(ref, { myList: l }); 
          return { ...s.data(), myList: l } as User; 
      } 
      throw new Error("Erro: Utilizador não encontrado");
  }
};