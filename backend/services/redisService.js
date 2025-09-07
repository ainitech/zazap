import { createClient } from 'redis';

class RedisService {
  static client = null;
  static isConnected = false;

  // Inicializar conexão Redis
  static async initialize() {
    try {
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: 0,
      });

      // Event listeners
      this.client.on('error', (err) => {
        console.error('❌ Redis Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('🔗 Redis conectando...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis pronto para uso');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('🔌 Redis desconectado');
        this.isConnected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('❌ Falha ao conectar Redis:', error.message);
      console.log('⚠️ Continuando sem Redis (fallback para sistema atual)');
      this.isConnected = false;
      return false;
    }
  }

  // Verificar se Redis está disponível
  static isAvailable() {
    return this.isConnected && this.client;
  }

  // Armazenar refresh token com TTL
  static async storeRefreshToken(userId, tokenId, tokenData, ttlSeconds = 7 * 24 * 60 * 60) {
    if (!this.isAvailable()) return false;

    try {
      const key = `refresh_token:${userId}:${tokenId}`;
      const data = {
        ...tokenData,
        userId,
        createdAt: new Date().toISOString(),
      };

      await this.client.setEx(key, ttlSeconds, JSON.stringify(data));
      // Criar índice de lookup (token -> userId:tokenId) para busca rápida
      // Assim podemos verificar o refresh token direto sem varrer todos os dispositivos
      if (tokenData.token) {
        const lookupKey = `refresh_token_lookup:${tokenData.token}`;
        const lookupValue = JSON.stringify({ userId, tokenId });
        await this.client.setEx(lookupKey, ttlSeconds, lookupValue);
      }
      console.log(`🔐 Token armazenado no Redis: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao armazenar token no Redis:', error);
      return false;
    }
  }

  // Obter dados completos de um refresh token a partir do valor bruto do token
  static async getRefreshTokenByToken(token) {
    if (!this.isAvailable()) return null;
    try {
      const lookupKey = `refresh_token_lookup:${token}`;
      const lookup = await this.client.get(lookupKey);
      if (!lookup) return null;
      const { userId, tokenId } = JSON.parse(lookup);
      const key = `refresh_token:${userId}:${tokenId}`;
      const data = await this.client.get(key);
      if (!data) return null;
      const tokenData = JSON.parse(data);
      return { key, tokenData, userId, tokenId };
    } catch (error) {
      console.error('❌ Erro ao buscar refresh token por valor:', error);
      return null;
    }
  }

  // Revogar (remover) refresh token a partir do valor bruto
  static async revokeRefreshTokenByToken(token) {
    if (!this.isAvailable()) return false;
    try {
      const lookupKey = `refresh_token_lookup:${token}`;
      const lookup = await this.client.get(lookupKey);
      if (!lookup) return false;
      const { userId, tokenId } = JSON.parse(lookup);
      const key = `refresh_token:${userId}:${tokenId}`;
      await this.client.del(key);
      await this.client.del(lookupKey);
      console.log(`🗑️ Refresh token revogado (Redis) userId=${userId} tokenId=${tokenId}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao revogar refresh token (Redis):', error);
      return false;
    }
  }

  // Validar refresh token
  static async validateRefreshToken(userId, tokenId) {
    if (!this.isAvailable()) return null;

    try {
      const key = `refresh_token:${userId}:${tokenId}`;
      const data = await this.client.get(key);
      
      if (!data) {
        console.log(`🔍 Token não encontrado no Redis: ${key}`);
        return null;
      }

      const tokenData = JSON.parse(data);
      console.log(`✅ Token validado no Redis: ${key}`);
      return tokenData;
    } catch (error) {
      console.error('❌ Erro ao validar token no Redis:', error);
      return null;
    }
  }

  // Remover refresh token específico
  static async removeRefreshToken(userId, tokenId) {
    if (!this.isAvailable()) return false;

    try {
      const key = `refresh_token:${userId}:${tokenId}`;
      const deleted = await this.client.del(key);
      
      if (deleted > 0) {
        console.log(`🗑️ Token removido do Redis: ${key}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao remover token do Redis:', error);
      return false;
    }
  }

  // Limpar todos os tokens de um usuário
  static async clearUserTokens(userId) {
    if (!this.isAvailable()) return 0;

    try {
      const pattern = `refresh_token:${userId}:*`;
      
      // Buscar todas as keys do usuário
      const keys = [];
      for await (const key of this.client.scanIterator({
        MATCH: pattern,
        COUNT: 100
      })) {
        keys.push(key);
      }

      if (keys.length === 0) {
        console.log(`🔍 Nenhum token encontrado para usuário ${userId}`);
        return 0;
      }

      // Remover todas as keys
      const deleted = await this.client.del(keys);
      console.log(`🧹 ${deleted} tokens removidos para usuário ${userId}`);
      return deleted;
    } catch (error) {
      console.error('❌ Erro ao limpar tokens do usuário:', error);
      return 0;
    }
  }

  // Listar dispositivos conectados de um usuário
  static async getUserDevices(userId) {
    if (!this.isAvailable()) return [];

    try {
      const pattern = `refresh_token:${userId}:*`;
      const devices = [];

      for await (const key of this.client.scanIterator({
        MATCH: pattern,
        COUNT: 100
      })) {
        try {
          const data = await this.client.get(key);
          if (data) {
            const tokenData = JSON.parse(data);
            const tokenId = key.split(':')[2];
            
            devices.push({
              id: tokenId,
              userAgent: tokenData.userAgent || 'Desconhecido',
              ipAddress: tokenData.ipAddress || 'Desconhecido',
              createdAt: tokenData.createdAt,
              lastUsed: tokenData.lastUsed || tokenData.createdAt,
            });
          }
        } catch (parseError) {
          console.warn(`⚠️ Erro ao parsear token: ${key}`);
        }
      }

      return devices.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
    } catch (error) {
      console.error('❌ Erro ao listar dispositivos:', error);
      return [];
    }
  }

  // Atualizar último uso do token
  static async updateTokenLastUsed(userId, tokenId) {
    if (!this.isAvailable()) return false;

    try {
      const key = `refresh_token:${userId}:${tokenId}`;
      const data = await this.client.get(key);
      
      if (!data) return false;

      const tokenData = JSON.parse(data);
      tokenData.lastUsed = new Date().toISOString();

      // Manter o TTL original
      const ttl = await this.client.ttl(key);
      if (ttl > 0) {
        await this.client.setEx(key, ttl, JSON.stringify(tokenData));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erro ao atualizar último uso:', error);
      return false;
    }
  }

  // Estatísticas do Redis
  static async getStats() {
    if (!this.isAvailable()) return null;

    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        connected: this.isConnected,
        memory: info,
        keyspace: keyspace,
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return null;
    }
  }

  // Cleanup graceful
  static async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        console.log('👋 Redis desconectado graciosamente');
      } catch (error) {
        console.error('❌ Erro ao desconectar Redis:', error);
      }
    }
  }
}

export default RedisService;
