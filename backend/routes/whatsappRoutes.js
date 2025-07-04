import express from 'express';
import whatsappController from '../controllers/whatsappController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/select-library', authenticateToken, whatsappController.selectLibrary);
router.get('/selected-library', authenticateToken, whatsappController.getSelectedLibrary);

export default router;
