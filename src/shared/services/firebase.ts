import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAnalytics, isSupported } from "firebase/analytics";

// 🚨 A CONFIGURAÇÃO DO PROJETO REAL (Onde estão os dados!)
const firebaseConfig = {
  apiKey: "AIzaSyDF_Q45UnAHeuclLj1pl3YctqY741kxFZw",
  authDomain: "bazar-tv.firebaseapp.com",
  projectId: "bazar-tv",
  storageBucket: "bazar-tv.firebasestorage.app",
  messagingSenderId: "386210431970",
  appId: "1:386210431970:web:5aac6e7331172b32a6afbb",
  measurementId: "G-GFVJ8RYT72"
};

// 1. Inicializa o App com o cérebro correto
export const app = initializeApp(firebaseConfig);

// 2. Inicializa o Analytics de forma segura para exportação
export const analyticsPromise = isSupported().then((yes) => (yes ? getAnalytics(app) : null));

// 3. Exporta TODAS as ferramentas ligadas à mesma base de dados
export const auth = getAuth(app);         // Para os Logins
export const db = getFirestore(app);      // Para as Tabelas (movies, users, payments)
export const functions = getFunctions(app); // Para a lógica de Backend (se houver)
export const storage = getStorage(app);   // Para o Upload de Capas e Filmes

// 🚀 REDIRECIONAMENTO AUTOMÁTICO DE LOCALHOST PARA OS EMULADORES
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  //connectFirestoreEmulator(db, 'localhost', 8080);
  //connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log("⚡ Emuladores Locais integrados com sucesso na Bazar TV!");
}