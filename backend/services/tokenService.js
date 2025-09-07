import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { RefreshToken, User } from '../models/index.js';
import { Op } from 'sequelize';
import RedisService from './redisService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_supersecret';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m'; // Token de acesso expira em 15 minutos
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'; // Refresh token expira em 7 dias

export class TokenService {
  // Gerar access token (JWT)
  static generateAccessToken(user) {
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role,
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  }

  // Gerar refresh token (otimizado com Redis)
  static async generateRefreshToken(userId, userAgent = null, ipAddress = null) {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenId = crypto.randomBytes(16).toString('hex'); // ID único para Redis
    const expiresAt = new Date();
    
    // Converter REFRESH_TOKEN_EXPIRY para milissegundos
    const days = parseInt(REFRESH_TOKEN_EXPIRY.replace('d', ''));
    expiresAt.setDate(expiresAt.getDate() + days);
    
    const tokenData = {
      token,
      tokenId,
      userId,
      userAgent,
      ipAddress,
      expiresAt: expiresAt.toISOString(),
      revoked: false
    };

    // Tentar armazenar no Redis primeiro
    const redisStored = await RedisService.storeRefreshToken(
      userId, 
      tokenId, 
      tokenData, 
      days * 24 * 60 * 60 // TTL em segundos
    );

    if (redisStored) {
      console.log('🚀 Token armazenado no Redis (ultra leve)');
      await this.cleanupRedisTokens(userId);
      // Para manter compatibilidade com chamadas existentes que esperam string, retornamos apenas o token
      return token;
    }
    console.log('📦 Fallback: usando banco de dados');
    return await this.generateRefreshTokenDB(userId, userAgent, ipAddress);
  }

  // Método original como fallback
  static async generateRefreshTokenDB(userId, userAgent = null, ipAddress = null) {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    
    // Converter REFRESH_TOKEN_EXPIRY para milissegundos
    const days = parseInt(REFRESH_TOKEN_EXPIRY.replace('d', ''));
    expiresAt.setDate(expiresAt.getDate() + days);

    // Revogar tokens antigos do mesmo usuário (limitar a 5 dispositivos)
    await this.cleanupExpiredTokens(userId);
    const activeTokens = await RefreshToken.count({
      where: { userId, revoked: false }
    });

    if (activeTokens >= 5) {
      // Revogar o token mais antigo
      const oldestToken = await RefreshToken.findOne({
        where: { userId, revoked: false },
        order: [['createdAt', 'ASC']]
      });
      if (oldestToken) {
        await oldestToken.update({ revoked: true });
      }
    }

    const refreshToken = await RefreshToken.create({
      token,
      userId,
      expiresAt,
      userAgent,
      ipAddress
    });

    return refreshToken.token;
  }

  // Limpeza de tokens antigos no Redis (manter apenas 5 por usuário)
  static async cleanupRedisTokens(userId) {
    try {
      const devices = await RedisService.getUserDevices(userId);
      
      if (devices.length > 5) {
        // Ordenar por último uso e remover os mais antigos
        const tokensToRemove = devices.slice(5); // Manter apenas os 5 mais recentes
        
        for (const device of tokensToRemove) {
          await RedisService.removeRefreshToken(userId, device.id);
        }
        
        console.log(`🧹 Removidos ${tokensToRemove.length} tokens antigos do Redis`);
      }
    } catch (error) {
      console.error('❌ Erro na limpeza de tokens Redis:', error);
    }
  }

  // Verificar access token
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Token de acesso inválido ou expirado');
    }
  }

  // Verificar refresh token (otimizado com Redis)
  static async verifyRefreshToken(token) {
    // Extrair tokenId do token (se usando Redis)
    // Para compatibilidade, tentamos ambos os métodos
    
    // Primeiro, tentar encontrar no Redis
    const redisToken = await this.verifyRefreshTokenRedis(token);
    if (redisToken) {
      return redisToken;
    }

    // Fallback para banco de dados
    return await this.verifyRefreshTokenDB(token);
  }

  // Verificar refresh token no Redis
  static async verifyRefreshTokenRedis(token) {
    try {
      if (!RedisService.isAvailable()) return null;
      const result = await RedisService.getRefreshTokenByToken(token);
      if (!result) return null;

      const { tokenData, userId, tokenId } = result;
      // Verificar expiração
      if (new Date(tokenData.expiresAt) < new Date()) {
        // Expirado: remover
        await RedisService.revokeRefreshTokenByToken(token);
        throw new Error('Refresh token expirado');
      }

      // Atualizar lastUsed
      await RedisService.updateTokenLastUsed(userId, tokenId);

      // Montar objeto que imita o modelo do Sequelize usado no restante do código
      const user = await User.findByPk(userId);
      if (!user) throw new Error('Usuário não encontrado para refresh token');
      return {
        token,
        userId,
        user,
        userAgent: tokenData.userAgent,
        ipAddress: tokenData.ipAddress,
        expiresAt: new Date(tokenData.expiresAt),
        revoked: false,
        // Método update compatível (no Redis apenas simula revogação removendo)
        update: async (fields) => {
          if (fields.revoked) {
            await RedisService.revokeRefreshTokenByToken(token);
          }
          return true;
        }
      };
    } catch (error) {
      console.error('❌ Erro ao verificar token no Redis:', error);
      return null;
    }
  }

  // Método original para banco de dados
  static async verifyRefreshTokenDB(token) {
    const refreshToken = await RefreshToken.findOne({
      where: { token, revoked: false },
      include: [{
        model: User,
        as: 'user'
      }]
    });

    if (!refreshToken) {
      throw new Error('Refresh token não encontrado ou revogado');
    }

    if (refreshToken.expiresAt < new Date()) {
      await refreshToken.update({ revoked: true });
      throw new Error('Refresh token expirado');
    }

    return refreshToken;
  }

  // Revogar refresh token
  static async revokeRefreshToken(token) {
    // Primeiro tenta revogar no Redis
    if (RedisService.isAvailable()) {
      const revoked = await RedisService.revokeRefreshTokenByToken(token);
      if (revoked) return;
    }
    const refreshToken = await RefreshToken.findOne({ where: { token } });
    if (refreshToken) await refreshToken.update({ revoked: true });
  }

  // Revogar todos os tokens de um usuário
  static async revokeAllUserTokens(userId) {
  // Redis
  try { await RedisService.clearUserTokens(userId); } catch(e) { /* ignore */ }
  // DB
  await RefreshToken.update({ revoked: true }, { where: { userId, revoked: false } });
  }

  // Limpar tokens expirados
  static async cleanupExpiredTokens(userId = null) {
    const whereClause = {
      expiresAt: {
        [Op.lt]: new Date()
      }
    };

    if (userId) {
      whereClause.userId = userId;
    }

    await RefreshToken.destroy({
      where: whereClause
    });
  }

  // Renovar tokens
  static async refreshTokens(refreshToken) {
    const refreshTokenRecord = await this.verifyRefreshToken(refreshToken);
    const user = refreshTokenRecord.user;

    // Gerar novos tokens
    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.generateRefreshToken(
      user.id, 
      refreshTokenRecord.userAgent, 
      refreshTokenRecord.ipAddress
    );

    // Revogar o refresh token usado
    await refreshTokenRecord.update({ revoked: true });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }

  // Listar dispositivos ativos do usuário
  static async getUserActiveDevices(userId) {
    return await RefreshToken.findAll({
      where: { userId, revoked: false },
      attributes: ['id', 'userAgent', 'ipAddress', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
  }
}
