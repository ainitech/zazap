import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  listIntegrations, createIntegration, updateIntegration, deleteIntegration,
  linkIntegrationTicket, unlinkIntegrationTicket, getIntegrationsByTicket,
  linkIntegrationQueue, unlinkIntegrationQueue, getIntegrationsByQueue,
  executeIntegration, testIntegration
} from '../controllers/integrationController.js';

const router = express.Router();

router.get('/', authenticateToken, listIntegrations);
router.post('/', authenticateToken, createIntegration);
router.put('/:id', authenticateToken, updateIntegration);
router.delete('/:id', authenticateToken, deleteIntegration);

router.post('/link-ticket', authenticateToken, linkIntegrationTicket);
router.post('/unlink-ticket', authenticateToken, unlinkIntegrationTicket);
router.get('/by-ticket/:ticketId', authenticateToken, getIntegrationsByTicket);

router.post('/link-queue', authenticateToken, linkIntegrationQueue);
router.post('/unlink-queue', authenticateToken, unlinkIntegrationQueue);
router.get('/by-queue/:queueId', authenticateToken, getIntegrationsByQueue);

// Execução e teste de integrações
router.post('/:integrationId/execute', authenticateToken, executeIntegration);
router.post('/:integrationId/test', authenticateToken, testIntegration);

export default router;
