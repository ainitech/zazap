import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import fs from 'fs';

const sessions = {};

export async function createBaileysSession(sessionId, onQR, onReady, onMessage) {
  const { state, saveCreds } = await useMultiFileAuthState(`baileys_auth_${sessionId}`);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // Desabilitar QR no terminal
  });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && onQR) {
      try {
        console.log(`QR Code gerado para sessão Baileys ${sessionId}`);
        // Gerar QR Code como base64
        const qrCodeDataURL = await qrcode.toDataURL(qr);
        onQR(qrCodeDataURL);
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
      }
    }
    
    if (connection === 'open' && onReady) {
      console.log(`Sessão Baileys ${sessionId} conectada e pronta`);
      onReady(sock);
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
      console.log(`Sessão Baileys ${sessionId} fechada:`, lastDisconnect?.error, ', deveria reconectar:', shouldReconnect);
      
      if (!shouldReconnect) {
        console.log(`Limpando sessão Baileys ${sessionId}`);
        cleanupBaileysSession(sessionId);
      }
    }
  });
  
  sock.ev.on('messages.upsert', ({ messages }) => {
    if (onMessage && messages && messages.length > 0) onMessage(messages[0], sock);
  });

  sessions[sessionId] = sock;
  return sock;
}

export function getBaileysSession(sessionId) {
  return sessions[sessionId];
}

export async function sendText(sessionId, to, text) {
  console.log(`🔍 Buscando sessão Baileys: "${sessionId}"`);
  console.log(`📋 Sessões ativas disponíveis:`, Object.keys(sessions));
  
  const sock = getBaileysSession(sessionId);
  if (!sock) {
    console.error(`❌ Sessão "${sessionId}" não encontrada no Baileys`);
    console.error(`📋 Sessões disponíveis:`, Object.keys(sessions));
    throw new Error(`Sessão "${sessionId}" não encontrada no Baileys`);
  }
  
  console.log(`✅ Sessão "${sessionId}" encontrada, enviando mensagem...`);
  return sock.sendMessage(to, { text });
}

export async function sendMedia(sessionId, to, buffer, mimetype) {
  const sock = getBaileysSession(sessionId);
  if (!sock) throw new Error('Sessão não encontrada');
  return sock.sendMessage(to, { document: buffer, mimetype });
}

// Função para limpar sessão Baileys
export function cleanupBaileysSession(sessionId) {
  const sock = sessions[sessionId];
  if (sock) {
    try {
      sock.end();
    } catch (error) {
      console.error(`Erro ao finalizar sessão Baileys ${sessionId}:`, error);
    }
    delete sessions[sessionId];
    
    // Limpar arquivos de autenticação
    try {
      const authPath = `baileys_auth_${sessionId}`;
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true });
        console.log(`Arquivos de autenticação da sessão ${sessionId} removidos`);
      }
    } catch (error) {
      console.error(`Erro ao remover arquivos de auth da sessão ${sessionId}:`, error);
    }
    
    console.log(`Sessão Baileys ${sessionId} removida da memória`);
  }
}

// Função para desconectar sessão Baileys manualmente
export async function disconnectBaileysSession(sessionId) {
  const sock = getBaileysSession(sessionId);
  if (sock) {
    try {
      await sock.logout();
      cleanupBaileysSession(sessionId);
      return true;
    } catch (error) {
      console.error(`Erro ao desconectar sessão Baileys ${sessionId}:`, error);
      cleanupBaileysSession(sessionId);
      return false;
    }
  }
  return false;
}

// Função para listar todas as sessões Baileys
export function listBaileysSessions() {
  return Object.keys(sessions);
}
