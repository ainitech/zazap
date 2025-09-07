import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export const useSocketAuth = () => {
  const { socket, isConnected, error, reauthenticate } = useSocket();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // Listeners para eventos de autenticação
    const handleAuthSuccess = (data) => {
      setIsAuthenticated(true);
      setAuthError(null);
      console.log('🔐 Socket autenticado:', data);
    };

    const handleAuthRequired = (data) => {
      setIsAuthenticated(false);
      setAuthError(data.error || 'Autenticação necessária');
      console.log('⚠️ Socket requer autenticação:', data);
    };

    const handleAuthError = (data) => {
      setIsAuthenticated(false);
      setAuthError(data.error || 'Erro na autenticação');
      console.log('❌ Erro na autenticação do socket:', data);
    };

    socket.on('auth-success', handleAuthSuccess);
    socket.on('auth-required', handleAuthRequired);
    socket.on('auth-error', handleAuthError);

    // Cleanup
    return () => {
      socket.off('auth-success', handleAuthSuccess);
      socket.off('auth-required', handleAuthRequired);
      socket.off('auth-error', handleAuthError);
    };
  }, [socket]);

  return {
    isAuthenticated,
    authError,
    isConnected,
    error,
    reauthenticate
  };
};
