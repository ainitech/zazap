import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { API_BASE_URL } from '../utils/apiClient';
import { useToast } from './ToastContext';

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
  const toast = useToast();

  const API_URL = API_BASE_URL || '';

  useEffect(() => {
    // Sempre conectar, mesmo sem token
    try {
      console.log('🔗 Conectando ao WebSocket...');
      
      const newSocket = io(API_URL || undefined, {
        auth: {
          token: null // Sem JWT inicial; autenticação via cookie após connect
        },
        withCredentials: true, // Enviar cookies httpOnly no handshake (necessário para refreshToken)
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('✅ WebSocket conectado:', newSocket.id);
        setIsConnected(true);
        setError(null);
        
        // Tentar autenticar automaticamente se há um usuário (via cookie httpOnly)
        const user = JSON.parse(sessionStorage.getItem('user') || 'null');
        if (user) {
          console.log('🔐 Solicitando autenticação de socket via cookie');
          newSocket.emit('authenticate', { via: 'cookie' });
        }
        
        // Proativamente solicitar permissão de Notificações no navegador (developer friendly)
        try {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            console.log('Notification permission:', Notification.permission);
            if (Notification.permission === 'default') {
              Notification.requestPermission().then(permission => {
                console.log('Notification.requestPermission ->', permission);
                if (permission === 'granted') {
                  if (toast && toast.addToast) toast.addToast('Notificações do navegador ativadas.', { type: 'success', duration: 4000 });
                } else {
                  if (toast && toast.addToast) toast.addToast('Ative notificações no navegador para receber alertas de novas mensagens.', { type: 'info', duration: 10000 });
                }
              }).catch(err => console.error('Erro ao solicitar permissão de notificações:', err));
            }
          }
        } catch (permErr) {
          console.error('Erro checando permissão de notificações:', permErr);
        }
        // Expor socket e helper de teste para facilitar debug local
        try { window.zazapSocket = newSocket; } catch (e) {}
        try {
          window.showZazapTestNotification = (payload = {}) => {
            try {
              const { title = 'Teste Zazap', body = 'Esta é uma notificação de teste', iconUrl } = payload;
              if (typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                  new Notification(title, { body, icon: iconUrl });
                } else {
                  Notification.requestPermission().then(p => {
                    if (p === 'granted') new Notification(title, { body, icon: iconUrl });
                  });
                }
              } else {
                alert(`${title}\n\n${body}`);
              }
            } catch (err) { console.error('Erro ao criar notificação de teste', err); }
          };
          
          // Função para testar se está na sala do ticket
          window.testJoinTicket = (ticketId) => {
            console.log(`🧪 Teste: Entrando na sala do ticket ${ticketId}`);
            newSocket.emit('join-ticket', ticketId);
          };
          
          // Função para emitir evento de teste
          window.testSocketEmit = (event, data) => {
            console.log(`🧪 Teste: Emitindo evento '${event}'`, data);
            newSocket.emit(event, data);
          };
        } catch (ex) { console.error('Não foi possível expor helper de notificação de teste', ex); }
        // Registrar Service Worker e expor helper para inscrição Push
        try {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(reg => {
              console.log('Service Worker registrado:', reg.scope);
              window.zazapSW = reg;
            }).catch(err => console.warn('Falha ao registrar Service Worker:', err));
          }

          window.zazapSubscribeToPush = async () => {
            try {
              if (!('serviceWorker' in navigator)) throw new Error('Service Worker não suportado');
              if (!('PushManager' in window)) throw new Error('Push API não suportada');
              const reg = await navigator.serviceWorker.ready;
              const permission = await Notification.requestPermission();
              if (permission !== 'granted') throw new Error('Permissão de notificações negada');

              // Obter a chave pública VAPID do backend via env expo ou endpoint
              const VAPID_PUBLIC = (window.__REACT_APP_VAPID_PUBLIC__ || null) || (await (await fetch('/api/push/public')).text().catch(() => null));
              if (!VAPID_PUBLIC) console.warn('VAPID public key não disponível no cliente; o backend deve expor uma rota /api/push/public');

              const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: VAPID_PUBLIC ? urlBase64ToUint8Array(VAPID_PUBLIC) : undefined
              });

              // Enviar ao backend
              const resp = await fetch((API_URL || '') + '/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(sub)
              });
              if (!resp.ok) throw new Error('Falha ao registrar subscription no backend');
              console.log('Subscription enviada ao backend com sucesso');
              return sub;
            } catch (err) {
              console.error('Erro ao inscrever para Push:', err);
              throw err;
            }
          };
        } catch (swErr) {
          console.error('Erro ao configurar Service Worker / Push helpers', swErr);
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ WebSocket desconectado:', reason);
        setIsConnected(false);
      });

      // Novo: Listener para requerimento de autenticação
      newSocket.on('auth-required', (data) => {
        console.log('🔐 Autenticação necessária (socket)');
        const user = JSON.parse(sessionStorage.getItem('user') || 'null');
        if (user) {
          console.log('🔄 Requisitando autenticação via cookie novamente...');
            newSocket.emit('authenticate', { via: 'cookie' });
        } else {
          setError('Autenticação necessária');
          if (toast && toast.addToast) {
            toast.addToast('Sessão expirada. Faça login novamente.', { 
              type: 'warning', 
              duration: 10000,
              actions: [
                { label: 'Login', onClick: () => window.location.href = '/login' }
              ]
            });
          }
        }
      });

      // Novo: Listener para sucesso na autenticação
      newSocket.on('auth-success', (data) => {
        console.log('✅ Autenticação bem-sucedida:', data);
        setError(null);
        if (toast && toast.addToast) {
          toast.addToast('Conectado com sucesso!', { type: 'success', duration: 3000 });
        }
      });

      // Novo: Listener para erro na autenticação
      newSocket.on('auth-error', (data) => {
        console.log('❌ Erro na autenticação:', data);
        setError(data.error);
        
        // Limpar dados de autenticação
        sessionStorage.removeItem('user');
  // Access token não é mais usado/local
        
        if (toast && toast.addToast) {
          toast.addToast('Sessão inválida. Redirecionando para login...', { 
            type: 'error', 
            duration: 5000,
            actions: [
              { label: 'Login', onClick: () => window.location.href = '/login' }
            ]
          });
        }
        
        // Redirecionar para login após um tempo
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
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

      // Listeners específicos para sessões
      newSocket.on('session-status-update', (data) => {
        console.log('🔄 SocketContext: session-status-update recebido', data);
      });

      newSocket.on('session-qr-update', (data) => {
        console.log('🔄 SocketContext: session-qr-update recebido', data);
      });

      newSocket.on('sessions-update', (data) => {
        console.log('🔄 SocketContext: sessions-update recebido', data.length, 'sessões');
      });

      // Listeners específicos para mensagens (garantir que chegam ao ChatComponent)
      newSocket.on('new-message', (message) => {
        console.log('🔔 SocketContext: new-message recebido', message);
        
        // Validar se a mensagem tem propriedades essenciais
        if (!message || !message.id || typeof message.sender !== 'string') {
          console.warn('⚠️ SocketContext: Mensagem inválida recebida:', message);
          return;
        }
        
        console.log('📍 SocketContext: Dados da mensagem:', {
          id: message.id,
          ticketId: message.ticketId,
          content: message.content,
          sender: message.sender,
          channel: message.channel,
          messageType: message.messageType
        });
        
        // Verificar se o frontend está conectado à sala do ticket
        if (message.ticketId) {
          console.log(`🧪 SocketContext: Verificando conexão à sala do ticket ${message.ticketId}`);
          // Forçar entrada na sala do ticket se não estivermos conectados
          if (window.testJoinTicket) {
            window.testJoinTicket(message.ticketId);
          }
        }
        
        // Este evento será capturado pelo ChatComponent também
      });

      newSocket.on('message-update', (data) => {
        console.log('🔄 SocketContext: message-update recebido', data);
        // Este evento será capturado pelo ChatComponent também
      });

      newSocket.on('message-sent', (data) => {
        console.log('✅ SocketContext: message-sent recebido', data);
        // Mensagem enviada via Instagram/Facebook - atualizar UI instantaneamente
      });

      newSocket.on('message-error', (data) => {
        console.log('❌ SocketContext: message-error recebido', data);
        // Erro no envio via Instagram/Facebook - mostrar feedback
        if (toast && toast.addToast) {
          toast.addToast(`Erro ao enviar mensagem via ${data.channel}: ${data.error}`, { 
            type: 'error', 
            duration: 5000 
          });
        }
      });

      // Global listener for session status updates to show toast even when sessions page isn't mounted
      const startSessionFromToast = async (id) => {
        // Return a promise so the toast action can show loading state
        return new Promise(async (resolve, reject) => {
          try {
            const resp = await fetch(`${API_URL}/api/sessions/${id}/start`, {
              method: 'POST',
              credentials: 'include'
            });
            if (resp.ok) {
              if (toast && toast.addToast) toast.addToast(`Tentativa de reconexão iniciada para sessão ${id}`, { type: 'success', duration: 5000 });
              resolve(true);
            } else {
              const err = await resp.json().catch(() => ({}));
              if (toast && toast.addToast) toast.addToast(err.error || `Falha ao iniciar sessão ${id}`, { type: 'error', duration: 7000 });
              reject(new Error(err.error || 'failed'));
            }
          } catch (err) {
            console.error('Erro ao iniciar sessão via toast action', err);
            if (toast && toast.addToast) toast.addToast(`Erro ao iniciar sessão ${id}`, { type: 'error', duration: 7000 });
            reject(err);
          }
        });
      };

      newSocket.on('session-status-update', ({ sessionId, status }) => {
        console.log('SocketProvider: session-status-update', { sessionId, status });
        if (status === 'disconnected') {
          const message = `Sessão ${sessionId} desconectada.`;
          try {
                if (toast && toast.addToast) {
              toast.addToast(message, { 
                type: 'error', 
                duration: 15000,
                actions: [
                  { label: 'Ir para Sessões', onClick: () => window.location.href = '/sessions' },
                  { label: 'Iniciar', loadingLabel: 'Iniciando...', onClick: () => startSessionFromToast(sessionId) }
                ]
              });
            }
          } catch (err) {
            console.error('Falha ao exibir toast global de sessão desconectada', err);
          }
        }
      });

      // Listener for generic notifications (to show desktop/mobile notifications + in-app toast)
      newSocket.on('notification', (payload) => {
        try {
          console.log('SocketProvider: notification', payload);
          const { title, body, ticketId, iconUrl } = payload || {};

          // Try to use the Web Notifications API
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              const n = new Notification(title || 'Notificação', {
                body: body || '',
                icon: iconUrl || undefined,
                tag: ticketId ? `ticket-${ticketId}` : undefined
              });
              n.onclick = () => {
                window.focus();
                if (ticketId) window.location.href = `/tickets/${ticketId}`;
              };
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                  new Notification(title || 'Notificação', { body: body || '', icon: iconUrl || undefined });
                }
              });
            }
          }

          // Always show an in-app toast fallback
          if (toast && toast.addToast) {
            toast.addToast(body || title || 'Nova notificação', {
              type: 'info',
              duration: 8000,
              actions: ticketId ? [{ label: 'Abrir', onClick: () => window.location.href = `/tickets/${ticketId}` }] : []
            });
          }
        } catch (err) {
          console.error('Falha ao processar notificação recebida via socket', err);
        }
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

  // helper: convert VAPID key
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Função para reautenticação manual
  const reauthenticate = () => {
    const user = JSON.parse(sessionStorage.getItem('user') || 'null');
    if (socket && user) {
      console.log('🔄 Tentando reautenticação manual via cookie...');
      socket.emit('authenticate', { via: 'cookie' });
    } else if (!user) {
      if (toast && toast.addToast) {
        toast.addToast('Sessão não encontrada. Faça login novamente.', { 
          type: 'error', 
          duration: 5000,
          actions: [
            { label: 'Login', onClick: () => window.location.href = '/login' }
          ]
        });
      }
    }
  };

  // Função para reconectar com novo token
  const reconnectWithToken = () => {
    if (socket) {
      const user = JSON.parse(sessionStorage.getItem('user') || 'null');
      if (user) {
        socket.emit('authenticate', { via: 'cookie' });
      }
    }
  };

  // Função para entrar em um ticket específico
  const joinTicket = (ticketId) => {
    if (socket && isConnected) {
      console.log(`📱 SocketContext: Entrando na sala do ticket: ${ticketId}`);
      console.log(`🔗 Socket ID: ${socket.id}, Conectado: ${isConnected}`);
      socket.emit('join-ticket', ticketId);
      console.log(`✅ SocketContext: Comando 'join-ticket' enviado para ticket ${ticketId}`);
    } else {
      console.error(`❌ SocketContext: Não foi possível entrar na sala do ticket ${ticketId}`, {
        socket: !!socket,
        isConnected,
        socketId: socket?.id
      });
    }
  };

  // Função para sair de um ticket específico
  const leaveTicket = (ticketId) => {
    if (socket && isConnected) {
      console.log(`📱 SocketContext: Saindo da sala do ticket: ${ticketId}`);
      socket.emit('leave-ticket', ticketId);
      console.log(`✅ SocketContext: Comando 'leave-ticket' enviado para ticket ${ticketId}`);
    } else {
      console.error(`❌ SocketContext: Não foi possível sair da sala do ticket ${ticketId}`, {
        socket: !!socket,
        isConnected
      });
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
    leaveSession,
    reauthenticate,
    reconnectWithToken
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
