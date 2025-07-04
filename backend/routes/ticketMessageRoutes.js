import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { listMessages, sendMessage } from '../controllers/ticketMessageController.js';

const router = express.Router();

// Listar mensagens de um ticket
router.get('/:ticketId', authenticateToken, listMessages);

// Enviar mensagem em um ticket
router.post('/:ticketId', authenticateToken, sendMessage);

export default router;
