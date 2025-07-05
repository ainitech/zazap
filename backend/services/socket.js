import { Server as SocketIOServer } from 'socket.io';

let io = null;

export const initializeSocket = (server) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

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
    
    console.log(`📡 Emitindo evento '${event}' para ticket ${ticketId} (${clientCount} clientes conectados)`);
    console.log(`📨 Dados:`, data);
    
    io.to(`ticket-${ticketId}`).emit(event, data);
    console.log(`✅ Evento '${event}' emitido para sala ticket-${ticketId}`);
  } else {
    console.error(`❌ Socket.IO não inicializado para emitir evento '${event}' para ticket ${ticketId}`);
  }
};

export const emitToAll = (event, data) => {
  if (io) {
    console.log(`📡 Emitindo evento '${event}' para todos os clientes:`, data);
    io.emit(event, data);
    console.log(`✅ Evento '${event}' emitido para todos os clientes`);
  } else {
    console.error(`❌ Socket.IO não inicializado para emitir evento '${event}' globalmente`);
  }
};
