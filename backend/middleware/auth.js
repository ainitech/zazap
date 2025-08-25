import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

// Use a fallback secret to match places that use a fallback when signing
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  try {
    // Helpful debug when diagnosing invalid token issues
    // (will print header, token length and whether secret exists)
    console.debug('[auth] Authorization header=', authHeader);
    console.debug('[auth] token length=', token ? token.length : 0);
    console.debug('[auth] using JWT_SECRET=', Boolean(JWT_SECRET));

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Buscar o usuário no banco de dados para verificar se ainda existe
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    // Adicionar informações do usuário na requisição
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email
    };
    
    next();
  } catch (error) {
    // Log more context to help debugging invalid token
    console.error('Erro na autenticação:', error && error.message ? error.message : error);
    console.debug('[auth] Authorization header (on error)=', req.headers['authorization']);
    return res.status(401).json({ error: 'Token inválido', detail: error && error.message });
  }
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findByPk(decoded.userId);
      if (user) {
        req.user = {
          id: user.id,
          name: user.name,
          email: user.email
        };
      }
    } catch (error) {
      // Token inválido, mas não é obrigatório, então continuamos
      console.log('Token opcional inválido:', error.message);
    }
  }
  
  next();
};
