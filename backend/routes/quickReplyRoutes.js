import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getQuickReplies,
  getQuickReplyByShortcut,
  searchQuickReplies,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply,
  duplicateQuickReply,
  uploadMiddleware
} from '../controllers/quickReplyController.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// ================================
// ROTAS DE CONSULTA
// ================================

// Listar respostas rápidas do usuário
router.get('/', getQuickReplies);

// Buscar por atalho específico
router.get('/shortcut/:shortcut', getQuickReplyByShortcut);

// Buscar sugestões (para autocomplete)
router.get('/search', searchQuickReplies);

// ================================
// ROTAS DE CRUD
// ================================

// Criar nova resposta rápida (com possível upload de mídia)
router.post('/', uploadMiddleware, createQuickReply);

// Atualizar resposta rápida
router.put('/:id', uploadMiddleware, updateQuickReply);

// Deletar resposta rápida
router.delete('/:id', deleteQuickReply);

// Duplicar resposta rápida
router.post('/:id/duplicate', duplicateQuickReply);

export default router;
