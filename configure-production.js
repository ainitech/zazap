#!/usr/bin/env node

/**
 * Script de configuração para produção do Zazap
 * Este script ajuda a configurar o sistema para funcionar com IP e domínio
 */

import { networkInterfaces } from 'os';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getLocalIPs() {
  const nets = networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

function updateEnvFile(envPath, updates) {
  try {
    let content = '';
    try {
      content = readFileSync(envPath, 'utf8');
    } catch (error) {
      console.log(`📝 Criando novo arquivo ${envPath}`);
    }

    const lines = content.split('\n');
    const updatedLines = [];

    for (const line of lines) {
      const [key] = line.split('=');
      if (updates[key]) {
        updatedLines.push(`${key}=${updates[key]}`);
        delete updates[key];
      } else {
        updatedLines.push(line);
      }
    }

    // Adicionar novas variáveis
    for (const [key, value] of Object.entries(updates)) {
      updatedLines.push(`${key}=${value}`);
    }

    writeFileSync(envPath, updatedLines.join('\n'));
    console.log(`✅ ${envPath} atualizado`);
  } catch (error) {
    console.error(`❌ Erro ao atualizar ${envPath}:`, error.message);
  }
}

function main() {
  console.log('🚀 Configurando Zazap para produção...\n');

  const localIPs = getLocalIPs();
  console.log('📡 IPs locais detectados:');
  localIPs.forEach((ip, index) => {
    console.log(`   ${index + 1}. ${ip}`);
  });

  if (localIPs.length === 0) {
    console.log('⚠️  Nenhum IP local detectado');
    return;
  }

  // Usar o primeiro IP disponível
  const primaryIP = localIPs[0];
  console.log(`\n🎯 Usando IP principal: ${primaryIP}\n`);

  // Atualizar backend .env
  const backendEnvPath = join(__dirname, '..', 'backend', '.env');
  updateEnvFile(backendEnvPath, {
    HOST: '0.0.0.0',
    CORS_ORIGINS: `http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,http://${primaryIP}:3000,http://${primaryIP}:3001`
  });

  // Atualizar frontend .env
  const frontendEnvPath = join(__dirname, '..', 'frontend', '.env');
  updateEnvFile(frontendEnvPath, {
    REACT_APP_API_URL: `http://${primaryIP}:3001`,
    REACT_APP_WS_URL: `ws://${primaryIP}:3001`,
    REACT_APP_BACKEND_URL: `http://${primaryIP}:3001`
  });

  console.log('\n✅ Configuração concluída!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Reinicie o backend: cd backend && npm start');
  console.log('2. Reinicie o frontend: cd frontend && npm start');
  console.log('3. Acesse o sistema em:');
  console.log(`   - http://localhost:3000`);
  console.log(`   - http://${primaryIP}:3000`);
  console.log('\n🔧 Para domínio personalizado:');
  console.log('   - Configure um proxy reverso (nginx/apache)');
  console.log('   - Atualize as variáveis REACT_APP_* no frontend/.env');
  console.log('   - Configure SSL/HTTPS se necessário');

  console.log('\n🔒 Para produção:');
  console.log('   - Configure NODE_ENV=production');
  console.log('   - Configure HTTPS');
  console.log('   - Configure firewall');
  console.log('   - Configure logs');
}

main();
