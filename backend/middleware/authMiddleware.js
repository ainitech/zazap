import jwt from 'jsonwebtoken';
import { TokenService } from '../services/tokenService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
if (!process.env.JWT_SECRET) {
  console.warn('[authMiddleware] WARNING: process.env.JWT_SECRET not set — using fallback secret. Set JWT_SECRET in .env for production.');
}

// Função auxiliar para autenticar via refresh token
async function authenticateViaRefreshToken(req, res, next, refreshToken) {
  try {
    console.log('[auth] Validando refresh token...');
    const tokenData = await TokenService.verifyRefreshToken(refreshToken);
    
    if (!tokenData || !tokenData.user) {
      console.log('[auth] Refresh token inválido');
      return res.status(401).json({ error: 'Sessão expirada.' });
    }
    
    // Gerar novo access token temporário para esta requisição
    const accessToken = TokenService.generateAccessToken(tokenData.user);
    
    // Decodificar o token para obter dados do usuário
    const decoded = TokenService.verifyAccessToken(accessToken);
    const id = decoded.id || decoded.userId;
    req.user = { ...decoded, id };
    
    console.log('[auth] Autenticado via refresh token para usuário:', req.user.name);
    next();
    
  } catch (error) {
    console.error('[auth] Erro na autenticação via refresh token:', error);
    return res.status(401).json({ error: 'Sessão expirada.' });
  }
}

export default function authMiddleware(req, res, next) {
  
  
  let token = null;
  
  // Tentar obter token do header Authorization primeiro
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
    console.log('[auth] token from header, length=', token?.length);
    // Se receber "null", string vazia ou muito curto, ignorar e tratar como inexistente
    if (!token || token === 'null' || token.length < 10) {
      console.log('[auth] Bearer inválido (null/curto) — ignorando header e tentando cookie');
      token = null;
    }
  }

  // Se não há access token válido, tentar refresh cookie
  if (!token) {
    // Ordem de busca: cookie -> header -> body -> query (último, apenas fallback debug)
    const refreshToken =
      req.cookies?.refreshToken ||
      req.headers['x-refresh-token'] ||
      req.body?.refreshToken ||
      req.query?.refreshToken;
    if (refreshToken) {
      console.log('[auth] tentando autenticar via refresh token (fonte:',
        req.cookies?.refreshToken ? 'cookie' :
        (req.headers['x-refresh-token'] ? 'header' : (req.body?.refreshToken ? 'body' : 'query')),
        ')');
      return authenticateViaRefreshToken(req, res, next, refreshToken);
    }
  }

  if (!token) {
    console.log('[auth] Nenhum token válido encontrado (sem header e sem cookie)');
    return res.status(401).json({ error: 'Token não fornecido.' });
  }
  
  try {
    console.log('[auth] using JWT_SECRET=', !!process.env.JWT_SECRET);
    const decoded = TokenService.verifyAccessToken(token);
    // Normalize user shape so controllers can rely on req.user.id
    const id = decoded.id || decoded.userId;
    req.user = { ...decoded, id };
    
    if (!req.user.id) {
      // If token does not carry an id, reject
      return res.status(401).json({ error: 'Token inválido (sem usuário).' });
    }
    
    next();
  } catch (err) {
    // Se o token de acesso expirou, tentar renovar automaticamente
    if (err.message.includes('expirado') || err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED',
        message: 'Access token expirado. Use o refresh token para obter um novo.' 
      });
    }
    
    return res.status(401).json({ error: 'Token inválido.' });
  }
}

// Middleware opcional para rotas que permitem tanto usuários autenticados quanto não autenticados
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = TokenService.verifyAccessToken(token);
    const id = decoded.id || decoded.userId;
    req.user = { ...decoded, id };
    
    if (!req.user.id) {
      req.user = null;
    }
  } catch (err) {
    req.user = null;
  }
  
  next();
}
