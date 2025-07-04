import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { moveTicket, listTickets } from '../controllers/ticketController.js';

const router = express.Router();


// Listar tickets com filtros e busca avançada
router.get('/', authenticateToken, listTickets);

router.post('/move', authenticateToken, moveTicket);

export default router;
