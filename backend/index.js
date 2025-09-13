import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import os from 'os';
import { createServer } from 'http';
import { initializeSocket } from './services/socket.js';
import { autoReconnectSessions, startSessionHealthCheck } from './services/sessionManager.js';
import RedisService from './services/redisService.js';

// Importar as rotas
import baileysRoutes from './routes/baileysRoutes.js';
import whatsappjsRoutes from './routes/whatsappjsRoutes.js';
import wwebjsAdvancedRoutes from './routes/wwebjsAdvanced.js';
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
import sessionLibraryRoutes from './routes/sessionLibrary.js';
import libraryManagerRoutes from './routes/libraryManager.js';
import contactRoutes from './routes/contactRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import quickReplyRoutes from './routes/quickReplyRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import buttonRoutes from './routes/buttonRoutes.js';
import multiChannelRoutes from './routes/multiChannelRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config();

console.log('🚀 Zazap Backend - Inicializando...');

// ===== 🔍 Detecção simples de hardware (inline, sem arquivo extra) =====
const SYS = {
  cores: (os.cpus() || []).length || 1,
  totalMemGB: Math.max(1, Math.round(os.totalmem() / 1024 / 1024 / 1024))
};
const PROFILE = (() => {
  if (SYS.totalMemGB >= 16) return { name: 'High', json: '80mb', url: '80mb' };
  if (SYS.totalMemGB >= 8) return { name: 'Medium', json: '50mb', url: '50mb' };
  if (SYS.totalMemGB >= 4) return { name: 'Basic', json: '25mb', url: '25mb' };
  return { name: 'Low', json: '10mb', url: '10mb' };
})();
console.log(`🧠 Hardware: ${SYS.totalMemGB}GB RAM | Cores: ${SYS.cores} | Perfil: ${PROFILE.name}`);

const app = express();
const server = createServer(app);

// Configurar Socket.IO
initializeSocket(server);

// Configuração de CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
};

// ===== ⚙️ Middlewares essenciais + otimizações inline =====
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Compressão HTTP (ajuste de nível moderado para equilibrar CPU)
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(cors(corsOptions));
app.use(cookieParser());

// Limites dinâmicos baseados no perfil de hardware
app.use(express.json({ limit: PROFILE.json, strict: true }));
app.use(express.urlencoded({ extended: true, limit: PROFILE.url, parameterLimit: 1000 }));

// Segurança básica sem dependências adicionais
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

// Rate limiting simples em memória (janela 60s)
const rateBucket = new Map();
const WINDOW_MS = 60_000;
const LIMIT = 800; // por IP por minuto
setInterval(() => rateBucket.clear(), WINDOW_MS).unref();
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const count = (rateBucket.get(ip) || 0) + 1;
  rateBucket.set(ip, count);
  if (count > LIMIT) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
});

// Servir arquivos enviados (cache leve para mídia)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '6h',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=21600');
  }
}));

// Rotas da API
app.use('/api/baileys', baileysRoutes);
app.use('/api/whatsappjs', whatsappjsRoutes);
app.use('/api/wweb-advanced', wwebjsAdvancedRoutes);
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
app.use('/api/mc', multiChannelRoutes); // multi-channel (whatsapp/instagram/facebook)
app.use('/api/integrations', integrationRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/session-library', sessionLibraryRoutes);
app.use('/api/library-manager', libraryManagerRoutes);
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
  if (process.env.pm_id !== undefined) {
    console.log(`🟢 Executando sob PM2 (pm_id=${process.env.pm_id}) instâncias=${process.env.instances || '1'}`);
  } else {
    console.log('ℹ️ PM2 não detectado (executando diretamente via node / npm).');
  }
  
  // Inicializar Redis
  console.log('🔗 Inicializando Redis...');
  await RedisService.initialize();
  
  // Aguardar um pouco para o servidor estabilizar
  setTimeout(async () => {
    console.log('🚀 Iniciando sistemas...');
    
    // Reconectar sessões que estavam conectadas
    await autoReconnectSessions();

    // Iniciar verificação de saúde (execução a cada 5 min)  
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

  // ===== 🧪 Monitoramento simples de event loop =====
  let last = Date.now();
  setInterval(() => {
    const now = Date.now();
    const lag = now - last - 1000;
    if (lag > 250) console.warn(`⚠️ Event loop lag: ${lag}ms`);
    last = now;
  }, 1000).unref();

  // ===== ♻️ Graceful shutdown =====
  const shutdown = (signal) => {
    console.log(`\n🛑 Recebido ${signal}. Encerrando com segurança...`);
    server.close(() => {
      console.log('HTTP server fechado.');
      process.exit(0);
    });
    setTimeout(() => {
      console.warn('Forçando saída (timeout).');
      process.exit(1);
    }, 10000).unref();
  };
  ['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => shutdown(sig)));
});

// Ajustes de timeout do servidor (reduz conexões zumbis)
server.keepAliveTimeout = 65_000; // padrão 5s em alguns ambientes
server.headersTimeout = 66_000;
server.requestTimeout = 60_000;