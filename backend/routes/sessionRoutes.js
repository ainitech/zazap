import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { Session } from '../models/index.js';
import { emitToAll } from '../services/socket.js';
import { syncAllSessions } from '../services/sessionManager.js';
import { 
  createWhatsappJsSession, 
  getWhatsappJsSession, 
  cleanupSession,
  removeWhatsappJsSession,
  shutdownWhatsappJsSession,
  restartWhatsappJsSession,
  listSessions as listWhatsappJsSessions
} from '../services/whatsappjsService.js';
import { 
  createBaileysSession, 
  getBaileysSession, 
  cleanupBaileysSession,
  removeBaileysSession,
  shutdownBaileysSession,
  restartBaileysSession,
  listBaileysSessions
} from '../services/baileysService.js';
import { getSessionsStatus, reactivateSession } from '../controllers/sessionStatusController.js';

const router = express.Router();

// Estado global para armazenar QR codes
const sessionQRs = new Map();
const sessionStatus = new Map();

// Função para emitir atualizações de sessões via WebSocket
const emitSessionsUpdate = async () => {
  try {
    const sessions = await Session.findAll({
      order: [['createdAt', 'DESC']]
    });

    const sessionsWithStatus = sessions.map(session => ({
      ...session.toJSON(),
      currentStatus: sessionStatus.get(session.whatsappId) || session.status,
      qrCode: sessionQRs.get(session.whatsappId) || null
    }));

    console.log('🔄 Emitindo atualização de sessões via WebSocket:', sessionsWithStatus.length);
    emitToAll('sessions-update', sessionsWithStatus);
  } catch (error) {
    console.error('❌ Erro ao emitir atualização de sessões:', error);
  }
};

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

    // Emitir atualização de sessões via WebSocket
    emitSessionsUpdate();

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

    // Emitir atualização de status via WebSocket
    emitToAll('session-status-update', { 
      sessionId: session.id, 
      status: 'connecting' 
    });

    if (session.library === 'whatsappjs') {
      try {
        const client = await createWhatsappJsSession(
          session.whatsappId,
          (client) => {
            // Quando conectar
            sessionStatus.set(session.whatsappId, 'connected');
            sessionQRs.delete(session.whatsappId);
            session.update({ status: 'connected' });
            console.log(`✅ Sessão WhatsApp.js ${session.whatsappId} conectada`);
          },
          (message, client) => {
            // Quando receber mensagem
            console.log('📨 Mensagem recebida WhatsApp.js:', message.body);
          }
        );

        // Capturar QR code
        client.on('qr', async (qr) => {
          try {
            // Converter QR para base64 data URL
            const QRCode = await import('qrcode');
            const qrDataURL = await QRCode.toDataURL(qr);
            sessionQRs.set(session.whatsappId, qrDataURL);
            sessionStatus.set(session.whatsappId, 'qr_ready');
            console.log(`📱 QR Code gerado para sessão ${session.whatsappId}`);
          } catch (error) {
            console.error('Erro ao gerar QR Code:', error);
            sessionQRs.set(session.whatsappId, qr); // Fallback para string original
            sessionStatus.set(session.whatsappId, 'qr_ready');
          }
        });

        client.on('disconnected', (reason) => {
          sessionStatus.set(session.whatsappId, 'disconnected');
          sessionQRs.delete(session.whatsappId);
          session.update({ status: 'disconnected' });
          console.log(`🔴 Sessão WhatsApp.js ${session.whatsappId} desconectada: ${reason}`);
        });

        await session.update({ status: 'connecting' });

      } catch (error) {
        console.error(`Erro ao iniciar sessão WhatsApp.js ${session.whatsappId}:`, error);
        sessionStatus.set(session.whatsappId, 'error');
        await session.update({ status: 'error' });
        return res.status(500).json({ error: 'Erro ao iniciar sessão WhatsApp.js' });
      }

    } else if (session.library === 'baileys') {
      try {
        const sock = await createBaileysSession(
          session.whatsappId,
          async (qr) => {
            try {
              // Converter QR para base64 data URL
              const QRCode = await import('qrcode');
              const qrDataURL = await QRCode.toDataURL(qr);
              sessionQRs.set(session.whatsappId, qrDataURL);
              sessionStatus.set(session.whatsappId, 'qr_ready');
              console.log(`📱 QR Code gerado para sessão Baileys ${session.whatsappId}`);
            } catch (error) {
              console.error('Erro ao gerar QR Code:', error);
              sessionQRs.set(session.whatsappId, qr); // Fallback para string original
              sessionStatus.set(session.whatsappId, 'qr_ready');
            }
          },
          (sock) => {
            sessionStatus.set(session.whatsappId, 'connected');
            sessionQRs.delete(session.whatsappId);
            session.update({ status: 'connected' });
            console.log(`✅ Sessão Baileys ${session.whatsappId} conectada`);
          },
          (message, sock) => {
            console.log('📨 Mensagem recebida via Baileys:', message);
          }
        );

        await session.update({ status: 'connecting' });

      } catch (error) {
        console.error(`Erro ao iniciar sessão Baileys ${session.whatsappId}:`, error);
        sessionStatus.set(session.whatsappId, 'error');
        await session.update({ status: 'error' });
        return res.status(500).json({ error: 'Erro ao iniciar sessão Baileys' });
      }
    } else {
      return res.status(400).json({ error: 'Biblioteca não suportada' });
    }

    res.json({ 
      message: 'Sessão iniciada com sucesso', 
      status: 'connecting',
      sessionId: session.whatsappId,
      library: session.library
    });

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

    console.log(`🗑️ Deletando sessão ${session.whatsappId} (${session.library})`);

    // Parar e limpar a sessão se estiver ativa
    try {
      if (session.library === 'whatsappjs') {
        await shutdownWhatsappJsSession(session.whatsappId);
      } else if (session.library === 'baileys') {
        await shutdownBaileysSession(session.whatsappId);
      }
    } catch (error) {
      console.error(`Erro ao desligar sessão ${session.whatsappId}:`, error);
      // Continuar com a deleção mesmo se houver erro ao desligar
    }

    // Limpar dados em memória
    sessionQRs.delete(session.whatsappId);
    sessionStatus.delete(session.whatsappId);

    // Deletar do banco
    await session.destroy();

    console.log(`✅ Sessão ${session.whatsappId} deletada com sucesso`);
    res.json({ 
      message: 'Sessão deletada com sucesso',
      sessionId: session.whatsappId,
      library: session.library
    });

  } catch (error) {
    console.error('Erro ao deletar sessão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/sessions/:id/restart - Reiniciar sessão completamente
router.post('/:id/restart', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    console.log(`🔄 Reiniciando sessão ${session.whatsappId} (${session.library}) completamente`);

    // Limpar dados em memória
    sessionQRs.delete(session.whatsappId);
    sessionStatus.set(session.whatsappId, 'restarting');

    // Emitir status de reinicialização
    emitToAll('session-status-update', { 
      sessionId: session.id, 
      status: 'restarting' 
    });

    try {
      // Primeiro parar completamente a sessão
      if (session.library === 'whatsappjs') {
        await shutdownWhatsappJsSession(session.whatsappId);
        await removeWhatsappJsSession(session.whatsappId);
      } else if (session.library === 'baileys') {
        await shutdownBaileysSession(session.whatsappId);
        await removeBaileysSession(session.whatsappId);
      }

      // Aguardar um momento para garantir limpeza
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Agora criar uma nova sessão
      if (session.library === 'whatsappjs') {
        const client = await createWhatsappJsSession(
          session.whatsappId,
          (client) => {
            sessionStatus.set(session.whatsappId, 'connected');
            sessionQRs.delete(session.whatsappId);
            session.update({ status: 'connected' });
            console.log(`✅ Sessão WhatsApp.js ${session.whatsappId} reiniciada e conectada`);
            
            // Emitir atualização de conexão
            emitToAll('session-status-update', { 
              sessionId: session.id, 
              status: 'connected' 
            });
            emitSessionsUpdate();
          },
          (message, client) => {
            console.log('📨 Mensagem recebida WhatsApp.js:', message.body);
          }
        );

        // Capturar QR code
        client.on('qr', async (qr) => {
          try {
            const QRCode = await import('qrcode');
            const qrDataURL = await QRCode.toDataURL(qr);
            sessionQRs.set(session.whatsappId, qrDataURL);
            sessionStatus.set(session.whatsappId, 'qr_ready');
            console.log(`📱 QR Code gerado para sessão ${session.whatsappId}`);
            
            // Emitir QR code via WebSocket
            emitToAll('session-qr-update', { 
              sessionId: session.id, 
              qrCode: qrDataURL,
              status: 'qr_ready'
            });
            emitSessionsUpdate();
          } catch (error) {
            console.error('❌ Erro ao gerar QR Code:', error);
            sessionQRs.set(session.whatsappId, qr);
            sessionStatus.set(session.whatsappId, 'qr_ready');
          }
        });

      } else if (session.library === 'baileys') {
        const sock = await createBaileysSession(
          session.whatsappId,
          async (qr) => {
            try {
              const QRCode = await import('qrcode');
              const qrDataURL = await QRCode.toDataURL(qr);
              sessionQRs.set(session.whatsappId, qrDataURL);
              sessionStatus.set(session.whatsappId, 'qr_ready');
              console.log(`📱 QR Code gerado para sessão Baileys ${session.whatsappId}`);
              
              // Emitir QR code via WebSocket
              emitToAll('session-qr-update', { 
                sessionId: session.id, 
                qrCode: qrDataURL,
                status: 'qr_ready'
              });
              emitSessionsUpdate();
            } catch (error) {
              console.error('❌ Erro ao gerar QR Code:', error);
              sessionQRs.set(session.whatsappId, qr);
              sessionStatus.set(session.whatsappId, 'qr_ready');
            }
          },
          (sock) => {
            sessionStatus.set(session.whatsappId, 'connected');
            sessionQRs.delete(session.whatsappId);
            session.update({ status: 'connected' });
            console.log(`✅ Sessão Baileys ${session.whatsappId} reiniciada e conectada`);
            
            // Emitir atualização de conexão
            emitToAll('session-status-update', { 
              sessionId: session.id, 
              status: 'connected' 
            });
            emitSessionsUpdate();
          },
          (message, sock) => {
            console.log('📨 Mensagem recebida via Baileys:', message);
          }
        );
      }

      await session.update({ status: 'connecting' });

      res.json({ 
        message: 'Sessão reiniciada com sucesso', 
        status: 'restarting',
        sessionId: session.whatsappId,
        library: session.library
      });

    } catch (error) {
      console.error(`❌ Erro ao reiniciar sessão ${session.whatsappId}:`, error);
      sessionStatus.set(session.whatsappId, 'error');
      await session.update({ status: 'error' });
      
      emitToAll('session-status-update', { 
        sessionId: session.id, 
        status: 'error' 
      });
      
      res.status(500).json({ error: 'Erro ao reiniciar sessão: ' + error.message });
    }

  } catch (error) {
    console.error('❌ Erro ao reiniciar sessão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/sessions/:id/shutdown - Parar e limpar sessão completamente
router.post('/:id/shutdown', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    console.log(`� Parando e limpando sessão ${session.whatsappId} (${session.library})`);

    try {
      // Desligar a sessão
      if (session.library === 'whatsappjs') {
        await shutdownWhatsappJsSession(session.whatsappId);
        await removeWhatsappJsSession(session.whatsappId); // Remove completamente
      } else if (session.library === 'baileys') {
        await shutdownBaileysSession(session.whatsappId);
        await removeBaileysSession(session.whatsappId); // Remove completamente
      }

      // Limpar completamente dados em memória
      sessionQRs.delete(session.whatsappId);
      sessionStatus.delete(session.whatsappId);

      // Atualizar status no banco
      await session.update({ status: 'stopped' });

      // Emitir atualização via WebSocket
      emitToAll('session-status-update', { 
        sessionId: session.id, 
        status: 'stopped' 
      });

      // Emitir atualização geral de sessões
      emitSessionsUpdate();

      console.log(`✅ Sessão ${session.whatsappId} parada e limpa completamente`);

      res.json({ 
        message: 'Sessão parada e limpa com sucesso',
        sessionId: session.whatsappId,
        library: session.library,
        status: 'stopped'
      });

    } catch (error) {
      console.error(`❌ Erro ao parar sessão ${session.whatsappId}:`, error);
      sessionStatus.set(session.whatsappId, 'error');
      await session.update({ status: 'error' });
      res.status(500).json({ error: 'Erro ao parar sessão: ' + error.message });
    }

  } catch (error) {
    console.error('❌ Erro ao parar sessão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/sessions/:id/qrcode - Gerar novo QR Code
router.post('/:id/qrcode', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    console.log(`📱 Gerando novo QR Code para sessão ${session.whatsappId} (${session.library})`);

    // Limpar QR code anterior
    sessionQRs.delete(session.whatsappId);
    sessionStatus.set(session.whatsappId, 'generating_qr');

    // Emitir status de geração de QR
    emitToAll('session-status-update', { 
      sessionId: session.id, 
      status: 'generating_qr' 
    });

    try {
      // Parar sessão atual se estiver ativa
      if (session.library === 'whatsappjs') {
        await shutdownWhatsappJsSession(session.whatsappId);
        await removeWhatsappJsSession(session.whatsappId);
      } else if (session.library === 'baileys') {
        await shutdownBaileysSession(session.whatsappId);
        await removeBaileysSession(session.whatsappId);
      }

      // Aguardar um momento para garantir limpeza
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Criar nova sessão apenas para gerar QR code
      if (session.library === 'whatsappjs') {
        const client = await createWhatsappJsSession(
          session.whatsappId,
          (client) => {
            sessionStatus.set(session.whatsappId, 'connected');
            sessionQRs.delete(session.whatsappId);
            session.update({ status: 'connected' });
            console.log(`✅ Sessão WhatsApp.js ${session.whatsappId} conectada via QR Code`);
            
            // Emitir atualização de conexão
            emitToAll('session-status-update', { 
              sessionId: session.id, 
              status: 'connected' 
            });
            emitSessionsUpdate();
          },
          (message, client) => {
            console.log('📨 Mensagem recebida WhatsApp.js:', message.body);
          }
        );

        // Capturar QR code
        client.on('qr', async (qr) => {
          try {
            const QRCode = await import('qrcode');
            const qrDataURL = await QRCode.toDataURL(qr);
            sessionQRs.set(session.whatsappId, qrDataURL);
            sessionStatus.set(session.whatsappId, 'qr_ready');
            console.log(`📱 Novo QR Code gerado para sessão ${session.whatsappId}`);
            
            // Emitir QR code via WebSocket
            emitToAll('session-qr-update', { 
              sessionId: session.id, 
              qrCode: qrDataURL,
              status: 'qr_ready'
            });
            emitSessionsUpdate();
          } catch (error) {
            console.error('❌ Erro ao gerar QR Code:', error);
            sessionQRs.set(session.whatsappId, qr);
            sessionStatus.set(session.whatsappId, 'qr_ready');
          }
        });

      } else if (session.library === 'baileys') {
        const sock = await createBaileysSession(
          session.whatsappId,
          async (qr) => {
            try {
              const QRCode = await import('qrcode');
              const qrDataURL = await QRCode.toDataURL(qr);
              sessionQRs.set(session.whatsappId, qrDataURL);
              sessionStatus.set(session.whatsappId, 'qr_ready');
              console.log(`📱 Novo QR Code gerado para sessão Baileys ${session.whatsappId}`);
              
              // Emitir QR code via WebSocket
              emitToAll('session-qr-update', { 
                sessionId: session.id, 
                qrCode: qrDataURL,
                status: 'qr_ready'
              });
              emitSessionsUpdate();
            } catch (error) {
              console.error('❌ Erro ao gerar QR Code:', error);
              sessionQRs.set(session.whatsappId, qr);
              sessionStatus.set(session.whatsappId, 'qr_ready');
            }
          },
          (sock) => {
            sessionStatus.set(session.whatsappId, 'connected');
            sessionQRs.delete(session.whatsappId);
            session.update({ status: 'connected' });
            console.log(`✅ Sessão Baileys ${session.whatsappId} conectada via QR Code`);
            
            // Emitir atualização de conexão
            emitToAll('session-status-update', { 
              sessionId: session.id, 
              status: 'connected' 
            });
            emitSessionsUpdate();
          },
          (message, sock) => {
            console.log('📨 Mensagem recebida via Baileys:', message);
          }
        );
      }

      await session.update({ status: 'connecting' });

      res.json({ 
        message: 'Novo QR Code sendo gerado', 
        status: 'generating_qr',
        sessionId: session.whatsappId,
        library: session.library
      });

    } catch (error) {
      console.error(`❌ Erro ao gerar QR Code para sessão ${session.whatsappId}:`, error);
      sessionStatus.set(session.whatsappId, 'error');
      await session.update({ status: 'error' });
      
      emitToAll('session-status-update', { 
        sessionId: session.id, 
        status: 'error' 
      });
      
      res.status(500).json({ error: 'Erro ao gerar QR Code: ' + error.message });
    }

  } catch (error) {
    console.error('❌ Erro ao gerar QR Code:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/sessions/active - Listar sessões ativas
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const whatsappJsSessions = listWhatsappJsSessions();
    const baileysSessions = listBaileysSessions();

    const activeSessions = [
      ...whatsappJsSessions.map(sessionId => ({ sessionId, library: 'whatsappjs' })),
      ...baileysSessions.map(sessionId => ({ sessionId, library: 'baileys' }))
    ];

    res.json({
      total: activeSessions.length,
      sessions: activeSessions,
      whatsappjs: whatsappJsSessions.length,
      baileys: baileysSessions.length
    });

  } catch (error) {
    console.error('Erro ao listar sessões ativas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/sessions/status - Verificar status de todas as sessões
router.get('/status', authenticateToken, getSessionsStatus);

// POST /api/sessions/sync - Sincronizar todas as sessões
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Sincronização manual solicitada...');
    await syncAllSessions();
    res.json({ message: 'Sincronização concluída com sucesso' });
  } catch (error) {
    console.error('❌ Erro na sincronização manual:', error);
    res.status(500).json({ error: 'Erro na sincronização' });
  }
});

// POST /api/sessions/:sessionId/reactivate - Reativar uma sessão
router.post('/:sessionId/reactivate', authenticateToken, reactivateSession);

export default router;
