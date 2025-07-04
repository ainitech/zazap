import express from 'express';
import { initSession, sendTextMessage, sendMediaMessage } from '../controllers/whatsappjsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/init', authenticateToken, initSession);
router.post('/send-text', authenticateToken, sendTextMessage);
router.post('/send-media', authenticateToken, sendMediaMessage);

export default router;
