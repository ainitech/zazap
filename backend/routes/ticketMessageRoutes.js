import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
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
router.get('/:ticketId', authMiddleware, listMessages);

// Enviar mensagem em um ticket
router.post('/:ticketId', authMiddleware, sendMessage);

// Upload de mídia em mensagem
router.post('/:ticketId/media', authMiddleware, upload.single('file'), compressImageMiddleware, sendMediaMessage);

// Listar mídias/anexos de um ticket
router.get('/:ticketId/media', authMiddleware, listTicketMedia);

// Deletar mensagem
router.delete('/:messageId', authMiddleware, deleteMessage);

// Reagir a mensagem
router.post('/:messageId/react', authMiddleware, reactToMessage);

export default router;
