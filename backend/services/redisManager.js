import Redis from 'ioredis';
import { EventEmitter } from 'events';

class RedisManager extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.isConnected = false;
    this.metrics = {
      operations: 0,
      errors: 0,
      hits: 0,
      misses: 0
    };
    
    this.connect();
  }

  async connect() {
    try {
      // Configuração simples para Redis standalone
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: false,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Configurações para evitar problemas de cluster
        enableOfflineQueue: false,
        enableReadyCheck: true,
        maxRetriesPerRequest: null
      };

      console.log(`🔄 Conectando ao Redis em ${redisConfig.host}:${redisConfig.port}...`);

      // Cliente Redis único e simples
      this.redis = new Redis(redisConfig);

      // Event listeners
      this.redis.on('connect', () => {
        console.log('✅ Redis conectado');
        this.isConnected = true;
        this.emit('connected');
      });

      this.redis.on('ready', () => {
        console.log('🚀 Redis pronto para uso');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.warn('⚠️ Redis erro:', err.message);
        this.isConnected = false;
        this.metrics.errors++;
        this.emit('error', err);
      });

      this.redis.on('close', () => {
        console.log('🔌 Redis desconectado');
        this.isConnected = false;
        this.emit('disconnected');
      });

      // Testar conexão
      await this.redis.ping();
      console.log('✅ Redis inicializado com sucesso (modo standalone)');

    } catch (error) {
      console.warn('⚠️ Redis não disponível:', error.message);
      console.log('📝 Sistema continuará sem Redis (modo fallback)');
      this.isConnected = false;
    }
  }

  // Verificar se está conectado
  isAvailable() {
    return this.isConnected && this.redis;
  }

  // Session Management
  async setSession(sessionId, sessionData, ttl = 3600) {
    if (!this.isAvailable()) return false;
    
    try {
      const key = `session:${sessionId}`;
      const serialized = JSON.stringify(sessionData);
      
      if (ttl > 0) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      
      this.metrics.operations++;
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar sessão:', error.message);
      this.metrics.errors++;
      return false;
    }
  }

  async getSession(sessionId) {
    if (!this.isAvailable()) return null;
    
    try {
      const key = `session:${sessionId}`;
      const data = await this.redis.get(key);
      
      this.metrics.operations++;
      
      if (!data) {
        this.metrics.misses++;
        return null;
      }
      
      this.metrics.hits++;
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Erro ao obter sessão:', error.message);
      this.metrics.errors++;
      return null;
    }
  }

  async deleteSession(sessionId) {
    if (!this.isAvailable()) return false;
    
    try {
      const key = `session:${sessionId}`;
      await this.redis.del(key);
      this.metrics.operations++;
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar sessão:', error.message);
      this.metrics.errors++;
      return false;
    }
  }

  // Cache Management
  async setCache(key, data, ttl = 300) {
    if (!this.isAvailable()) return false;
    
    try {
      const serialized = JSON.stringify(data);
      const cacheKey = `cache:${key}`;
      
      if (ttl > 0) {
        await this.redis.setex(cacheKey, ttl, serialized);
      } else {
        await this.redis.set(cacheKey, serialized);
      }
      
      this.metrics.operations++;
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar cache:', error.message);
      this.metrics.errors++;
      return false;
    }
  }

  async getCache(key) {
    if (!this.isAvailable()) return null;
    
    try {
      const cacheKey = `cache:${key}`;
      const data = await this.redis.get(cacheKey);
      
      this.metrics.operations++;
      
      if (!data) {
        this.metrics.misses++;
        return null;
      }
      
      this.metrics.hits++;
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Erro ao obter cache:', error.message);
      this.metrics.errors++;
      return null;
    }
  }

  async deleteCache(key) {
    if (!this.isAvailable()) return false;
    
    try {
      const cacheKey = `cache:${key}`;
      await this.redis.del(cacheKey);
      this.metrics.operations++;
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar cache:', error.message);
      this.metrics.errors++;
      return false;
    }
  }

  // Message Queue
  async pushQueue(queue, message, priority = 'medium') {
    if (!this.isAvailable()) return false;
    
    try {
      const queueKey = `queue:${queue}:${priority}`;
      const serialized = JSON.stringify({
        id: Date.now() + Math.random(),
        message,
        priority,
        timestamp: Date.now()
      });
      
      await this.redis.lpush(queueKey, serialized);
      this.metrics.operations++;
      return true;
    } catch (error) {
      console.error('❌ Erro ao adicionar à fila:', error.message);
      this.metrics.errors++;
      return false;
    }
  }

  async popQueue(queue, priority = 'medium') {
    if (!this.isAvailable()) return null;
    
    try {
      const queueKey = `queue:${queue}:${priority}`;
      const data = await this.redis.rpop(queueKey);
      
      this.metrics.operations++;
      
      if (!data) {
        this.metrics.misses++;
        return null;
      }
      
      this.metrics.hits++;
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Erro ao obter da fila:', error.message);
      this.metrics.errors++;
      return null;
    }
  }

  // Pub/Sub
  async publish(channel, message) {
    if (!this.isAvailable()) return false;
    
    try {
      const serialized = JSON.stringify(message);
      await this.redis.publish(channel, serialized);
      this.metrics.operations++;
      return true;
    } catch (error) {
      console.error('❌ Erro ao publicar mensagem:', error.message);
      this.metrics.errors++;
      return false;
    }
  }

  async subscribe(channel, callback) {
    if (!this.isAvailable()) return false;
    
    try {
      // Criar cliente separado para subscription
      const subscriber = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0
      });

      subscriber.subscribe(channel);
      
      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error.message);
          }
        }
      });

      return subscriber;
    } catch (error) {
      console.error('❌ Erro ao se inscrever:', error.message);
      return false;
    }
  }

  // Métricas
  getMetrics() {
    return {
      ...this.metrics,
      isConnected: this.isConnected,
      hitRatio: this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0
    };
  }

  // Health Check
  async healthCheck() {
    if (!this.isAvailable()) {
      return { status: 'disconnected', error: 'Redis não conectado' };
    }
    
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency,
        metrics: this.getMetrics()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // Cleanup
  async disconnect() {
    if (this.redis) {
      await this.redis.disconnect();
      this.redis = null;
      this.isConnected = false;
      console.log('🔌 Redis desconectado');
    }
  }
}

// Singleton instance
let redisManager = null;

export const getRedisManager = () => {
  if (!redisManager) {
    redisManager = new RedisManager();
  }
  return redisManager;
};

export default getRedisManager;