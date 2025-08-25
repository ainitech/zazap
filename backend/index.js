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
import path from 'path';

dotenv.config();

const app = express();
const server = createServer(app);

// Inicializar Socket.IO
const io = initializeSocket(server);

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
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
app.use('/api/integrations', integrationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/push', pushRoutes);

app.get('/', (req, res) => {
  res.send('Zazap Backend API');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Socket.IO server initialized`);
  
  // Aguardar um pouco para o servidor estabilizar
  setTimeout(async () => {
    console.log('🚀 Iniciando sistemas automáticos...');
    
    // Reconectar sessões que estavam conectadas
    await autoReconnectSessions();
    
    // Iniciar verificação de saúde das sessões
    startSessionHealthCheck();
    
  }, 3000); // Aguardar 3 segundos
});
