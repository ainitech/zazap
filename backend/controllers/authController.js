import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { TokenService } from '../services/tokenService.js';

// Util para determinar opções de cookie de refresh de forma flexível
const buildRefreshCookieOptions = () => {
  const forceInsecure = process.env.FORCE_INSECURE_COOKIES === 'true';
  const secureEnv = process.env.COOKIE_SECURE === 'true' || (!forceInsecure && process.env.NODE_ENV === 'production');
  // sameSite 'none' exige secure true; se não for possível, usar 'lax'
  const sameSite = process.env.COOKIE_SAMESITE || (secureEnv ? 'none' : 'lax');
  return {
    httpOnly: true,
    secure: secureEnv,
    sameSite,
    maxAge: (parseInt(process.env.REFRESH_COOKIE_DAYS || '7') * 24 * 60 * 60 * 1000),
    path: '/',
    // opcional: domain configurável
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
  };
};

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

    // Gerar tokens seguros
    const accessToken = TokenService.generateAccessToken(user);
    const refreshToken = await TokenService.generateRefreshToken(
      user.id,
      req.headers['user-agent'],
      req.ip || req.connection.remoteAddress
    );

    // Configurar cookie httpOnly para o refresh token
  res.cookie('refreshToken', refreshToken, buildRefreshCookieOptions());

    res.json({ 
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        ...(process.env.EXPOSE_REFRESH_TOKEN === 'true' ? { refreshToken } : {})
      });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: err.message });
  }
};

export const refresh = async (req, res) => {
  try {
    // Aceitar refresh token via cookie, header ou body para ambientes sem cookies seguros
    const refreshToken = req.cookies.refreshToken || req.headers['x-refresh-token'] || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token não fornecido.' });
    }

    const tokens = await TokenService.refreshTokens(refreshToken);

    // Renovar cookie (se possível). Em ambiente sem HTTPS + production, avisar no log.
    try {
      const opts = buildRefreshCookieOptions();
      if (opts.secure && req.protocol !== 'https' && !req.headers['x-forwarded-proto']) {
        console.warn('[authController] Cookie seguro exigido mas conexão não é https visível. Considere FORCE_INSECURE_COOKIES=true temporariamente.');
      }
      res.cookie('refreshToken', tokens.refreshToken, opts);
    } catch (cookieErr) {
      console.warn('[authController] Falha ao definir cookie de refresh:', cookieErr.message);
    }

    res.json({
      accessToken: tokens.accessToken,
      user: tokens.user,
      ...(process.env.EXPOSE_REFRESH_TOKEN === 'true' ? { refreshToken: tokens.refreshToken } : {})
    });
  } catch (err) {
    console.error('Erro no refresh:', err);
    res.status(401).json({ error: err.message || 'Token inválido ou expirado' });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      await TokenService.revokeRefreshToken(refreshToken);
    }

    // Limpar cookie
  res.clearCookie('refreshToken', buildRefreshCookieOptions());

    res.json({ message: 'Logout realizado com sucesso.' });
  } catch (err) {
    console.error('Erro no logout:', err);
    res.status(500).json({ error: err.message });
  }
};

export const logoutAll = async (req, res) => {
  try {
    const userId = req.user.id;
    await TokenService.revokeAllUserTokens(userId);

    // Limpar cookie
  res.clearCookie('refreshToken', buildRefreshCookieOptions());

    res.json({ message: 'Logout de todos os dispositivos realizado com sucesso.' });
  } catch (err) {
    console.error('Erro no logout all:', err);
    res.status(500).json({ error: err.message });
  }
};

export const getActiveDevices = async (req, res) => {
  try {
    const userId = req.user.id;
    const devices = await TokenService.getUserActiveDevices(userId);
    res.json(devices);
  } catch (err) {
    console.error('Erro ao buscar dispositivos:', err);
    res.status(500).json({ error: err.message });
  }
};

export const me = async (req, res) => {
  try {
  // authMiddleware já populou req.user
  console.log('👤 AuthController.me: Usuário autenticado:', req.user);
    res.json(req.user);
  } catch (err) {
    console.error('👤 AuthController.me: Erro:', err);
    res.status(500).json({ error: err.message });
  }
};
