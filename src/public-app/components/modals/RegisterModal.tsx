import React, { useState } from 'react';
import { X, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { auth, db } from '../../../shared/services/firebase'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const RegisterModal = ({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Olhinhos da Senha
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🚨 AQUI FECHAMOS O FURO! Gravamos o NOME e o STATUS DE PAGAMENTO PENDENTE
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name, // O Nome do Cliente
        email: user.email,
        role: 'user', 
        status: 'waiting_payment', // 🚨 A CHAVE QUE TRANCA OS FILMES
        plan: 'nenhum', 
        createdAt: new Date()
      });

      console.log("Conta criada com sucesso!", user.uid);
      onClose(); 
      // O React Router vai detetar automaticamente o waiting_payment e trancá-lo!

    } catch (err: any) {
      console.error("Erro no registo:", err);
      const errorCode = err.code;
      let errorMessage = "Ocorreu um erro. Tente novamente.";

      if (errorCode === 'auth/email-already-in-use') errorMessage = "Este email já está a ser usado. Tente fazer Login.";
      if (errorCode === 'auth/weak-password') errorMessage = "A palavra-passe é muito fraca. Use pelo menos 6 caracteres.";
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-black border border-zinc-800 p-8 rounded-2xl w-full max-w-md relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X /></button>
        
        <h2 className="text-3xl font-bold text-white mb-6">Criar Conta</h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">Nome Completo</label>
            <input 
              type="text" required placeholder="Ex: João Silva"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none transition"
              value={name} onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm">Email</label>
            <input 
              type="email" required placeholder="o.seu@email.com"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none transition"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <label className="text-gray-400 text-sm">Palavra-passe</label>
            <input 
              type={showPassword ? "text" : "password"} required placeholder="Mínimo 6 caracteres"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none transition"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-10 text-gray-400">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="relative">
            <label className="text-gray-400 text-sm">Confirmar Palavra-passe</label>
            <input 
              type={showConfirmPassword ? "text" : "password"} required placeholder="Repita a palavra-passe"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-red-600 focus:outline-none transition"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-10 text-gray-400">
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
            {loading ? <Loader2 className="animate-spin" /> : 'Registar'}
          </button>
        </form>

        <p className="mt-6 text-gray-500 text-center text-sm">
          Já tem conta? <button onClick={onSwitchToLogin} className="text-white hover:underline">Entrar</button>
        </p>
      </div>
    </div>
  );
};

export default RegisterModal;