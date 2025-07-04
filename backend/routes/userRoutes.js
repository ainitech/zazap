import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getProfile, updateProfile } from '../controllers/userController.js';

const router = express.Router();

router.get('/me', authenticateToken, getProfile);
router.put('/me', authenticateToken, updateProfile);

export default router;
