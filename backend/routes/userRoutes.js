import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getProfile,
  updateProfile,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';

const router = express.Router();

// Rotas para o perfil do usuário logado
router.get('/me', authenticateToken, getProfile);
router.put('/me', authenticateToken, updateProfile);

// Rotas para gerenciamento de usuários (apenas administradores)
router.get('/', authenticateToken, getUsers);
router.post('/', authenticateToken, createUser);
router.get('/:id', authenticateToken, getUserById);
router.put('/:id', authenticateToken, updateUser);
router.delete('/:id', authenticateToken, deleteUser);

export default router;
