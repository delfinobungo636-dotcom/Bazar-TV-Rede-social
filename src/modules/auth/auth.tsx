// src/modules/auth/auth.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from './auth.service';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await AuthService.login(email, password);
        navigate('/'); // ou /app depois
      } else {
        if (!name) {
          setError('O nome é obrigatório');
          setLoading(false);
          return;
        }

        await AuthService.register(email, password, name);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      <form onSubmit={handleAuth} className="bg-gray-900 p-8 rounded w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {isLogin ? 'Entrar' : 'Criar Conta'}
        </h2>

        {!isLogin && (
          <input
            className="w-full p-3 mb-3 bg-gray-800 rounded"
            placeholder="Nome"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        )}

        <input
          className="w-full p-3 mb-3 bg-gray-800 rounded"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full p-3 mb-3 bg-gray-800 rounded"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 mb-3">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-red-600 p-3 rounded font-bold"
        >
          {loading ? 'A processar...' : isLogin ? 'Entrar' : 'Registar'}
        </button>

        <p
          className="mt-4 text-sm text-gray-400 cursor-pointer"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Criar conta' : 'Já tenho conta'}
        </p>
      </form>
    </div>
  );
}