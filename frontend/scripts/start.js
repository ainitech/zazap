#!/usr/bin/env node
/**
 * Custom optimized start script for ZAZAP Frontend
 * Automatically applies performance optimizations and starts the development server
 * Usage:
 *   npm start                 -> uses .env PORT or defaults to 3000 (with optimizations)
 *   PORT=4000 npm start       -> starts on port 4000 (with optimizations)
 *   npm start -- 4000         -> starts on port 4000 (with optimizations)
 *   npm start -- --port=4000  -> starts on port 4000 (with optimizations)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 🚀 Apply frontend optimizations automatically
console.log('🚀 ZAZAP Frontend - Inicializando com Otimizações Automáticas');
console.log('=' .repeat(60));

// Set optimized environment variables
process.env.GENERATE_SOURCEMAP = 'false';
process.env.INLINE_RUNTIME_CHUNK = 'false';
process.env.FAST_REFRESH = 'true';
process.env.ESLint_NO_DEV_ERRORS = 'true';
process.env.SKIP_PREFLIGHT_CHECK = 'true';

// Memory optimization for Node.js
const nodeOptions = process.env.NODE_OPTIONS || '';
if (!nodeOptions.includes('--max_old_space_size')) {
  process.env.NODE_OPTIONS = `${nodeOptions} --max_old_space_size=4096`.trim();
}

console.log('✅ Otimizações de desenvolvimento aplicadas:');
console.log('   - Source maps desabilitados (inicialização mais rápida)');
console.log('   - Fast Refresh habilitado (hot reload otimizado)');
console.log('   - ESLint warnings apenas no console');
console.log('   - Memória Node.js otimizada (4GB)');
console.log('=' .repeat(60));

// Accept numeric CLI arg or --port= value
const cliArgs = process.argv.slice(2);
let explicitPort;
for (const arg of cliArgs) {
  if (/^--port=/.test(arg)) {
    explicitPort = arg.split('=')[1];
  } else if (/^\d+$/.test(arg)) {
    explicitPort = arg;
  }
}

if (explicitPort) {
  process.env.PORT = explicitPort;
}

// If no explicit port and not set in environment, try to read from .env
if (!process.env.PORT) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...rest] = trimmed.split('=');
        const key = k.trim();
        const value = rest.join('=').trim();
        if (key === 'PORT' && value) {
          process.env.PORT = value;
          break;
        }
      }
    }
  } catch (e) {
    console.warn('Could not read .env for PORT:', e.message);
  }
}

// Final fallback
if (!process.env.PORT) process.env.PORT = '3000';

console.log(`🚀 Iniciando servidor de desenvolvimento otimizado na porta ${process.env.PORT}`);
console.log(`🌐 Acesse: http://localhost:${process.env.PORT}`);
console.log('');

// Start React Scripts with optimizations
const child = spawn('npx', ['react-scripts', 'start'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Parando servidor de desenvolvimento...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Parando servidor de desenvolvimento...');
  child.kill('SIGTERM');
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.log(`\n❌ Servidor parou com código de saída ${code}`);
  } else {
    console.log('\n✅ Servidor parado com sucesso');
  }
  process.exit(code);
});
