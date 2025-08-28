import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('[authController] WARNING: process.env.JWT_SECRET is not set. Tokens signed/verified may be inconsistent.');
}

export const register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'E-mail já cadastrado.' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    res.status(201).json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Usuário não encontrado.' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Senha inválida.' });
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET || 'supersecret', { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const me = async (req, res) => {
  try {
    // O middleware authenticateToken já validou o token e adicionou req.user
    console.log('👤 AuthController.me: Usuário autenticado:', req.user);
    console.log('👤 AuthController.me: Headers:', req.headers.authorization);
    res.json(req.user);
  } catch (err) {
    console.error('👤 AuthController.me: Erro:', err);
    res.status(500).json({ error: err.message });
  }
};
