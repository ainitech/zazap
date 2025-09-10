import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { initSession, sendTextMessage, sendMediaMessage } from '../controllers/wwebjsController.js';

// New isolated whatsapp-web.js routes (non-conflicting with Baileys)
const router = express.Router();

router.post('/init', authMiddleware, initSession);
router.post('/send-text', authMiddleware, sendTextMessage);
router.post('/send-media', authMiddleware, sendMediaMessage);

export default router;
