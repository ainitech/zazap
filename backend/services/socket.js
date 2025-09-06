import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

let io = null;

// Middleware de autenticação para Socket.IO
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.log('❌ Socket connection rejected: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
    const decoded = jwt.verify(token, JWT_SECRET);

    // Buscar o usuário no banco de dados
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      console.log('❌ Socket connection rejected: User not found');
      return next(new Error('Authentication error: User not found'));
    }

    // Adicionar informações do usuário ao socket
    socket.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    console.log(`✅ Socket authenticated for user: ${user.name} (${user.role})`);
    next();
  } catch (error) {
    console.log('❌ Socket authentication failed:', error.message);
    next(new Error('Authentication error: ' + error.message));
  }
};

export const initializeSocket = (server) => {
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
    transports: ['websocket', 'polling']
  });

  // Aplicar middleware de autenticação
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id} (User: ${socket.user.name})`);

    // Event listener para entrar em uma sessão específica
    socket.on('join-session', (sessionId) => {
      socket.join(`session-${sessionId}`);
      console.log(`Cliente ${socket.id} entrou na sala da sessão: ${sessionId}`);
    });

    // Event listener para sair de uma sessão específica
    socket.on('leave-session', (sessionId) => {
      socket.leave(`session-${sessionId}`);
      console.log(`Cliente ${socket.id} saiu da sala da sessão: ${sessionId}`);
    });

    // Event listener para entrar em um ticket específico
    socket.on('join-ticket', (ticketId) => {
      socket.join(`ticket-${ticketId}`);
      console.log(`Cliente ${socket.id} entrou na sala do ticket: ${ticketId}`);
      
      // Verificar quantos clientes estão na sala
      const room = io.sockets.adapter.rooms.get(`ticket-${ticketId}`);
      const clientCount = room ? room.size : 0;
      console.log(`📊 Total de clientes na sala ticket-${ticketId}: ${clientCount}`);
    });

    // Event listener para sair de um ticket específico
    socket.on('leave-ticket', (ticketId) => {
      socket.leave(`ticket-${ticketId}`);
      console.log(`Cliente ${socket.id} saiu da sala do ticket: ${ticketId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Cliente desconectado: ${socket.id}`);
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
