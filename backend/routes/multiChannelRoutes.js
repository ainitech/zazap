import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { initMultiChannelSession, sendMultiChannelText, sendMultiChannelMedia } from '../controllers/multiChannelController.js';
import multer from 'multer';

const upload = multer();
const router = express.Router();

router.post('/init', authMiddleware, initMultiChannelSession);
router.post('/send-text', authMiddleware, sendMultiChannelText);
router.post('/send-media', authMiddleware, upload.single('file'), sendMultiChannelMedia);

export default router;
