import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
if (!process.env.JWT_SECRET) {
  console.warn('[authMiddleware] WARNING: process.env.JWT_SECRET not set — using fallback secret. Set JWT_SECRET in .env for production.');
}

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Normalize user shape so controllers can rely on req.user.id
    const id = decoded.id || decoded.userId;
    req.user = { ...decoded, id };
    if (!req.user.id) {
      // If token does not carry an id, reject
      return res.status(401).json({ error: 'Token inválido (sem usuário).' });
    }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido.' });
  }
}
