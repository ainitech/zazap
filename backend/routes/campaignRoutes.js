import express from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  processCampaignContacts,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  getCampaignStats,
  duplicateCampaign
} from '../controllers/campaignController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Aplicar middleware de autenticação a todas as rotas
router.use(authMiddleware);

// Rotas CRUD básicas
router.post('/', createCampaign);
router.get('/', getCampaigns);
router.get('/:id', getCampaignById);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

// Rotas específicas de campanha
router.post('/:id/process-contacts', processCampaignContacts);
router.post('/:id/start', startCampaign);
router.post('/:id/pause', pauseCampaign);
router.post('/:id/resume', resumeCampaign);
router.post('/:id/duplicate', duplicateCampaign);

// Rotas de estatísticas
router.get('/:id/stats', getCampaignStats);

export default router;
