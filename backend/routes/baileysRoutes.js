import express from 'express';
import { initSession, sendTextMessage, sendMediaMessage } from '../controllers/baileysController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/init', authMiddleware, initSession);
router.post('/send-text', authMiddleware, sendTextMessage);
router.post('/send-media', authMiddleware, sendMediaMessage);

export default router;
