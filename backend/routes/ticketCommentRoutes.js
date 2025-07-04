import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { addComment, getComments } from '../controllers/ticketCommentController.js';

const router = express.Router();

router.post('/', authenticateToken, addComment);
router.get('/:ticketId', authenticateToken, getComments);

export default router;
