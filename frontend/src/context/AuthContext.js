import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthContext: Inicializando autenticação segura...');
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('🔐 AuthContext: Inicializando autenticação segura...');
      
  // Não apagar sessão existente; apenas tentar validar/renovar
  const userData = await authService.checkSession();
      if (userData) {
        console.log('🔐 AuthContext: Usuário autenticado:', userData);
        setUser(userData);
      }
    } catch (error) {
      console.log('🔐 AuthContext: Falha na inicialização da autenticação:', error.message);
      // Usuário não autenticado - isso é normal
    } finally {
      console.log('🔐 AuthContext: Inicialização completa');
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Iniciando login seguro para:', email);
      const data = await authService.login(email, password);
      
      console.log('🔐 AuthContext: Login bem-sucedido');
      setUser(data.user);
      
      return data;
    } catch (error) {
      console.error('🔐 AuthContext: Erro no login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🔐 AuthContext: Fazendo logout seguro');
      await authService.logout();
    } catch (error) {
      console.error('🔐 AuthContext: Erro no logout:', error);
    } finally {
      setUser(null);
    }
  };

  const logoutAll = async () => {
    try {
      console.log('🔐 AuthContext: Fazendo logout de todos os dispositivos');
      await authService.logoutAll();
    } catch (error) {
      console.error('🔐 AuthContext: Erro no logout geral:', error);
    } finally {
      setUser(null);
    }
  };

  // Função para obter dispositivos ativos
  const getActiveDevices = async () => {
    try {
      const response = await authService.request('/api/auth/devices');
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar dispositivos ativos:', error);
      return [];
    }
  };

  // Propriedade computada para verificar se está autenticado
  const isAuthenticated = !!user && authService.isAuthenticated();

  console.log('🔐 AuthContext: Estado atual - user:', !!user, 'isAuthenticated:', isAuthenticated, 'loading:', loading);

  const value = {
    user,
    login,
    logout,
    logoutAll,
    getActiveDevices,
    loading,
    isAuthenticated,
    // Expor métodos do authService para uso direto
    request: authService.request.bind(authService)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
