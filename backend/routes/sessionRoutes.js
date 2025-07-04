import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Session } from '../models/index.js';
import { createWhatsappJsSession, getWhatsappJsSession, cleanupSession } from '../services/whatsappjsService.js';
import { createBaileysSession, getBaileysSession, cleanupBaileysSession } from '../services/baileysService.js';
import { getSessionsStatus, reactivateSession } from '../controllers/sessionStatusController.js';

const router = express.Router();

// Estado global para armazenar QR codes
const sessionQRs = new Map();
const sessionStatus = new Map();

// GET /api/sessions - Listar todas as sessões
router.get('/', authenticateToken, async (req, res) => {
  try {
    const sessions = await Session.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    // Adicionar informações em tempo real
    const sessionsWithStatus = sessions.map(session => ({
      ...session.toJSON(),
      currentStatus: sessionStatus.get(session.whatsappId) || session.status,
      qrCode: sessionQRs.get(session.whatsappId) || null
    }));

    res.json(sessionsWithStatus);
  } catch (error) {
    console.error('Erro ao buscar sessões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/sessions - Criar nova sessão
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { whatsappId, library } = req.body;

    if (!whatsappId || !library) {
      return res.status(400).json({ error: 'whatsappId e library são obrigatórios' });
    }

    // Verificar se já existe uma sessão com esse whatsappId
    const existingSession = await Session.findOne({
      where: { whatsappId, userId: req.user.id }
    });

    if (existingSession) {
      return res.status(400).json({ error: 'Já existe uma sessão com este ID' });
    }

    // Criar sessão no banco
    const session = await Session.create({
      userId: req.user.id,
      whatsappId,
      library,
      status: 'disconnected'
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/sessions/:id/start - Iniciar sessão
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    // Limpar QR code anterior
    sessionQRs.delete(session.whatsappId);
    sessionStatus.set(session.whatsappId, 'connecting');

    if (session.library === 'whatsappjs') {
      const client = createWhatsappJsSession(
        session.whatsappId,
        (client) => {
          // Quando conectar
          sessionStatus.set(session.whatsappId, 'connected');
          sessionQRs.delete(session.whatsappId);
          session.update({ status: 'connected' });
        },
        (message, client) => {
          // Quando receber mensagem
          console.log('Mensagem recebida:', message.body);
        }
      );

      // Capturar QR code
      client.on('qr', (qr) => {
        sessionQRs.set(session.whatsappId, qr);
        sessionStatus.set(session.whatsappId, 'qr_ready');
      });

      client.on('disconnected', () => {
        sessionStatus.set(session.whatsappId, 'disconnected');
        sessionQRs.delete(session.whatsappId);
        session.update({ status: 'disconnected' });
      });

    } else if (session.library === 'baileys') {
      const sock = createBaileysSession(
        session.whatsappId,
        (qr) => {
          sessionQRs.set(session.whatsappId, qr);
          sessionStatus.set(session.whatsappId, 'qr_ready');
        },
        () => {
          sessionStatus.set(session.whatsappId, 'connected');
          sessionQRs.delete(session.whatsappId);
          session.update({ status: 'connected' });
        },
        (message, sock) => {
          console.log('Mensagem recebida via Baileys:', message);
        }
      );
    }

    res.json({ message: 'Sessão iniciada', status: 'connecting' });
  } catch (error) {
    console.error('Erro ao iniciar sessão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/sessions/:id/qr - Obter QR code da sessão
router.get('/:id/qr', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    const qrCode = sessionQRs.get(session.whatsappId);
    const status = sessionStatus.get(session.whatsappId) || session.status;

    res.json({ 
      qrCode, 
      status,
      hasQR: !!qrCode 
    });
  } catch (error) {
    console.error('Erro ao obter QR code:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/sessions/:id - Deletar sessão
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    // Parar a sessão se estiver ativa
    if (session.library === 'whatsappjs') {
      cleanupSession(session.whatsappId);
    } else if (session.library === 'baileys') {
      cleanupBaileysSession(session.whatsappId);
    }

    // Limpar dados em memória
    sessionQRs.delete(session.whatsappId);
    sessionStatus.delete(session.whatsappId);

    // Deletar do banco
    await session.destroy();

    res.json({ message: 'Sessão deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar sessão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/sessions/status - Verificar status de todas as sessões
router.get('/status', authenticateToken, getSessionsStatus);

// POST /api/sessions/:sessionId/reactivate - Reativar uma sessão
router.post('/:sessionId/reactivate', authenticateToken, reactivateSession);

export default router;
