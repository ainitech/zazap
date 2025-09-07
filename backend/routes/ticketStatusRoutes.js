import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { updateTicketStatus } from '../controllers/ticketStatusController.js';

const router = express.Router();

router.post('/update', authMiddleware, updateTicketStatus);

export default router;
