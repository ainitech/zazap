import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  listIntegrations, createIntegration, updateIntegration, deleteIntegration,
  linkIntegrationTicket, unlinkIntegrationTicket, getIntegrationsByTicket,
  linkIntegrationQueue, unlinkIntegrationQueue, getIntegrationsByQueue,
  executeIntegration, testIntegration
} from '../controllers/integrationController.js';

const router = express.Router();

router.get('/', authMiddleware, listIntegrations);
router.post('/', authMiddleware, createIntegration);
router.put('/:id', authMiddleware, updateIntegration);
router.delete('/:id', authMiddleware, deleteIntegration);

router.post('/link-ticket', authMiddleware, linkIntegrationTicket);
router.post('/unlink-ticket', authMiddleware, unlinkIntegrationTicket);
router.get('/by-ticket/:ticketId', authMiddleware, getIntegrationsByTicket);

router.post('/link-queue', authMiddleware, linkIntegrationQueue);
router.post('/unlink-queue', authMiddleware, unlinkIntegrationQueue);
router.get('/by-queue/:queueId', authMiddleware, getIntegrationsByQueue);

// Execução e teste de integrações
router.post('/:integrationId/execute', authMiddleware, executeIntegration);
router.post('/:integrationId/test', authMiddleware, testIntegration);

export default router;
