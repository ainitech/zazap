import { getRedisManager } from './redisManager.js';
import { getDatabaseManager } from './databaseManager.js';
import { getMessageQueue } from './messageQueue.js';
import os from 'os';
import { EventEmitter } from 'events';

class SystemMonitor extends EventEmitter {
  constructor() {
    super();
    this.redis = getRedisManager();
    this.db = getDatabaseManager();
    this.messageQueue = getMessageQueue();
    
    this.isMonitoring = false;
    this.metrics = {
      system: {},
      application: {},
      sessions: {},
      performance: {}
    };
    
    this.thresholds = {
      cpu: parseInt(process.env.CPU_THRESHOLD) || 80,
      memory: parseInt(process.env.MEMORY_THRESHOLD) || 80,
      connections: parseInt(process.env.CONNECTION_THRESHOLD) || 80,
      responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD) || 1000
    };
    
    this.startMonitoring();
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('📊 System monitoring started');
    
    // Collect metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 30000);
    
    // Health checks every 60 seconds  
    this.healthInterval = setInterval(() => {
      this.performHealthChecks();
    }, 60000);
    
    // Performance analysis every 5 minutes
    this.analysisInterval = setInterval(() => {
      this.analyzePerformance();
    }, 300000);
    
    // Cleanup old metrics every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupMetrics();
    }, 3600000);
  }

  async collectMetrics() {
    try {
      // System metrics
      const systemMetrics = {
        timestamp: Date.now(),
        cpu: {
          usage: await this.getCpuUsage(),
          cores: os.cpus().length,
          load: os.loadavg()
        },
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          usage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
          heap: process.memoryUsage()
        },
        network: await this.getNetworkStats(),
        uptime: {
          system: os.uptime(),
          process: process.uptime()
        }
      };

      // Application metrics
      const appMetrics = {
        timestamp: Date.now(),
        sessions: await this.getSessionMetrics(),
        database: await this.getDatabaseMetrics(),
        queue: await this.getQueueMetrics(),
        redis: await this.getRedisMetrics(),
        socket: await this.getSocketMetrics()
      };

      // Store metrics in Redis with TTL
      await this.redis.setCache('metrics:system:latest', systemMetrics, 3600);
      await this.redis.setCache('metrics:application:latest', appMetrics, 3600);
      
      // Store historical data (keep for 24 hours)
      const historyKey = `metrics:history:${Math.floor(Date.now() / 1800000)}`; // 30-minute buckets
      await this.redis.setCache(historyKey, { system: systemMetrics, application: appMetrics }, 86400);
      
      // Update internal state
      this.metrics.system = systemMetrics;
      this.metrics.application = appMetrics;
      
      // Check thresholds and emit alerts
      this.checkThresholds(systemMetrics, appMetrics);
      
    } catch (error) {
      console.error('❌ Error collecting metrics:', error.message);
    }
  }

  async getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    return Math.max(0, Math.min(100, usage));
  }

  async getNetworkStats() {
    const interfaces = os.networkInterfaces();
    const stats = {
      interfaces: Object.keys(interfaces).length,
      activeConnections: 0 // Would need platform-specific commands to get actual data
    };
    
    return stats;
  }

  async getSessionMetrics() {
    try {
      // Get session counts from different services
      const baileysCount = await this.redis.redis.scard('active:baileys:sessions') || 0;
      const wwebjsCount = await this.redis.redis.scard('active:wwebjs:sessions') || 0;
      
      // Get session activity
      const activeSessionsLastHour = await this.redis.redis.zcount(
        'session:activity', 
        Date.now() - 3600000, 
        Date.now()
      );
      
      return {
        total: baileysCount + wwebjsCount,
        baileys: baileysCount,
        wwebjs: wwebjsCount,
        activeLastHour: activeSessionsLastHour,
        messagesPerMinute: await this.getMessagesPerMinute()
      };
    } catch (error) {
      console.error('❌ Error getting session metrics:', error.message);
      return { total: 0, baileys: 0, wwebjs: 0 };
    }
  }

  async getMessagesPerMinute() {
    try {
      const key = 'metrics:messages:per_minute';
      const count = await this.redis.redis.get(key) || 0;
      return parseInt(count);
    } catch (error) {
      return 0;
    }
  }

  async getDatabaseMetrics() {
    try {
      const dbHealth = await this.db.healthCheck();
      return {
        connected: dbHealth.connected,
        connectionTime: dbHealth.connectionTime || 0,
        pool: dbHealth.pool || {},
        queriesExecuted: await this.redis.redis.get('metrics:db_queries_executed') || 0,
        cacheHits: await this.redis.redis.get('metrics:db_cache_hits') || 0,
        cacheMisses: await this.redis.redis.get('metrics:db_cache_misses') || 0
      };
    } catch (error) {
      console.error('❌ Error getting database metrics:', error.message);
      return { connected: false };
    }
  }

  async getQueueMetrics() {
    try {
      return await this.messageQueue.getQueueStats();
    } catch (error) {
      console.error('❌ Error getting queue metrics:', error.message);
      return {};
    }
  }

  async getRedisMetrics() {
    try {
      const redisHealth = await this.redis.healthCheck();
      const info = await this.redis.redis.info('memory');
      
      // Parse Redis memory info
      const memoryUsed = info.match(/used_memory:(\d+)/)?.[1] || 0;
      const memoryPeak = info.match(/used_memory_peak:(\d+)/)?.[1] || 0;
      
      return {
        connected: redisHealth.connected,
        latency: redisHealth.latency || 0,
        memoryUsed: parseInt(memoryUsed),
        memoryPeak: parseInt(memoryPeak),
        keyspaceHits: await this.redis.redis.info('stats').then(stats => 
          stats.match(/keyspace_hits:(\d+)/)?.[1] || 0
        ),
        keyspaceMisses: await this.redis.redis.info('stats').then(stats => 
          stats.match(/keyspace_misses:(\d+)/)?.[1] || 0
        )
      };
    } catch (error) {
      console.error('❌ Error getting Redis metrics:', error.message);
      return { connected: false };
    }
  }

  async getSocketMetrics() {
    try {
      // These would need to be implemented in the Socket.IO service
      return {
        connectedClients: await this.redis.redis.get('metrics:socket_clients') || 0,
        messagesPerSecond: await this.redis.redis.get('metrics:socket_messages_per_second') || 0,
        roomCount: await this.redis.redis.get('metrics:socket_rooms') || 0
      };
    } catch (error) {
      console.error('❌ Error getting socket metrics:', error.message);
      return {};
    }
  }

  checkThresholds(systemMetrics, appMetrics) {
    const alerts = [];
    
    // CPU threshold
    if (systemMetrics.cpu.usage > this.thresholds.cpu) {
      alerts.push({
        type: 'cpu_high',
        message: `CPU usage is ${systemMetrics.cpu.usage}% (threshold: ${this.thresholds.cpu}%)`,
        severity: 'warning',
        value: systemMetrics.cpu.usage,
        threshold: this.thresholds.cpu
      });
    }
    
    // Memory threshold
    if (systemMetrics.memory.usage > this.thresholds.memory) {
      alerts.push({
        type: 'memory_high',
        message: `Memory usage is ${systemMetrics.memory.usage.toFixed(1)}% (threshold: ${this.thresholds.memory}%)`,
        severity: 'warning',
        value: systemMetrics.memory.usage,
        threshold: this.thresholds.memory
      });
    }
    
    // Database connection threshold
    const dbPool = appMetrics.database?.pool;
    if (dbPool && dbPool.total > 0) {
      const connectionUsage = (dbPool.busy / dbPool.total) * 100;
      if (connectionUsage > this.thresholds.connections) {
        alerts.push({
          type: 'db_connections_high',
          message: `Database connections usage is ${connectionUsage.toFixed(1)}% (threshold: ${this.thresholds.connections}%)`,
          severity: 'critical',
          value: connectionUsage,
          threshold: this.thresholds.connections
        });
      }
    }
    
    // Response time threshold
    if (appMetrics.database?.connectionTime > this.thresholds.responseTime) {
      alerts.push({
        type: 'response_time_high',
        message: `Database response time is ${appMetrics.database.connectionTime}ms (threshold: ${this.thresholds.responseTime}ms)`,
        severity: 'warning',
        value: appMetrics.database.connectionTime,
        threshold: this.thresholds.responseTime
      });
    }
    
    // Emit alerts
    if (alerts.length > 0) {
      this.emit('alerts', alerts);
      this.storeAlerts(alerts);
    }
  }

  async storeAlerts(alerts) {
    try {
      for (const alert of alerts) {
        await this.redis.addToQueue('alerts', {
          ...alert,
          timestamp: Date.now()
        });
        
        // Store in metrics for dashboard
        await this.redis.incrementCounter(`alert_${alert.type}`);
      }
    } catch (error) {
      console.error('❌ Error storing alerts:', error.message);
    }
  }

  async performHealthChecks() {
    try {
      const healthChecks = {
        timestamp: Date.now(),
        redis: await this.redis.healthCheck(),
        database: await this.db.healthCheck(),
        system: {
          status: 'healthy',
          uptime: process.uptime()
        }
      };
      
      // Overall system health
      const allHealthy = Object.values(healthChecks).every(check => 
        check === healthChecks.timestamp || 
        check === healthChecks.system || 
        check.connected !== false
      );
      
      healthChecks.overall = allHealthy ? 'healthy' : 'degraded';
      
      await this.redis.setCache('health:latest', healthChecks, 300);
      
      if (!allHealthy) {
        this.emit('health_degraded', healthChecks);
      }
      
    } catch (error) {
      console.error('❌ Error performing health checks:', error.message);
    }
  }

  async analyzePerformance() {
    try {
      console.log('📈 Analyzing system performance...');
      
      const analysis = {
        timestamp: Date.now(),
        recommendations: [],
        trends: {},
        bottlenecks: []
      };
      
      // Analyze CPU trends
      const cpuTrend = await this.getCpuTrend();
      if (cpuTrend.average > 70) {
        analysis.recommendations.push({
          type: 'cpu',
          message: 'Consider scaling horizontally or optimizing CPU-intensive operations',
          priority: 'high'
        });
      }
      
      // Analyze memory trends
      const memoryTrend = await this.getMemoryTrend();
      if (memoryTrend.average > 70) {
        analysis.recommendations.push({
          type: 'memory',
          message: 'Consider increasing memory or implementing memory optimization',
          priority: 'medium'
        });
      }
      
      // Analyze database performance
      const dbMetrics = await this.getDatabaseMetrics();
      if (dbMetrics.connectionTime > 500) {
        analysis.bottlenecks.push({
          component: 'database',
          issue: 'High connection time',
          value: dbMetrics.connectionTime
        });
      }
      
      await this.redis.setCache('analysis:performance:latest', analysis, 1800);
      
    } catch (error) {
      console.error('❌ Error analyzing performance:', error.message);
    }
  }

  async getCpuTrend() {
    // Get CPU metrics from last hour
    const metrics = await this.getHistoricalMetrics('cpu', 12); // 12 x 5min = 1 hour
    const values = metrics.map(m => m.cpu?.usage || 0).filter(v => v > 0);
    
    if (values.length === 0) return { average: 0, trend: 'stable' };
    
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const trend = values.length > 1 ? 
      (values[values.length - 1] > values[0] ? 'increasing' : 'decreasing') : 
      'stable';
    
    return { average, trend, samples: values.length };
  }

  async getMemoryTrend() {
    // Get memory metrics from last hour
    const metrics = await this.getHistoricalMetrics('memory', 12);
    const values = metrics.map(m => m.memory?.usage || 0).filter(v => v > 0);
    
    if (values.length === 0) return { average: 0, trend: 'stable' };
    
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const trend = values.length > 1 ? 
      (values[values.length - 1] > values[0] ? 'increasing' : 'decreasing') : 
      'stable';
    
    return { average, trend, samples: values.length };
  }

  async getHistoricalMetrics(type, count) {
    try {
      const metrics = [];
      const now = Math.floor(Date.now() / 1800000); // 30-minute buckets
      
      for (let i = 0; i < count; i++) {
        const bucketTime = now - i;
        const data = await this.redis.getCache(`metrics:history:${bucketTime}`);
        if (data && data.system) {
          metrics.unshift(data.system);
        }
      }
      
      return metrics;
    } catch (error) {
      console.error('❌ Error getting historical metrics:', error.message);
      return [];
    }
  }

  async cleanupMetrics() {
    try {
      console.log('🧹 Cleaning up old metrics...');
      
      // Remove metrics older than 24 hours
      const cutoff = Math.floor((Date.now() - 86400000) / 1800000);
      const pattern = 'metrics:history:*';
      
      const stream = this.redis.redis.scanStream({
        match: pattern,
        count: 100
      });
      
      let cleaned = 0;
      stream.on('data', async (keys) => {
        for (const key of keys) {
          const bucketTime = parseInt(key.split(':').pop());
          if (bucketTime < cutoff) {
            await this.redis.redis.del(key);
            cleaned++;
          }
        }
      });
      
      stream.on('end', () => {
        console.log(`✅ Cleaned ${cleaned} old metric entries`);
      });
      
    } catch (error) {
      console.error('❌ Error cleaning up metrics:', error.message);
    }
  }

  // API endpoints for monitoring dashboard
  async getSystemStatus() {
    return {
      health: await this.redis.getCache('health:latest'),
      metrics: {
        system: await this.redis.getCache('metrics:system:latest'),
        application: await this.redis.getCache('metrics:application:latest')
      },
      analysis: await this.redis.getCache('analysis:performance:latest')
    };
  }

  async getMetricsHistory(hours = 1) {
    const buckets = Math.ceil(hours * 2); // 30-minute buckets
    return await this.getHistoricalMetrics('all', buckets);
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    clearInterval(this.metricsInterval);
    clearInterval(this.healthInterval);
    clearInterval(this.analysisInterval);
    clearInterval(this.cleanupInterval);
    
    console.log('📊 System monitoring stopped');
  }
}

// Singleton instance
let systemMonitor = null;

export const getSystemMonitor = () => {
  if (!systemMonitor) {
    systemMonitor = new SystemMonitor();
  }
  return systemMonitor;
};

export default getSystemMonitor;