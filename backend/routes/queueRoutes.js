import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createQueue,
  listQueues,
  assignUserToQueue,
  getUserQueues,
  getQueueTickets
} from '../controllers/queueController.js';

const router = express.Router();

router.post('/', authenticateToken, createQueue);
router.get('/', authenticateToken, listQueues);
router.post('/assign', authenticateToken, assignUserToQueue);
router.get('/user', authenticateToken, getUserQueues);
router.get('/:queueId/tickets', authenticateToken, getQueueTickets);

export default router;
