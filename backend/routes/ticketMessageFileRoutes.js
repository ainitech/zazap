import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware.js';
import { sendFileMessage } from '../controllers/ticketMessageFileController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/:ticketId/file', authMiddleware, upload.single('file'), sendFileMessage);

export default router;
