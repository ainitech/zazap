import { getRedisManager } from './redisManager.js';
import { getDatabaseManager } from './databaseManager.js';

class MessageQueue {
  constructor() {
    this.redis = getRedisManager();
    this.db = getDatabaseManager();
    this.isProcessing = false;
    this.workers = new Map();
    this.maxWorkers = parseInt(process.env.MESSAGE_QUEUE_WORKERS) || 5;
    
    this.setupQueues();
  }

  async setupQueues() {
    // Different queues for different priorities
    this.queues = {
      high: 'messages:high',      // Real-time messages
      medium: 'messages:medium',  // Regular messages  
      low: 'messages:low',        // Background tasks
      bulk: 'messages:bulk'       // Bulk operations
    };

    // Start workers
    this.startWorkers();
    
    console.log(`🔄 Message queue initialized with ${this.maxWorkers} workers`);
  }

  // Add message to appropriate queue based on priority
  async addMessage(messageData, priority = 'medium', delay = 0) {
    try {
      const queueName = this.queues[priority] || this.queues.medium;
      const job = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: messageData.type || 'message',
        sessionId: messageData.sessionId,
        data: messageData,
        priority,
        createdAt: new Date().toISOString(),
        retries: 0,
        maxRetries: 3,
        delay
      };

      if (delay > 0) {
        // Delayed message
        const executeAt = Date.now() + delay;
        await this.redis.redis.zadd('messages:delayed', executeAt, JSON.stringify(job));
      } else {
        // Immediate processing
        await this.redis.addToQueue(queueName, job);
      }

      // Metrics
      await this.redis.incrementCounter(`queue_${priority}_added`);
      
      return job.id;
    } catch (error) {
      console.error('❌ Error adding message to queue:', error.message);
      throw error;
    }
  }

  // Start worker processes
  startWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const workerId = `worker_${i}`;
      this.workers.set(workerId, true);
      this.startWorker(workerId);
    }

    // Start delayed message processor
    this.startDelayedProcessor();
  }

  async startWorker(workerId) {
    console.log(`👷 Starting queue worker: ${workerId}`);
    
    while (this.workers.get(workerId)) {
      try {
        // Process high priority first, then medium, then low, then bulk
        const priorities = ['high', 'medium', 'low', 'bulk'];
        let processed = false;
        
        for (const priority of priorities) {
          const job = await this.redis.getFromQueue(this.queues[priority], 1);
          
          if (job) {
            await this.processMessage(job.data, workerId);
            processed = true;
            break;
          }
        }
        
        // If no job was processed, wait a bit
        if (!processed) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`❌ Worker ${workerId} error:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async startDelayedProcessor() {
    setInterval(async () => {
      try {
        const now = Date.now();
        const delayedJobs = await this.redis.redis.zrangebyscore(
          'messages:delayed', 
          0, 
          now, 
          'LIMIT', 0, 100
        );
        
        for (const jobStr of delayedJobs) {
          try {
            const job = JSON.parse(jobStr);
            
            // Move to appropriate queue
            const queueName = this.queues[job.priority] || this.queues.medium;
            await this.redis.addToQueue(queueName, job);
            
            // Remove from delayed queue
            await this.redis.redis.zrem('messages:delayed', jobStr);
            
          } catch (parseError) {
            console.error('❌ Error processing delayed job:', parseError.message);
            await this.redis.redis.zrem('messages:delayed', jobStr);
          }
        }
        
      } catch (error) {
        console.error('❌ Error in delayed processor:', error.message);
      }
    }, 1000); // Check every second
  }

  async processMessage(job, workerId) {
    const startTime = Date.now();
    
    try {
      console.log(`📨 Worker ${workerId} processing job ${job.id} (type: ${job.type})`);
      
      // Rate limiting per session
      const rateLimitKey = `rate_limit:${job.sessionId}`;
      const allowed = await this.redis.checkRateLimit(rateLimitKey, 100, 60); // 100 messages per minute
      
      if (!allowed) {
        console.warn(`⚠️ Rate limit exceeded for session ${job.sessionId}, requeueing job`);
        await this.requeueJob(job, 5000); // Requeue with 5 second delay
        return;
      }

      // Process based on job type
      switch (job.type) {
        case 'message':
          await this.processIncomingMessage(job);
          break;
        case 'status_update':
          await this.processStatusUpdate(job);
          break;
        case 'media_upload':
          await this.processMediaUpload(job);
          break;
        case 'bulk_operation':
          await this.processBulkOperation(job);
          break;
        default:
          console.warn(`⚠️ Unknown job type: ${job.type}`);
      }

      // Success metrics
      const processingTime = Date.now() - startTime;
      await this.redis.incrementCounter(`queue_${job.priority}_processed`);
      await this.redis.setMetric(`last_processing_time_${workerId}`, processingTime);
      
      if (processingTime > 5000) {
        console.warn(`🐌 Slow job processing: ${job.id} took ${processingTime}ms`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing job ${job.id}:`, error.message);
      
      // Retry logic
      if (job.retries < job.maxRetries) {
        job.retries++;
        const delay = Math.pow(2, job.retries) * 1000; // Exponential backoff
        await this.requeueJob(job, delay);
        console.log(`🔄 Job ${job.id} requeued (retry ${job.retries}/${job.maxRetries})`);
      } else {
        console.error(`💀 Job ${job.id} failed permanently after ${job.maxRetries} retries`);
        await this.redis.incrementCounter(`queue_${job.priority}_failed`);
        
        // Store failed job for analysis
        await this.redis.addToQueue('messages:failed', {
          ...job,
          failedAt: new Date().toISOString(),
          error: error.message
        });
      }
    }
  }

  async processIncomingMessage(job) {
    const { sessionId, messageData } = job.data;
    
    // Import message handler dynamically to avoid circular dependencies
    const { handleBaileysMessage } = await import('./messageCallbacks.js');
    
    // Process message
    await handleBaileysMessage(messageData, sessionId);
    
    // Update session activity
    await this.redis.setCache(`session_activity:${sessionId}`, Date.now(), 3600);
  }

  async processStatusUpdate(job) {
    const { sessionId, status, data } = job.data;
    
    // Broadcast status update
    const { emitToAll } = await import('./socket.js');
    emitToAll('session-status', {
      sessionId,
      status,
      data,
      timestamp: Date.now()
    });
    
    // Cache session status
    await this.redis.setCache(`session_status:${sessionId}`, { status, data }, 1800);
  }

  async processMediaUpload(job) {
    const { sessionId, ticketId, mediaData } = job.data;
    
    // Process media upload in background
    // This could include virus scanning, compression, etc.
    
    console.log(`📁 Processing media upload for ticket ${ticketId} in session ${sessionId}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async processBulkOperation(job) {
    const { operation, data, batchSize = 100 } = job.data;
    
    console.log(`📊 Processing bulk operation: ${operation} with ${data.length} items`);
    
    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      switch (operation) {
        case 'bulk_message_insert':
          await this.db.batchInsert(TicketMessage, batch);
          break;
        case 'bulk_contact_update':
          // Implement bulk contact updates
          break;
        default:
          console.warn(`⚠️ Unknown bulk operation: ${operation}`);
      }
      
      // Allow other operations to proceed
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  async requeueJob(job, delay = 0) {
    if (delay > 0) {
      const executeAt = Date.now() + delay;
      await this.redis.redis.zadd('messages:delayed', executeAt, JSON.stringify(job));
    } else {
      const queueName = this.queues[job.priority] || this.queues.medium;
      await this.redis.addToQueue(queueName, job);
    }
  }

  // Get queue statistics
  async getQueueStats() {
    try {
      const stats = {};
      
      for (const [name, queueName] of Object.entries(this.queues)) {
        stats[name] = {
          length: await this.redis.redis.llen(`queue:${queueName}`),
          added: await this.redis.redis.get(`metrics:queue_${name}_added`) || 0,
          processed: await this.redis.redis.get(`metrics:queue_${name}_processed`) || 0,
          failed: await this.redis.redis.get(`metrics:queue_${name}_failed`) || 0
        };
      }
      
      stats.delayed = await this.redis.redis.zcard('messages:delayed');
      stats.failed = await this.redis.redis.llen('queue:messages:failed');
      stats.workers = this.workers.size;
      
      return stats;
    } catch (error) {
      console.error('❌ Error getting queue stats:', error.message);
      return {};
    }
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🛑 Shutting down message queue workers...');
    
    // Stop all workers
    for (const workerId of this.workers.keys()) {
      this.workers.set(workerId, false);
    }
    
    // Wait for workers to finish current jobs
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('✅ Message queue shutdown complete');
  }
}

// Singleton instance
let messageQueue = null;

export const getMessageQueue = () => {
  if (!messageQueue) {
    messageQueue = new MessageQueue();
  }
  return messageQueue;
};

export default getMessageQueue;