import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { sendFileMessage } from '../controllers/ticketMessageFileController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/:ticketId/file', authenticateToken, upload.single('file'), sendFileMessage);

export default router;
