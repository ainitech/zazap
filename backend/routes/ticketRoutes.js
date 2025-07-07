import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { moveTicket, listTickets, acceptTicket, resolveTicket, closeTicket } from '../controllers/ticketController.js';
import { transferTicket } from '../controllers/queueController.js';
import { updateTicketPriority } from '../controllers/ticketController.js';
const router = express.Router();

// Listar tickets com filtros e busca avançada
router.get('/', authenticateToken, listTickets);

// Aceitar ticket
router.put('/:ticketId/accept', authenticateToken, acceptTicket);

// Resolver ticket
router.put('/:ticketId/resolve', authenticateToken, resolveTicket);

// Fechar ticket
router.put('/:ticketId/close', authenticateToken, closeTicket);

// Mover ticket para outra fila
router.post('/move', authenticateToken, moveTicket);

// Transferir ticket para outra fila (ou agente)
router.post('/:ticketId/transfer', authenticateToken, transferTicket);

// Atualizar prioridade do ticket
router.put('/:ticketId/priority', authenticateToken, updateTicketPriority);

export default router;
