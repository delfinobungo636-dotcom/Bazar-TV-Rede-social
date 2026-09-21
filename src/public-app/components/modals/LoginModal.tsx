import React, { useState } from 'react';
import { X, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { auth } from '../../../shared/services/firebase'; 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

const LoginModal = ({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConfigError, setIsConfigError] = useState(false);

  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setIsConfigError(false);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // ✅ REDIRECIONAMENTO OBRIGATÓRIO
      navigate('/app');
      onClose();

    } catch (err: any) {
      const errorCode = err.code;
      let errorMessage = 'Erro desconhecido.';

      switch (errorCode) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Email ou senha errados.';
          break;
        case 'auth/invalid-api-key':
          errorMessage = 'ERRO DE CONFIGURAÇÃO: API KEY inválida.';
          setIsConfigError(true);
          break;
        default:
          errorMessage = errorCode;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
      <div className="bg-black border border-zinc-800 p-8 rounded-xl w-full max-w-md">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400"><X /></button>

        <h2 className="text-2xl font-bold text-center mb-6">Entrar</h2>

        {error && (
          <div className={`mb-4 p-3 rounded ${isConfigError ? 'bg-yellow-900/30' : 'bg-red-900/30'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 bg-zinc-900 rounded"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Senha"
            className="w-full p-3 bg-zinc-900 rounded"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button className="w-full bg-red-600 py-3 rounded">
            {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Entrar'}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-500">
          Não tem conta?{' '}
          <button onClick={onSwitchToRegister} className="text-white underline">
            Criar conta
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginModal;
