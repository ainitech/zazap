#!/usr/bin/env node

/**
 * Script para gerar arquivo .env otimizado baseado no hardware
 * Uso: node generate-env.js
 */

import { getPerformanceOptimizer } from './services/performanceOptimizer.js';
import fs from 'fs';
import path from 'path';

console.log('🔧 Gerador de Configuração Otimizada para Hardware');
console.log('=' .repeat(60));

try {
  // Detectar hardware e gerar configurações
  const optimizer = getPerformanceOptimizer();
  const summary = await optimizer.applyOptimizations();
  
  console.log(`\n💻 Sistema Detectado: ${summary.serverProfile.name}`);
  console.log(`📊 RAM: ${summary.systemInfo.totalMemoryGB}GB | CPU: ${summary.systemInfo.cpuCores} cores`);
  
  // Ler .env atual se existir
  const envPath = path.join(process.cwd(), '.env');
  let currentEnv = {};
  
  if (fs.existsSync(envPath)) {
    console.log('\n📄 Lendo configurações atuais do .env...');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#') && key.trim()) {
        currentEnv[key.trim()] = valueParts.join('=').trim();
      }
    });
    console.log(`   ${Object.keys(currentEnv).length} configurações encontradas`);
  }
  
  // Mesclar configurações otimizadas com as existentes
  const optimizedEnv = {
    ...currentEnv,
    ...summary.envConfig
  };
  
  // Manter configurações importantes do usuário
  const userKeys = [
    'DB_NAME', 'DB_USER', 'DB_PASS', 'DB_HOST', 'DB_PORT',
    'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD', 
    'JWT_SECRET', 'FRONTEND_ORIGINS', 'VAPID_PUBLIC', 'VAPID_PRIVATE',
    'PORT', 'HOST'
  ];
  
  userKeys.forEach(key => {
    if (currentEnv[key]) {
      optimizedEnv[key] = currentEnv[key];
    }
  });
  
  // Gerar conteúdo do .env otimizado
  const envContent = [
    '# Configuração Otimizada Automaticamente baseada no Hardware',
    `# Sistema: ${summary.serverProfile.name}`,
    `# Gerado em: ${new Date().toISOString()}`,
    '',
    '# ===== CONFIGURAÇÕES DE BANCO (PostgreSQL) =====',
    `DB_NAME=${optimizedEnv.DB_NAME || 'zazap'}`,
    `DB_USER=${optimizedEnv.DB_USER || 'postgres'}`,
    `DB_PASS=${optimizedEnv.DB_PASS || 'yourpassword'}`,
    `DB_HOST=${optimizedEnv.DB_HOST || 'localhost'}`,
    `DB_PORT=${optimizedEnv.DB_PORT || '5432'}`,
    `DB_DIALECT=postgres`,
    '',
    '# ===== OTIMIZAÇÕES DE BANCO =====',
    `DB_POOL_MAX=${optimizedEnv.DB_POOL_MAX}`,
    `DB_POOL_MIN=${optimizedEnv.DB_POOL_MIN}`,
    `DB_POOL_ACQUIRE=${optimizedEnv.DB_POOL_ACQUIRE}`,
    `DB_POOL_IDLE=${optimizedEnv.DB_POOL_IDLE}`,
    `DB_POOL_EVICT=${optimizedEnv.DB_POOL_EVICT}`,
    '',
    '# ===== REDIS CONFIGURATION =====',
    `REDIS_HOST=${optimizedEnv.REDIS_HOST || 'localhost'}`,
    `REDIS_PORT=${optimizedEnv.REDIS_PORT || '6379'}`,
    `REDIS_PASSWORD=${optimizedEnv.REDIS_PASSWORD || ''}`,
    `REDIS_DB=0`,
    `REDIS_MAX_MEMORY=${optimizedEnv.REDIS_MAX_MEMORY}`,
    `REDIS_MAX_CONNECTIONS=${optimizedEnv.REDIS_MAX_CONNECTIONS}`,
    '',
    '# ===== CONEXÕES WHATSAPP (ILIMITADAS) =====',
    `BAILEYS_CONNECTION_THROTTLE=${optimizedEnv.BAILEYS_CONNECTION_THROTTLE}`,
    `WWEBJS_CONNECTION_THROTTLE=${optimizedEnv.WWEBJS_CONNECTION_THROTTLE}`,
    '',
    '# ===== PROCESSAMENTO DE MENSAGENS =====',
    `MESSAGE_QUEUE_WORKERS=${optimizedEnv.MESSAGE_QUEUE_WORKERS}`,
    `QUEUE_BATCH_SIZE=${optimizedEnv.QUEUE_BATCH_SIZE}`,
    `QUEUE_CONCURRENCY=${optimizedEnv.QUEUE_CONCURRENCY}`,
    '',
    '# ===== SOCKET.IO =====',
    `SOCKET_MAX_LISTENERS=${optimizedEnv.SOCKET_MAX_LISTENERS}`,
    `SOCKET_ROOM_LIMIT=${optimizedEnv.SOCKET_ROOM_LIMIT}`,
    `SOCKET_PING_INTERVAL=${optimizedEnv.SOCKET_PING_INTERVAL}`,
    `SOCKET_PING_TIMEOUT=${optimizedEnv.SOCKET_PING_TIMEOUT}`,
    '',
    '# ===== PERFORMANCE =====',
    `NODE_OPTIONS=${optimizedEnv.NODE_OPTIONS}`,
    `CLUSTER_WORKERS=${optimizedEnv.CLUSTER_WORKERS}`,
    `ENABLE_CLUSTER=${optimizedEnv.ENABLE_CLUSTER}`,
    '',
    '# ===== CACHE =====',
    `CACHE_TTL_SHORT=${optimizedEnv.CACHE_TTL_SHORT}`,
    `CACHE_TTL_MEDIUM=${optimizedEnv.CACHE_TTL_MEDIUM}`,
    `CACHE_TTL_LONG=${optimizedEnv.CACHE_TTL_LONG}`,
    '',
    '# ===== RATE LIMITING =====',
    `API_RATE_LIMIT=${optimizedEnv.API_RATE_LIMIT}`,
    `RATE_LIMIT_MESSAGES_PER_MINUTE=${optimizedEnv.RATE_LIMIT_MESSAGES_PER_MINUTE}`,
    `MAX_CONCURRENT_UPLOADS=${optimizedEnv.MAX_CONCURRENT_UPLOADS}`,
    '',
    '# ===== MONITORAMENTO =====',
    `CPU_THRESHOLD=${optimizedEnv.CPU_THRESHOLD}`,
    `MEMORY_THRESHOLD=${optimizedEnv.MEMORY_THRESHOLD}`,
    `CONNECTION_THRESHOLD=${optimizedEnv.CONNECTION_THRESHOLD}`,
    `RESPONSE_TIME_THRESHOLD=${optimizedEnv.RESPONSE_TIME_THRESHOLD}`,
    '',
    '# ===== APLICAÇÃO =====',
    `JWT_SECRET=${optimizedEnv.JWT_SECRET || 'supersecretjwtkey'}`,
    `ACCESS_TOKEN_EXPIRY=30m`,
    `REFRESH_TOKEN_EXPIRY=7d`,
    `EXPOSE_REFRESH_TOKEN=true`,
    `FORCE_INSECURE_COOKIES=true`,
    `COOKIE_SAMESITE=lax`,
    `COOKIE_SECURE=false`,
    '',
    '# ===== SERVIDOR =====',
    `PORT=${optimizedEnv.PORT || '8081'}`,
    `HOST=${optimizedEnv.HOST || '0.0.0.0'}`,
    `FRONTEND_ORIGINS=${optimizedEnv.FRONTEND_ORIGINS || 'http://localhost:4000'}`,
    '',
    '# ===== ARQUIVOS =====',
    `MAX_FILE_SIZE=${optimizedEnv.MAX_FILE_SIZE}`,
    `ENABLE_COMPRESSION=${optimizedEnv.ENABLE_COMPRESSION}`,
    '',
    '# ===== WHATSAPP =====',
    `BAILEYS_AUTH_ROOT=privated/baileys`,
    '',
    '# ===== PUSH NOTIFICATIONS =====',
    `VAPID_PUBLIC=${optimizedEnv.VAPID_PUBLIC || 'your_vapid_public_key'}`,
    `VAPID_PRIVATE=${optimizedEnv.VAPID_PRIVATE || 'your_vapid_private_key'}`,
    '',
    '# ===== LOGS =====',
    `LOG_LEVEL=${optimizedEnv.LOG_LEVEL}`,
    `LOG_AUTH_VERBOSE=false`,
    `ENABLE_METRICS=${optimizedEnv.ENABLE_METRICS}`,
    '',
    '# ===== AUTO-OTIMIZAÇÃO =====',
    `ENABLE_AUTO_OPTIMIZATION=true`,
    `ENABLE_PERFORMANCE_MONITORING=true`,
    `ENABLE_ADAPTIVE_SCALING=true`,
    `ENABLE_MEMORY_MANAGEMENT=true`,
    `ENABLE_CONNECTION_POOLING=true`,
    `ENABLE_CACHING_LAYER=true`,
    `ENABLE_BACKGROUND_PROCESSING=true`
  ].join('\n');
  
  // Salvar .env otimizado
  const optimizedPath = path.join(process.cwd(), '.env.optimized');
  fs.writeFileSync(optimizedPath, envContent);
  
  console.log('\n✅ Arquivo .env otimizado gerado!');
  console.log(`📄 Localização: ${optimizedPath}`);
  
  // Mostrar resumo das otimizações
  console.log('\n📊 Resumo das Otimizações:');
  console.log(`   🗃️  Pool DB: ${optimizedEnv.DB_POOL_MAX} conexões máx`);
  console.log(`   🔴 Redis: ${optimizedEnv.REDIS_MAX_MEMORY} memória`);
  console.log(`   ⚡ Workers: ${optimizedEnv.MESSAGE_QUEUE_WORKERS} processadores`);
  console.log(`   🔌 Socket: ${optimizedEnv.SOCKET_MAX_LISTENERS} listeners`);
  console.log(`   📦 Cache: TTL médio ${optimizedEnv.CACHE_TTL_MEDIUM}s`);
  console.log(`   💾 Memória Node: ${optimizedEnv.NODE_OPTIONS}`);
  
  if (optimizedEnv.ENABLE_CLUSTER === 'true') {
    console.log(`   🔄 Cluster: ${optimizedEnv.CLUSTER_WORKERS} workers`);
  }
  
  console.log('\n💡 Para usar as otimizações:');
  console.log(`   1. Copie o conteúdo de .env.optimized para .env`);
  console.log(`   2. Ajuste as configurações do banco e Redis conforme necessário`);
  console.log(`   3. Reinicie a aplicação`);
  
  console.log('\n🔧 Recomendações:');
  summary.recommendations.forEach(rec => {
    console.log(`   ${rec}`);
  });
  
} catch (error) {
  console.error('❌ Erro ao gerar configuração:', error);
  process.exit(1);
}