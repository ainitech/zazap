import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { updateTicketStatus } from '../controllers/ticketStatusController.js';

const router = express.Router();

router.post('/update', authenticateToken, updateTicketStatus);

export default router;
