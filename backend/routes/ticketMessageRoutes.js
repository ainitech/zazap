import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  listMessages, 
  sendMessage, 
  sendMediaMessage, 
  listTicketMedia,
  deleteMessage,
  reactToMessage
} from '../controllers/ticketMessageController.js';
import upload, { compressImageMiddleware } from '../middleware/upload.js';

const router = express.Router();

// Listar mensagens de um ticket
router.get('/:ticketId', authenticateToken, listMessages);

// Enviar mensagem em um ticket
router.post('/:ticketId', authenticateToken, sendMessage);

// Upload de mídia em mensagem
router.post('/:ticketId/media', authenticateToken, upload.single('file'), compressImageMiddleware, sendMediaMessage);

// Listar mídias/anexos de um ticket
router.get('/:ticketId/media', authenticateToken, listTicketMedia);

// Deletar mensagem
router.delete('/:messageId', authenticateToken, deleteMessage);

// Reagir a mensagem
router.post('/:messageId/react', authenticateToken, reactToMessage);

export default router;
