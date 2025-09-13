import { Sequelize } from 'sequelize';
import { getRedisManager } from './redisManager.js';

class DatabaseManager {
  constructor() {
    this.sequelize = null;
    this.redis = getRedisManager();
    this.queryCache = new Map();
    this.connectionPool = null;
    
    this.init();
  }

  async init() {
    try {
      // Connection pooling configuration for high concurrency
      const poolConfig = {
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        min: parseInt(process.env.DB_POOL_MIN) || 5,
        acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
        idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
        evict: parseInt(process.env.DB_POOL_EVICT) || 1000
      };

      this.sequelize = new Sequelize(
        process.env.DB_NAME || 'zazap',
        process.env.DB_USER || 'root',
        process.env.DB_PASS || '',
        {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 3306,
          dialect: process.env.DB_DIALECT || 'mysql',
          pool: poolConfig,
          logging: process.env.NODE_ENV === 'development' ? console.log : false,
          benchmark: process.env.NODE_ENV === 'development',
          
          // Performance optimizations
          define: {
            timestamps: true,
            underscored: false,
            freezeTableName: true
          },
          
          // Query optimizations
          dialectOptions: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
            // Enable multiple statements for better batch operations
            multipleStatements: true,
            // Connection settings for better performance
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true,
            // MySQL specific optimizations
            supportBigNumbers: true,
            bigNumberStrings: true
          },
          
          // Retry configuration
          retry: {
            match: [
              /ETIMEDOUT/,
              /EHOSTUNREACH/,
              /ECONNRESET/,
              /ECONNREFUSED/,
              /ETIMEDOUT/,
              /ESOCKETTIMEDOUT/,
              /EHOSTUNREACH/,
              /EPIPE/,
              /EAI_AGAIN/,
              /SequelizeConnectionError/,
              /SequelizeConnectionRefusedError/,
              /SequelizeHostNotFoundError/,
              /SequelizeHostNotReachableError/,
              /SequelizeInvalidConnectionError/,
              /SequelizeConnectionTimedOutError/
            ],
            max: 3
          }
        }
      );

      // Test connection
      await this.sequelize.authenticate();
      console.log('✅ Database connection established successfully');
      
      // Initialize connection monitoring
      this.setupConnectionMonitoring();
      
    } catch (error) {
      console.error('❌ Unable to connect to database:', error.message);
      throw error;
    }
  }

  setupConnectionMonitoring() {
    // Monitor connection pool
    setInterval(async () => {
      try {
        const pool = this.sequelize.connectionManager.pool;
        const metrics = {
          totalConnections: pool.size,
          idleConnections: pool.available,
          busyConnections: pool.using,
          waitingRequests: pool.pending
        };
        
        // Store metrics in Redis
        await this.redis.setMetric('db_pool_total', metrics.totalConnections);
        await this.redis.setMetric('db_pool_idle', metrics.idleConnections);
        await this.redis.setMetric('db_pool_busy', metrics.busyConnections);
        await this.redis.setMetric('db_pool_waiting', metrics.waitingRequests);
        
        // Log if pool is getting exhausted
        if (metrics.waitingRequests > 5) {
          console.warn(`⚠️ Database pool under pressure: ${metrics.waitingRequests} waiting requests`);
        }
        
      } catch (error) {
        console.error('❌ Error monitoring database pool:', error.message);
      }
    }, 30000); // Every 30 seconds
  }

  // Cached query execution
  async cachedQuery(sql, replacements = {}, options = {}) {
    const cacheKey = `query:${Buffer.from(sql + JSON.stringify(replacements)).toString('base64')}`;
    const cacheTTL = options.cacheTTL || 300; // 5 minutes default
    
    try {
      // Try to get from cache first
      if (options.useCache !== false) {
        const cached = await this.redis.getCache(cacheKey);
        if (cached) {
          await this.redis.incrementCounter('db_cache_hits');
          return cached;
        }
      }
      
      // Execute query
      const startTime = Date.now();
      const result = await this.sequelize.query(sql, {
        replacements,
        type: Sequelize.QueryTypes.SELECT,
        ...options
      });
      
      const queryTime = Date.now() - startTime;
      
      // Store in cache if enabled
      if (options.useCache !== false && result) {
        await this.redis.setCache(cacheKey, result, cacheTTL);
      }
      
      // Metrics
      await this.redis.incrementCounter('db_queries_executed');
      await this.redis.incrementCounter('db_cache_misses');
      
      if (queryTime > 1000) {
        console.warn(`🐌 Slow query detected (${queryTime}ms): ${sql.substring(0, 100)}...`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Database query error:', error.message);
      await this.redis.incrementCounter('db_query_errors');
      throw error;
    }
  }

  // Optimized batch operations
  async batchInsert(model, records, options = {}) {
    try {
      const batchSize = options.batchSize || 1000;
      const results = [];
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const batchResult = await model.bulkCreate(batch, {
          ignoreDuplicates: true,
          updateOnDuplicate: options.updateOnDuplicate || [],
          transaction: options.transaction,
          validate: false, // Skip validation for performance
          ...options
        });
        
        results.push(...batchResult);
        
        // Allow other operations to proceed
        if (i + batchSize < records.length) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
      
      await this.redis.incrementCounter('db_batch_inserts');
      return results;
      
    } catch (error) {
      console.error('❌ Batch insert error:', error.message);
      await this.redis.incrementCounter('db_batch_errors');
      throw error;
    }
  }

  // Optimized pagination
  async paginatedQuery(model, options = {}) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 50, 1000); // Max 1000 per page
    const offset = (page - 1) * limit;
    
    const cacheKey = `paginated:${model.name}:${Buffer.from(JSON.stringify(options)).toString('base64')}`;
    
    try {
      // Try cache first
      const cached = await this.redis.getCache(cacheKey);
      if (cached && options.useCache !== false) {
        return cached;
      }
      
      // Execute paginated query
      const result = await model.findAndCountAll({
        ...options,
        limit,
        offset,
        distinct: true
      });
      
      const paginatedResult = {
        rows: result.rows,
        pagination: {
          total: result.count,
          page,
          limit,
          pages: Math.ceil(result.count / limit),
          hasNext: page < Math.ceil(result.count / limit),
          hasPrev: page > 1
        }
      };
      
      // Cache result
      if (options.useCache !== false) {
        await this.redis.setCache(cacheKey, paginatedResult, options.cacheTTL || 180);
      }
      
      return paginatedResult;
      
    } catch (error) {
      console.error('❌ Paginated query error:', error.message);
      throw error;
    }
  }

  // Transaction wrapper with retry
  async withTransaction(callback, options = {}) {
    const maxRetries = options.maxRetries || 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const transaction = await this.sequelize.transaction({
        isolationLevel: options.isolationLevel || Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
      });
      
      try {
        const result = await callback(transaction);
        await transaction.commit();
        
        await this.redis.incrementCounter('db_transactions_success');
        return result;
        
      } catch (error) {
        await transaction.rollback();
        lastError = error;
        
        // Retry on specific errors
        if (attempt < maxRetries && this.isRetryableError(error)) {
          console.warn(`⚠️ Transaction failed (attempt ${attempt}/${maxRetries}), retrying:`, error.message);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }
        
        await this.redis.incrementCounter('db_transactions_failed');
        throw error;
      }
    }
    
    throw lastError;
  }

  isRetryableError(error) {
    const retryableErrors = [
      'ER_LOCK_WAIT_TIMEOUT',
      'ER_LOCK_DEADLOCK',
      'ETIMEDOUT',
      'ECONNRESET',
      'SequelizeTimeoutError',
      'SequelizeConnectionError'
    ];
    
    return retryableErrors.some(errorType => 
      error.name === errorType || 
      error.code === errorType || 
      error.message.includes(errorType)
    );
  }

  // Cache invalidation
  async invalidateCache(pattern) {
    try {
      // For Redis patterns, we need to use scan
      const stream = this.redis.redis.scanStream({
        match: `cache:${pattern}*`,
        count: 100
      });
      
      const keys = [];
      stream.on('data', (resultKeys) => {
        keys.push(...resultKeys);
      });
      
      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      
      if (keys.length > 0) {
        await this.redis.redis.del(...keys);
        console.log(`🗑️ Invalidated ${keys.length} cache entries matching: ${pattern}`);
      }
      
    } catch (error) {
      console.error('❌ Cache invalidation error:', error.message);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.sequelize.authenticate();
      const connectionTime = Date.now() - startTime;
      
      const pool = this.sequelize.connectionManager.pool;
      
      return {
        connected: true,
        connectionTime,
        pool: {
          total: pool.size,
          idle: pool.available,
          busy: pool.using,
          waiting: pool.pending
        }
      };
      
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  // Cleanup
  async cleanup() {
    try {
      await this.sequelize.close();
      console.log('✅ Database connections closed');
    } catch (error) {
      console.error('❌ Error closing database connections:', error.message);
    }
  }
}

// Singleton instance
let dbManager = null;

export const getDatabaseManager = () => {
  if (!dbManager) {
    dbManager = new DatabaseManager();
  }
  return dbManager;
};

export default getDatabaseManager;