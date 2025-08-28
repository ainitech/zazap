import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { initializeSocket } from './services/socket.js';
import { autoReconnectSessions, startSessionHealthCheck } from './services/sessionManager.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import whatsappjsRoutes from './routes/whatsappjsRoutes.js';
import baileysRoutes from './routes/baileysRoutes.js';
import authRoutes from './routes/authRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import userRoutes from './routes/userRoutes.js';
import ticketCommentRoutes from './routes/ticketCommentRoutes.js';
import ticketStatusRoutes from './routes/ticketStatusRoutes.js';
import ticketMessageRoutes from './routes/ticketMessageRoutes.js';
import ticketMessageFileRoutes from './routes/ticketMessageFileRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import quickReplyRoutes from './routes/quickReplyRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import buttonRoutes from './routes/buttonRoutes.js';
import path from 'path';

dotenv.config();

const app = express();
const server = createServer(app);

// Inicializar Socket.IO
const io = initializeSocket(server);

// Middlewares
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sem origin (como mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      // Adicionar IPs locais comuns
      'http://192.168.0.1:3000',
      'http://192.168.0.1:3001',
      'http://10.0.0.1:3000',
      'http://10.0.0.1:3001',
      // Permitir qualquer IP local na rede
      /^http:\/\/192\.168\.\d+\.\d+:3000$/,
      /^http:\/\/192\.168\.\d+\.\d+:3001$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:3001$/,
      /^http:\/\/172\.\d+\.\d+\.\d+:3000$/,
      /^http:\/\/172\.\d+\.\d+\.\d+:3001$/,
    ];
    
    // Verificar se a origem está na lista de permitidas
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS bloqueado para origem: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos enviados
// Caminho público correto: /uploads/arquivo.ext (NÃO /api/uploads)
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

// Rota de teste para verificar se os arquivos estão sendo servidos
app.get('/test-file/:folder/:filename', (req, res) => {
  const { folder, filename } = req.params;
  const filePath = path.join(process.cwd(), 'uploads', folder, filename);
  console.log('🔍 Testando arquivo:', filePath);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('❌ Erro ao servir arquivo:', err);
      res.status(404).send('Arquivo não encontrado');
    } else {
      console.log('✅ Arquivo servido com sucesso');
    }
  });
});

// Rotas principais
app.use('/api', whatsappRoutes);
app.use('/api/whatsappjs', whatsappjsRoutes);
app.use('/api/baileys', baileysRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ticket-comments', ticketCommentRoutes);
app.use('/api/ticket-status', ticketStatusRoutes);
app.use('/api/ticket-messages', ticketMessageRoutes);
app.use('/api/ticket-messages', ticketMessageFileRoutes);
app.use('/api/quick-replies', quickReplyRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/buttons', buttonRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/push', pushRoutes);

app.get('/', (req, res) => {
  res.send('Zazap Backend API');
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, async () => {
  console.log(`🚀 Backend running on ${HOST}:${PORT}`);
  console.log(`🌐 Accessible at:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://192.168.1.100:${PORT} (replace with your IP)`);
  console.log(`   - All interfaces: http://${HOST}:${PORT}`);
  console.log(`Socket.IO server initialized`);
  
  // Aguardar um pouco para o servidor estabilizar
  setTimeout(async () => {
    console.log('🚀 Iniciando sistemas automáticos...');
    
    // Reconectar sessões que estavam conectadas
    await autoReconnectSessions();
    
    // Iniciar verificação de saúde das sessões
    startSessionHealthCheck();

    // Iniciar despachante de agendamentos
    try {
      const { startScheduleDispatcher } = await import('./services/scheduleDispatcher.js');
      startScheduleDispatcher();
      console.log('⏰ Dispatcher de agendamentos iniciado');
    } catch (e) {
      console.error('Erro ao iniciar dispatcher de agendamentos:', e);
    }
    
  }, 3000); // Aguardar 3 segundos
});
