import React from 'react';
import { useSocketAuth } from '../../hooks/useSocketAuth';

const SocketAuthStatus = () => {
  const { isAuthenticated, authError, isConnected, reauthenticate } = useSocketAuth();

  // Não mostrar nada se estiver autenticado e conectado
  if (isAuthenticated && isConnected) {
    return null;
  }

  // Se não estiver conectado
  if (!isConnected) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm">
              Conexão WebSocket perdida. Tentando reconectar...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Se estiver conectado mas não autenticado
  if (isConnected && !isAuthenticated && authError) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm">
              {authError}
            </p>
            <div className="mt-2">
              <button 
                onClick={reauthenticate}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 mr-2"
              >
                Tentar Novamente
              </button>
              <button 
                onClick={() => window.location.href = '/login'}
                className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
              >
                Fazer Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SocketAuthStatus;
