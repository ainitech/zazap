import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { getRedisManager } from './redisManager.js';

let io = null;

// Middleware de autenticação para Socket.IO
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    // Tentar pegar cookies do handshake (header Cookie) para refresh token
    let refreshToken = null;
    try {
      const cookieHeader = socket.handshake.headers?.cookie;
      if (cookieHeader) {
        const parts = cookieHeader.split(/; */);
        for (const p of parts) {
          const [k, v] = p.split('=');
            if (k === 'refreshToken') {
              refreshToken = decodeURIComponent(v || '');
              break;
            }
        }
      }
    } catch (e) {}

    if (!token) {
      // Se há refreshToken cookie, tentamos autenticar por ele emitindo acesso temporário
      if (refreshToken) {
        try {
          const { TokenService } = await import('../services/tokenService.js');
          const rtRecord = await TokenService.verifyRefreshToken(refreshToken);
          if (rtRecord && rtRecord.user) {
            socket.user = {
              id: rtRecord.user.id,
              name: rtRecord.user.name,
              email: rtRecord.user.email,
              role: rtRecord.user.role
            };
            socket.isAuthenticated = true;
            console.log(`✅ Socket autenticado via refresh cookie: ${socket.user.name}`);
            return next();
          }
        } catch (e) {
          console.log('❌ Falha auth via refresh cookie (socket):', e.message);
        }
      }
      console.log('⚠️ Socket connection without token - allowing connection but marking as unauthenticated');
      socket.isAuthenticated = false;
      socket.user = null;
      return next();
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Buscar o usuário no banco de dados
      const user = await User.findByPk(decoded.userId);
      if (!user) {
        console.log('❌ Socket connection: User not found for provided token');
        socket.isAuthenticated = false;
        socket.user = null;
        socket.authError = 'User not found';
        return next(); // Permite a conexão mas marca como não autenticado
      }

      // Adicionar informações do usuário ao socket
      socket.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      socket.isAuthenticated = true;

      console.log(`✅ Socket authenticated for user: ${user.name} (${user.role})`);
      next();
    } catch (jwtError) {
      console.log('❌ Socket authentication failed: Invalid token -', jwtError.message);
      socket.isAuthenticated = false;
      socket.user = null;
      socket.authError = 'Invalid token';
      return next(); // Permite a conexão mas marca como não autenticado
    }
  } catch (error) {
    console.log('❌ Socket authentication error:', error.message);
    socket.isAuthenticated = false;
    socket.user = null;
    socket.authError = error.message;
    next(); // Permite a conexão mas marca como não autenticado
  }
};

// Pool de rooms para otimizar gerenciamento de salas
const roomPool = {
  activeRooms: new Map(), // roomId -> Set<socketIds>
  ticketRooms: new Map(), // ticketId -> roomName
  maxRoomsPerSocket: 50, // Limite de salas por socket
  cleanup: () => {
    // Limpar salas órfãs periodicamente
    for (const [roomId, sockets] of roomPool.activeRooms) {
      if (sockets.size === 0) {
        roomPool.activeRooms.delete(roomId);
      }
    }
  }
};

// Limpeza periódica de salas órfãs
setInterval(roomPool.cleanup, 300000); // 5 minutos

export const initializeSocket = async (server) => {
  const raw = process.env.FRONTEND_ORIGINS || process.env.FRONTEND_URL || '';
  const allowed = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const socketCorsOrigins = allowed.length > 0 ? allowed : (process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : []);

  io = new SocketIOServer(server, {
    cors: {
      origin: socketCorsOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    // Otimizações para múltiplas sessões e alta concorrência
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
    allowEIO3: true,
    // Configurações para escalabilidade
    serveClient: false,
    connectTimeout: 45000,
    // Rate limiting para prevenir abuse
    perMessageDeflate: {
      threshold: 1024,
      concurrencyLimit: 10,
      memLevel: 7
    }
  });

  // Setup Redis adapter for horizontal scaling
  try {
    const redisManager = getRedisManager();
    await redisManager.redis.ping(); // Ensure Redis is connected
    
    const adapter = createAdapter(redisManager.pubClient, redisManager.subClient);
    io.adapter(adapter);
    
    console.log('✅ Socket.IO Redis adapter configured for clustering');
  } catch (error) {
    console.warn('⚠️ Redis adapter not available, running in single instance mode:', error.message);
  }

  // Aplicar middleware de autenticação
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userName = socket.user ? socket.user.name : 'Não autenticado';
    console.log(`Cliente conectado: ${socket.id} (User: ${userName})`);

    // Verificar se o socket está autenticado e enviar evento apropriado
    if (!socket.isAuthenticated) {
      console.log(`⚠️ Socket ${socket.id} conectado sem autenticação válida`);
      socket.emit('auth-required', {
        message: 'Autenticação necessária para usar todas as funcionalidades',
        error: socket.authError || 'Token não fornecido'
      });
    } else {
      socket.emit('auth-success', {
        message: 'Autenticado com sucesso',
        user: socket.user
      });
    }

    // Evento para reautenticação
    socket.on('authenticate', async (data) => {
      try {
        const mode = data?.via;
        const providedToken = data?.token;
        if (mode === 'cookie') {
          // Repetir lógica de refresh cookie
          const cookieHeader = socket.handshake.headers?.cookie;
          let refreshToken = null;
          if (cookieHeader) {
            for (const p of cookieHeader.split(/; */)) {
              const [k, v] = p.split('=');
              if (k === 'refreshToken') { refreshToken = decodeURIComponent(v || ''); break; }
            }
          }
          if (!refreshToken) {
            socket.emit('auth-error', { error: 'Cookie de sessão ausente' });
            return;
          }
          const { TokenService } = await import('../services/tokenService.js');
          const rtRecord = await TokenService.verifyRefreshToken(refreshToken);
          if (!rtRecord || !rtRecord.user) {
            socket.emit('auth-error', { error: 'Sessão inválida' });
            return;
          }
          socket.user = {
            id: rtRecord.user.id,
            name: rtRecord.user.name,
            email: rtRecord.user.email,
            role: rtRecord.user.role
          };
          socket.isAuthenticated = true;
          socket.authError = null;
          console.log(`✅ Socket ${socket.id} autenticado via cookie para usuário: ${socket.user.name}`);
          socket.emit('auth-success', { message: 'Autenticado', user: socket.user });
          return;
        }
        // Fallback: token JWT explícito
        if (!providedToken) {
          socket.emit('auth-error', { error: 'Token não fornecido' });
          return;
        }
        const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
        const decoded = jwt.verify(providedToken, JWT_SECRET);
        const user = await User.findByPk(decoded.userId);
        if (!user) {
          socket.emit('auth-error', { error: 'Usuário não encontrado' });
          return;
        }
        socket.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
        socket.isAuthenticated = true;
        socket.authError = null;
        console.log(`✅ Socket ${socket.id} reautenticado (token) para usuário: ${user.name}`);
        socket.emit('auth-success', { message: 'Reautenticado', user: socket.user });
      } catch (error) {
        console.log(`❌ Falha na autenticação do socket ${socket.id}:`, error.message);
        socket.emit('auth-error', { error: 'Falha na autenticação' });
      }
    });

    // Event listener para entrar em uma sessão específica (otimizado)
    socket.on('join-session', (sessionId) => {
      if (!socket.isAuthenticated) {
        socket.emit('auth-required', { message: 'Autenticação necessária para entrar em sessões' });
        return;
      }
      
      const roomName = `session-${sessionId}`;
      socket.join(roomName);
      
      // Gerenciar pool de salas
      if (!roomPool.activeRooms.has(roomName)) {
        roomPool.activeRooms.set(roomName, new Set());
      }
      roomPool.activeRooms.get(roomName).add(socket.id);
      
      console.log(`Cliente ${socket.id} entrou na sala da sessão: ${sessionId} (${roomPool.activeRooms.get(roomName).size} clientes)`);
    });

    // Event listener para sair de uma sessão específica (otimizado)
    socket.on('leave-session', (sessionId) => {
      if (!socket.isAuthenticated) {
        return;
      }
      
      const roomName = `session-${sessionId}`;
      socket.leave(roomName);
      
      // Atualizar pool de salas
      if (roomPool.activeRooms.has(roomName)) {
        roomPool.activeRooms.get(roomName).delete(socket.id);
        if (roomPool.activeRooms.get(roomName).size === 0) {
          roomPool.activeRooms.delete(roomName);
        }
      }
      
      console.log(`Cliente ${socket.id} saiu da sala da sessão: ${sessionId}`);
    });

    // Event listener para entrar em um ticket específico (otimizado)
    socket.on('join-ticket', (ticketId) => {
      if (!socket.isAuthenticated) {
        socket.emit('auth-required', { message: 'Autenticação necessária para entrar em tickets' });
        return;
      }
      
      // Verificar limite de salas por socket
      const currentRooms = Array.from(socket.rooms).length;
      if (currentRooms >= roomPool.maxRoomsPerSocket) {
        socket.emit('room-limit-exceeded', { 
          message: `Limite de ${roomPool.maxRoomsPerSocket} salas atingido` 
        });
        return;
      }
      
      const roomName = `ticket-${ticketId}`;
      socket.join(roomName);
      
      // Gerenciar pool de salas
      if (!roomPool.activeRooms.has(roomName)) {
        roomPool.activeRooms.set(roomName, new Set());
      }
      roomPool.activeRooms.get(roomName).add(socket.id);
      roomPool.ticketRooms.set(ticketId, roomName);
      console.log(`Cliente ${socket.id} entrou na sala do ticket: ${ticketId}`);
      
      // Verificar quantos clientes estão na sala
      const room = io.sockets.adapter.rooms.get(`ticket-${ticketId}`);
      const clientCount = room ? room.size : 0;
      console.log(`📊 Total de clientes na sala ticket-${ticketId}: ${clientCount}`);
    });

    // Event listener para sair de um ticket específico
    socket.on('leave-ticket', (ticketId) => {
      if (!socket.isAuthenticated) {
        return;
      }
      
      socket.leave(`ticket-${ticketId}`);
      console.log(`Cliente ${socket.id} saiu da sala do ticket: ${ticketId}`);
    });

    socket.on('disconnect', () => {
      const userName = socket.user ? socket.user.name : 'Não autenticado';
      console.log(`Cliente desconectado: ${socket.id} (User: ${userName})`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO não foi inicializado!');
  }
  return io;
};

export const emitToSession = (sessionId, event, data) => {
  if (io) {
    io.to(`session-${sessionId}`).emit(event, data);
  }
};

export const emitToTicket = (ticketId, event, data) => {
  if (io) {
    const room = io.sockets.adapter.rooms.get(`ticket-${ticketId}`);
    const clientCount = room ? room.size : 0;
    
    console.log(`📊 Emitindo '${event}' para sala ticket-${ticketId} (${clientCount} clientes conectados)`);
    io.to(`ticket-${ticketId}`).emit(event, data);
    console.log(`✅ Evento '${event}' emitido para sala ticket-${ticketId}`);
  } else {
    console.error(`❌ Socket.IO não inicializado para emitir evento '${event}' para ticket ${ticketId}`);
  }
};

export const emitToAll = (event, data) => {
  if (io) {
    const connectedClients = io.sockets.sockets.size;
    console.log(`✅ Evento '${event}' emitido para todos os clientes (${connectedClients} conectados)`);
    io.emit(event, data);
  } else {
    console.error(`❌ Socket.IO não inicializado para emitir evento '${event}' globalmente`);
  }
};

export const getConnectedClients = (roomName = null) => {
  if (!io) return 0;
  
  if (roomName) {
    const room = io.sockets.adapter.rooms.get(roomName);
    return room ? room.size : 0;
  }
  
  return io.sockets.sockets.size;
};

export const getRoomInfo = (roomName) => {
  if (!io) return null;
  
  const room = io.sockets.adapter.rooms.get(roomName);
  if (!room) return null;
  
  const clients = [];
  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      clients.push({
        id: socketId,
        userId: socket.user?.id,
        userName: socket.user?.name,
        authenticated: socket.isAuthenticated
      });
    }
  }
  
  return {
    roomName,
    clientCount: room.size,
    clients
  };
};
