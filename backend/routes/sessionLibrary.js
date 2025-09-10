// Routes para gerenciamento de bibliotecas de sessões
import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import sessionLibraryManager from '../services/sessionLibraryManager.js';
import { Session } from '../models/index.js';

const router = express.Router();

// GET /api/session-library/status/:sessionId - Verificar status de uma sessão
router.get('/status/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const status = await sessionLibraryManager.getSessionStatus(sessionId);
    const library = await sessionLibraryManager.getSessionLibrary(sessionId);
    
    res.json({
      sessionId,
      library,
      status: status.status,
      active: status.active,
      session: status.session ? 'present' : 'absent'
    });
  } catch (error) {
    console.error('Erro ao verificar status da sessão:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/session-library/list - Listar todas as sessões
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const sessionsStats = await sessionLibraryManager.listAllSessions();
    const dbSessions = await Session.findAll({
      attributes: ['id', 'whatsappId', 'library', 'status', 'name']
    });
    
    res.json({
      statistics: sessionsStats,
      database: dbSessions
    });
  } catch (error) {
    console.error('Erro ao listar sessões:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/session-library/set-library - Definir biblioteca de uma sessão
router.post('/set-library', authMiddleware, async (req, res) => {
  try {
    const { sessionId, library } = req.body;
    
    if (!sessionId || !library) {
      return res.status(400).json({ error: 'sessionId e library são obrigatórios' });
    }
    
    if (!['baileys', 'wwebjs'].includes(library)) {
      return res.status(400).json({ error: 'library deve ser "baileys" ou "wwebjs"' });
    }
    
    const success = await sessionLibraryManager.setSessionLibrary(sessionId, library);
    
    if (success) {
      res.json({ 
        success: true, 
        message: `Biblioteca da sessão ${sessionId} definida como ${library}` 
      });
    } else {
      res.status(404).json({ error: 'Sessão não encontrada no banco de dados' });
    }
  } catch (error) {
    console.error('Erro ao definir biblioteca da sessão:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/session-library/reconnect - Reconectar uma sessão
router.post('/reconnect', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId é obrigatório' });
    }
    
    const reconnected = await sessionLibraryManager.reconnectSession(sessionId);
    
    if (reconnected) {
      res.json({ 
        success: true, 
        message: `Sessão ${sessionId} reconectada com sucesso` 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: `Não foi possível reconectar a sessão ${sessionId}` 
      });
    }
  } catch (error) {
    console.error('Erro ao reconectar sessão:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/session-library/send-test - Enviar mensagem de teste
router.post('/send-test', authMiddleware, async (req, res) => {
  try {
    const { sessionId, to, message = 'Teste de envio automático' } = req.body;
    
    if (!sessionId || !to) {
      return res.status(400).json({ error: 'sessionId e to são obrigatórios' });
    }
    
    await sessionLibraryManager.sendTextMessage(sessionId, to, message);
    
    res.json({ 
      success: true, 
      message: `Mensagem de teste enviada de ${sessionId} para ${to}` 
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem de teste:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: `Falha ao enviar: ${error.message}`
    });
  }
});

export default router;
