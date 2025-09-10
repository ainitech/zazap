import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { Session } from '../models/index.js';
import { emitToAll } from '../services/socket.js';
import { syncAllSessions } from '../services/sessionManager.js';
import { 
  createBaileysSession, 
  getBaileysSession, 
  cleanupBaileysSession,
  removeBaileysSession,
  shutdownBaileysSession,
  restartBaileysSession,
  listBaileysSessions
} from '../services/baileysService.js';
import { cancelSessionImport } from '../services/baileysService.js';
import { getSessionsStatus, reactivateSession } from '../controllers/sessionStatusController.js';
import { handleBaileysMessage } from '../services/messageCallbacks.js';

// Importar estado global das sessões
import { sessionQRs, sessionStatus } from '../services/sessionState.js';

const router = express.Router();

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
router.get('/', authMiddleware, async (req, res) => {
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
router.post('/', authMiddleware, async (req, res) => {
  try {
  const { whatsappId, library, name, importAllChats, importFromDate, importToDate } = req.body;

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
      name: name || null,
      library,
      status: 'disconnected',
      importAllChats: !!importAllChats,
      importFromDate: importFromDate || null,
      importToDate: importToDate || null
    });

    // Emitir atualização de sessões via WebSocket
    emitSessionsUpdate();

    res.status(201).json(session);
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/sessions/:id - Atualizar sessão (ex: defaultQueueId)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
  const { defaultQueueId, status, importAllChats, importFromDate, importToDate } = req.body;
    console.log(`🛠️ [PUT /sessions/${id}] User=${req.user?.id} Body=`, req.body);

    const session = await Session.findOne({ where: { id, userId: req.user.id } });
    if (!session) {
      console.log(`⚠️ Sessão id=${id} não encontrada para user=${req.user?.id}`);
      return res.status(404).json({ error: 'Sessão não encontrada para este usuário' });
    }

    const payload = {};
    if (typeof defaultQueueId !== 'undefined') payload.defaultQueueId = defaultQueueId || null;
  if (typeof status !== 'undefined') payload.status = status;
  if (typeof importAllChats !== 'undefined') payload.importAllChats = !!importAllChats;
  if (typeof importFromDate !== 'undefined') payload.importFromDate = importFromDate || null;
  if (typeof importToDate !== 'undefined') payload.importToDate = importToDate || null;

    await session.update(payload);

    emitToAll('session-updated', { id: session.id, ...payload });
    console.log(`✅ Sessão ${session.id} atualizada:`, payload);

    return res.json({ message: 'Sessão atualizada', session });
  } catch (error) {
    console.error('Erro ao atualizar sessão:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/sessions/:id/start - Iniciar sessão
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const session = await Session.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    // Verificar se a sessão já está conectada
    if (session.status === 'connected') {
      console.log(`✅ Sessão ${session.whatsappId} já está conectada`);
      return res.json({
        message: 'Sessão já está conectada',
        sessionId: session.id,
        status: 'connected',
        whatsappId: session.whatsappId
      });
    }

    // Limpar QR code anterior
    sessionQRs.delete(session.whatsappId);
    sessionStatus.set(session.whatsappId, 'connecting');

    // Emitir atualização de status via WebSocket
    emitToAll('session-status-update', {
      sessionId: session.id,
      status: 'connecting'
    });

  {
      try {
        const sock = await createBaileysSession(
          session.whatsappId,
          async (qr) => {
            try {
              let qrDataURL = qr;
              // Se já vier como data URL (baileysService já gerou) não reprocessar
              if (!qr.startsWith('data:image')) {
                if (qr.startsWith('RAW:')) {
                  // Fallback RAW recebido; tentar gerar imagem a partir do conteúdo original
                  const raw = Buffer.from(qr.slice(4), 'base64').toString('utf-8');
                  try {
                    const QRCode = await import('qrcode');
                    qrDataURL = await QRCode.toDataURL(raw, { errorCorrectionLevel: 'L', margin: 1, scale: 4 });
                  } catch (innerErr) {
                    console.warn('⚠️ Falha ao converter RAW QR em imagem, mantendo RAW:', innerErr.message);
                    qrDataURL = qr; // Mantém RAW
                  }
                } else {
                  // String aparentemente crua; tentar gerar data URL
                  try {
                    const QRCode = await import('qrcode');
                    qrDataURL = await QRCode.toDataURL(qr, { errorCorrectionLevel: 'L', margin: 1, scale: 4 });
                  } catch (convErr) {
                    console.warn('⚠️ Falha ao gerar imagem QR (provável já processado ou muito grande). Usando string direta.', convErr.message);
                    qrDataURL = qr.startsWith('data:image') ? qr : `RAW:${Buffer.from(qr).toString('base64')}`;
                  }
                }
              }
              sessionQRs.set(session.whatsappId, qrDataURL);
              sessionStatus.set(session.whatsappId, 'qr_ready');
              console.log(`📱 QR pronto para sessão Baileys ${session.whatsappId} (length=${qrDataURL.length})`);
            } catch (error) {
              console.error('Erro ao preparar QR Code:', error);
              sessionQRs.set(session.whatsappId, qr);
              sessionStatus.set(session.whatsappId, 'qr_ready');
            }
          },
          (sock) => {
            sessionStatus.set(session.whatsappId, 'connected');
            sessionQRs.delete(session.whatsappId);
            session.update({ status: 'connected' });
            console.log(`✅ Sessão Baileys ${session.whatsappId} conectada`);
          },
          async (message, sock) => {
            try {
              console.log('📨 Mensagem recebida via Baileys:', {
                id: message?.key?.id,
                from: message?.key?.remoteJid,
                fromMe: message?.key?.fromMe,
                content: message?.message?.conversation || message?.message?.extendedTextMessage?.text || '[mídia]'
              });
              // Processar e persistir a mensagem, criar/atualizar ticket e emitir para o frontend
              await handleBaileysMessage(message, session.id);
              console.log('✅ Mensagem processada por handleBaileysMessage (sessionRoutes)');
            } catch (err) {
              console.error('❌ Erro ao processar mensagem Baileys em sessionRoutes:', err);
            }
          }
        );

        await session.update({ status: 'connecting' });

      } catch (error) {
        console.error(`Erro ao iniciar sessão Baileys ${session.whatsappId}:`, error);
        sessionStatus.set(session.whatsappId, 'error');
        await session.update({ status: 'error' });
        return res.status(500).json({ error: 'Erro ao iniciar sessão Baileys' });
      }
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

// POST /api/sessions/:id/cancel-import - Cancelar importação em andamento
router.post('/:id/cancel-import', authMiddleware, async (req, res) => {
  try {
    const session = await Session.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }
    cancelSessionImport(session.whatsappId);
    return res.json({ message: 'Cancelamento solicitado' });
  } catch (err) {
    console.error('Erro ao cancelar importação:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/sessions/:id/qr - Obter QR code da sessão
router.get('/:id/qr', authMiddleware, async (req, res) => {
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
router.delete('/:id', authMiddleware, async (req, res) => {
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
      await shutdownBaileysSession(session.whatsappId);
    } catch (error) {
      console.error(`Erro ao desligar sessão ${session.whatsappId}:`, error);
      // Continuar com a deleção mesmo se houver erro ao desligar
    }

    // Limpar dados em memória
    sessionQRs.delete(session.whatsappId);
    sessionStatus.delete(session.whatsappId);

    // Deletar do banco
    await session.destroy();

    // Emitir atualização em tempo real para todos os clientes
    emitSessionsUpdate();

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
router.post('/:id/restart', authMiddleware, async (req, res) => {
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
      // Primeiro parar completamente a sessão (Baileys)
      await shutdownBaileysSession(session.whatsappId);
      await removeBaileysSession(session.whatsappId);

      // Aguardar um momento para garantir limpeza
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Agora criar uma nova sessão
  {
        const sock = await createBaileysSession(
          session.whatsappId,
          async (qr) => {
            try {
              let qrDataURL = qr;
              if (!qr.startsWith('data:image')) {
                if (qr.startsWith('RAW:')) {
                  const raw = Buffer.from(qr.slice(4), 'base64').toString('utf-8');
                  try {
                    const QRCode = await import('qrcode');
                    qrDataURL = await QRCode.toDataURL(raw, { errorCorrectionLevel: 'L', margin: 1, scale: 4 });
                  } catch (innerErr) {
                    console.warn('⚠️ Falha ao converter RAW QR em imagem, mantendo RAW:', innerErr.message);
                    qrDataURL = qr;
                  }
                } else {
                  try {
                    const QRCode = await import('qrcode');
                    qrDataURL = await QRCode.toDataURL(qr, { errorCorrectionLevel: 'L', margin: 1, scale: 4 });
                  } catch (convErr) {
                    console.warn('⚠️ Falha ao gerar imagem QR, usando fallback RAW:', convErr.message);
                    qrDataURL = `RAW:${Buffer.from(qr).toString('base64')}`;
                  }
                }
              }
              sessionQRs.set(session.whatsappId, qrDataURL);
              sessionStatus.set(session.whatsappId, 'qr_ready');
              console.log(`📱 QR pronto (restart) para sessão Baileys ${session.whatsappId} (length=${qrDataURL.length})`);
              emitToAll('session-qr-update', { 
                sessionId: session.id, 
                qrCode: qrDataURL,
                status: 'qr_ready'
              });
              emitSessionsUpdate();
            } catch (error) {
              console.error('❌ Erro ao preparar QR Code:', error);
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
router.post('/:id/shutdown', authMiddleware, async (req, res) => {
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
  await shutdownBaileysSession(session.whatsappId);
  await removeBaileysSession(session.whatsappId); // Remove completamente

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
router.post('/:id/qrcode', authMiddleware, async (req, res) => {
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
      // Parar sessão atual se estiver ativa (Baileys)
      await shutdownBaileysSession(session.whatsappId);
      await removeBaileysSession(session.whatsappId);

      // Aguardar um momento para garantir limpeza
      await new Promise(resolve => setTimeout(resolve, 1000));

  // Criar nova sessão apenas para gerar QR code (Baileys)
  {
        const sock = await createBaileysSession(
          session.whatsappId,
          async (qrDataURL) => {
            // QR Code já é gerado pelo service como base64
            sessionQRs.set(session.whatsappId, qrDataURL);
            sessionStatus.set(session.whatsappId, 'qr_ready');
            console.log(`📱 QR Code recebido para sessão Baileys ${session.whatsappId}`);
            emitSessionsUpdate();
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
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const baileysSessions = listBaileysSessions();

    const activeSessions = [
      ...baileysSessions.map(sessionId => ({ sessionId, library: 'baileys' }))
    ];

    res.json({
      total: activeSessions.length,
      sessions: activeSessions,
      baileys: baileysSessions.length
    });

  } catch (error) {
    console.error('Erro ao listar sessões ativas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/sessions - Listar todas as sessões
// Removed duplicate GET '/' route for sessions list

// GET /api/sessions/status - Verificar status de todas as sessões
router.get('/status', authMiddleware, getSessionsStatus);

// POST /api/sessions/sync - Sincronizar todas as sessões
router.post('/sync', authMiddleware, async (req, res) => {
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
router.post('/:sessionId/reactivate', authMiddleware, reactivateSession);

export default router;
