import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket deve ser usado dentro de um SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      console.log('🔗 Conectando ao WebSocket...');
      
      const newSocket = io(API_URL, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('✅ WebSocket conectado:', newSocket.id);
        setIsConnected(true);
        setError(null);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ WebSocket desconectado:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (err) => {
        console.error('❌ Erro de conexão WebSocket:', err);
        setError(err.message);
        setIsConnected(false);
      });

      // Adicionar listeners para debug
      newSocket.onAny((event, ...args) => {
        console.log(`📡 Evento WebSocket recebido: ${event}`, args);
      });

      setSocket(newSocket);
      socketRef.current = newSocket;

      return () => {
        console.log('🔌 Desconectando WebSocket...');
        newSocket.disconnect();
        setSocket(null);
        setIsConnected(false);
      };
    } catch (err) {
      console.error('Erro ao inicializar WebSocket:', err);
      setError(err.message);
    }
  }, [API_URL]);

  // Função para entrar em um ticket específico
  const joinTicket = (ticketId) => {
    if (socket && isConnected) {
      console.log(`📱 Entrando na sala do ticket: ${ticketId}`);
      socket.emit('join-ticket', ticketId);
    }
  };

  // Função para sair de um ticket específico
  const leaveTicket = (ticketId) => {
    if (socket && isConnected) {
      console.log(`📱 Saindo da sala do ticket: ${ticketId}`);
      socket.emit('leave-ticket', ticketId);
    }
  };

  // Função para entrar em uma sessão específica
  const joinSession = (sessionId) => {
    if (socket && isConnected) {
      console.log(`📱 Entrando na sala da sessão: ${sessionId}`);
      socket.emit('join-session', sessionId);
    }
  };

  // Função para sair de uma sessão específica
  const leaveSession = (sessionId) => {
    if (socket && isConnected) {
      console.log(`📱 Saindo da sala da sessão: ${sessionId}`);
      socket.emit('leave-session', sessionId);
    }
  };

  const value = {
    socket,
    isConnected,
    error,
    joinTicket,
    leaveTicket,
    joinSession,
    leaveSession
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
