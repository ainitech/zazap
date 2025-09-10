import express from 'express';
import LibraryManagerController from '../controllers/libraryManagerController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

/**
 * Rotas para Gerenciamento Inteligente de Bibliotecas
 */

// GET /api/library-manager/system-info - Informações do sistema
router.get('/system-info', LibraryManagerController.getSystemInfo);

// GET /api/library-manager/stats - Estatísticas das sessões ativas
router.get('/stats', LibraryManagerController.getActiveSessionsStats);

// GET /api/library-manager/sessions - Lista todas as sessões com suas bibliotecas
router.get('/sessions', LibraryManagerController.listSessionsWithLibraries);

// GET /api/library-manager/recommendation - Recomendação de biblioteca
router.get('/recommendation', LibraryManagerController.getLibraryRecommendation);

// POST /api/library-manager/session - Cria sessão inteligente
router.post('/session', LibraryManagerController.createIntelligentSession);

// POST /api/library-manager/message - Envia mensagem inteligente
router.post('/message', LibraryManagerController.sendIntelligentMessage);

// PUT /api/library-manager/session/:sessionId/reconnect - Reconecta sessão
router.put('/session/:sessionId/reconnect', LibraryManagerController.reconnectIntelligentSession);

// PUT /api/library-manager/session/:sessionId/library - Altera biblioteca da sessão
router.put('/session/:sessionId/library', LibraryManagerController.changeSessionLibrary);

export default router;
