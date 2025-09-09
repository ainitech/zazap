import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  getProfile,
  updateProfile,
  changePassword,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';

const router = express.Router();

// Rotas para o perfil do usuário logado
router.get('/me', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, changePassword);

// Rotas para gerenciamento de usuários (apenas administradores)
router.get('/', authMiddleware, getUsers);
router.post('/', authMiddleware, createUser);
router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, updateUser);
router.delete('/:id', authMiddleware, deleteUser);

export default router;
