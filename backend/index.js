import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
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

dotenv.config();

const app = express();

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
app.use('/uploads', express.static('uploads'));

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
app.use('/api/integrations', integrationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sessions', sessionRoutes);

app.get('/', (req, res) => {
  res.send('Zazap Backend API');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
