import express from 'express';
import { register, login, refresh, logout, logoutAll, getActiveDevices, me } from '../controllers/authController.js';
// Usar middleware unificado que aceita cookie httpOnly ou Bearer
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', authMiddleware, logoutAll);
router.get('/devices', authMiddleware, getActiveDevices);
router.get('/me', authMiddleware, me);

export default router;
