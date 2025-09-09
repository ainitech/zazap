import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/solid';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { getSetting, getLogoUrl } = useSettings();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    console.log('🔑 LoginPage: Verificando autenticação - isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      console.log('🔑 LoginPage: Usuário já autenticado, redirecionando para dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        console.log('🔑 LoginPage: Iniciando registro para:', form.email);
        // Registro
  const { apiUrl } = await import('../utils/apiClient');
  const response = await fetch(apiUrl('/api/auth/register'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        });

        const data = await response.json();
        console.log('🔑 LoginPage: Resposta do registro:', response.status, data);

        if (response.ok) {
          console.log('🔑 LoginPage: Registro bem-sucedido');
          setError('');
          setIsRegister(false);
          setForm({ name: '', email: form.email, password: '' });
          // Após registro, mostrar tela de login
        } else {
          console.log('🔑 LoginPage: Erro no registro:', data.error);
          setError(data.error || 'Erro ao criar conta');
        }
      } else {
        console.log('🔑 LoginPage: Iniciando login para:', form.email);
        // Login
        await login(form.email, form.password);
        console.log('🔑 LoginPage: Login concluído com sucesso');
        // O redirecionamento será feito pelo useEffect quando isAuthenticated mudar
      }
    } catch (err) {
      console.error('🔑 LoginPage: Erro no processo:', err);
      setError(err.message || 'Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 flex items-center justify-center bg-yellow-500 rounded-xl overflow-hidden">
            {getLogoUrl() ? (
              <img 
                src={getLogoUrl()} 
                alt={getSetting('company_name', 'Zazap')} 
                className="w-full h-full object-cover"
              />
            ) : (
              <ChatBubbleBottomCenterTextIcon className="w-8 h-8 text-slate-900" />
            )}
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRegister ? 'Criar conta' : 'Entrar na sua conta'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getSetting('system_title', 'Zazap - Sistema de Atendimento')}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {isRegister && (
              <div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required={isRegister}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
                  placeholder="Nome completo"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
            )}
            <div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${!isRegister ? 'rounded-t-md' : ''} focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm`}
                placeholder="E-mail"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
                value={form.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Aguarde...' : (isRegister ? 'Criar conta' : 'Entrar')}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              className="text-yellow-600 hover:text-yellow-500 text-sm"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? 'Já tem uma conta? Fazer login' : 'Não tem uma conta? Registrar-se'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
