import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  createQueue,
  listQueues,
  assignUserToQueue,
  removeUserFromQueue,
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
router.post('/', authMiddleware, createQueue);
router.get('/', authMiddleware, listQueues);
router.put('/:queueId', authMiddleware, updateQueue);
router.delete('/:queueId', authMiddleware, deleteQueue);

// Rotas de busca
router.get('/name/:queueName', authMiddleware, getQueueByName);
router.get('/:queueId/stats', authMiddleware, getQueueStats);
router.get('/:queueId/performance', authMiddleware, getQueuePerformance);

// Rotas de gestão de usuários
router.post('/assign', authMiddleware, assignUserToQueue);
router.post('/remove-user', authMiddleware, removeUserFromQueue);
router.get('/user', authMiddleware, getUserQueues);

// Rotas de tickets
router.get('/:queueId/tickets', authMiddleware, getQueueTickets);
router.post('/:queueId/transfer-ticket', authMiddleware, transferTicketToQueue);

// Rotas de ações avançadas
router.post('/bulk', authMiddleware, bulkActions);
router.post('/:queueId/archive', authMiddleware, archiveQueue);
router.post('/:queueId/duplicate', authMiddleware, duplicateQueue);

// Configurações avançadas da fila
router.get('/:queueId/advanced-settings', authMiddleware, getAdvancedSettings);
router.put('/:queueId/advanced-settings', authMiddleware, updateAdvancedSettings);

// Atividades recentes das filas
router.get('/activities', authMiddleware, getQueueActivities);

export default router;
