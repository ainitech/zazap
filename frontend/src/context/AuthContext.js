import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

import { apiUrl } from '../utils/apiClient';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthContext: Inicializando, token presente:', !!token);
    if (token) {
      // Verificar se o token é válido e buscar dados do usuário
      verifyToken();
    } else {
      console.log('🔐 AuthContext: Nenhum token encontrado, finalizando loading');
      setLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      console.log('🔐 AuthContext: Verificando token...');
  const response = await fetch(apiUrl('/api/auth/me'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('🔐 AuthContext: Resposta da verificação:', response.status, response.statusText);

      if (response.ok) {
        const userData = await response.json();
        console.log('🔐 AuthContext: Dados do usuário recebidos:', userData);
        setUser(userData);
        console.log('🔐 AuthContext: Usuário definido com sucesso');
      } else {
        // Token inválido
        console.log('🔐 AuthContext: Token inválido, fazendo logout');
        logout();
      }
    } catch (error) {
      console.error('🔐 AuthContext: Erro ao verificar token:', error);
      logout();
    } finally {
      console.log('🔐 AuthContext: Finalizando loading');
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Iniciando login para:', email);
  const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('🔐 AuthContext: Resposta do login:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('🔐 AuthContext: Erro no login:', errorData);
        throw new Error(errorData.error || 'Erro ao fazer login');
      }

      const data = await response.json();
      const { token, user } = data;

      console.log('🔐 AuthContext: Login bem-sucedido, salvando token e usuário');
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);

      console.log('🔐 AuthContext: Login completo, usuário:', user);
      return data;
    } catch (error) {
      console.error('🔐 AuthContext: Erro no login:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('🔐 AuthContext: Fazendo logout');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Propriedade computada para verificar se está autenticado
  const isAuthenticated = !!user && !!token;

  console.log('🔐 AuthContext: Estado atual - user:', !!user, 'token:', !!token, 'isAuthenticated:', isAuthenticated, 'loading:', loading);

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
