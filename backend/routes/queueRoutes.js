import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createQueue,
  listQueues,
  assignUserToQueue,
  getUserQueues,
  getQueueTickets,
  updateQueue,
  getQueueByName,
  deleteQueue,
  getQueueStats,
  bulkActions,
  archiveQueue,
  duplicateQueue,
  transferTicketToQueue,
  getQueuePerformance,
  getAdvancedSettings,
  updateAdvancedSettings,
  getQueueActivities
} from '../controllers/queueController.js';

const router = express.Router();

// Rotas básicas
router.post('/', authenticateToken, createQueue);
router.get('/', authenticateToken, listQueues);
router.put('/:queueId', authenticateToken, updateQueue);
router.delete('/:queueId', authenticateToken, deleteQueue);

// Rotas de busca
router.get('/name/:queueName', authenticateToken, getQueueByName);
router.get('/:queueId/stats', authenticateToken, getQueueStats);
router.get('/:queueId/performance', authenticateToken, getQueuePerformance);

// Rotas de gestão de usuários
router.post('/assign', authenticateToken, assignUserToQueue);
router.get('/user', authenticateToken, getUserQueues);

// Rotas de tickets
router.get('/:queueId/tickets', authenticateToken, getQueueTickets);
router.post('/:queueId/transfer-ticket', authenticateToken, transferTicketToQueue);

// Rotas de ações avançadas
router.post('/bulk', authenticateToken, bulkActions);
router.post('/:queueId/archive', authenticateToken, archiveQueue);
router.post('/:queueId/duplicate', authenticateToken, duplicateQueue);

// Configurações avançadas da fila
router.get('/:queueId/advanced-settings', authenticateToken, getAdvancedSettings);
router.put('/:queueId/advanced-settings', authenticateToken, updateAdvancedSettings);

// Atividades recentes das filas
router.get('/activities', authenticateToken, getQueueActivities);

export default router;
