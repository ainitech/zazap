import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode';

const sessions = {};

export function createWhatsappJsSession(sessionId, onReady, onMessage, onQr) {
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: sessionId }),
    puppeteer: { 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    }
  });

  client.on('qr', async (qr) => {
    try {
      console.log(`QR Code gerado para sessão ${sessionId}`);
      // Gerar QR Code como base64
      const qrCodeDataURL = await qrcode.toDataURL(qr);
      if (onQr) onQr(qrCodeDataURL);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  });

  client.on('ready', () => {
    console.log(`✅ Sessão ${sessionId} conectada e pronta`);
    console.log(`📋 Sessões ativas após conexão:`, Object.keys(sessions));
    if (onReady) onReady(client);
  });

  client.on('message', msg => {
    if (onMessage) onMessage(msg, client);
  });

  client.on('disconnected', (reason) => {
    console.log(`Sessão ${sessionId} desconectada:`, reason);
    cleanupSession(sessionId);
  });

  client.on('auth_failure', (msg) => {
    console.error(`Falha de autenticação na sessão ${sessionId}:`, msg);
    cleanupSession(sessionId);
  });

  client.initialize().catch(error => {
    console.error(`Erro ao inicializar sessão ${sessionId}:`, error);
    cleanupSession(sessionId);
  });

  sessions[sessionId] = client;
  console.log(`📝 Sessão "${sessionId}" registrada na memória`);
  console.log(`📋 Sessões ativas após registro:`, Object.keys(sessions));
  return client;
}

export function getWhatsappJsSession(sessionId) {
  return sessions[sessionId];
}

export async function sendText(sessionId, to, text) {
  console.log(`🔍 Buscando sessão WhatsApp-Web.js: "${sessionId}"`);
  console.log(`📋 Sessões ativas disponíveis:`, Object.keys(sessions));
  
  const client = getWhatsappJsSession(sessionId);
  if (!client) {
    console.error(`❌ Sessão "${sessionId}" não encontrada no WhatsApp-Web.js`);
    console.error(`📋 Sessões disponíveis:`, Object.keys(sessions));
    throw new Error(`Sessão "${sessionId}" não encontrada no WhatsApp-Web.js`);
  }
  
  console.log(`✅ Sessão "${sessionId}" encontrada, enviando mensagem...`);
  return client.sendMessage(to, text);
}

export async function sendMedia(sessionId, to, base64, filename, mimetype) {
  console.log(`🔍 Buscando sessão WhatsApp-Web.js para mídia: "${sessionId}"`);
  console.log(`📋 Sessões ativas disponíveis:`, Object.keys(sessions));
  
  const client = getWhatsappJsSession(sessionId);
  if (!client) {
    console.error(`❌ Sessão "${sessionId}" não encontrada no WhatsApp-Web.js`);
    console.error(`📋 Sessões disponíveis:`, Object.keys(sessions));
    throw new Error(`Sessão "${sessionId}" não encontrada no WhatsApp-Web.js`);
  }
  
  console.log(`✅ Sessão "${sessionId}" encontrada, enviando mídia...`);
  const media = new MessageMedia(mimetype, base64, filename);
  return client.sendMessage(to, media);
}

// Função para limpar sessão
export function cleanupSession(sessionId) {
  const client = sessions[sessionId];
  if (client) {
    try {
      client.destroy();
    } catch (error) {
      console.error(`Erro ao destruir sessão ${sessionId}:`, error);
    }
    delete sessions[sessionId];
    console.log(`🗑️ Sessão "${sessionId}" removida da memória`);
    console.log(`📋 Sessões ativas após remoção:`, Object.keys(sessions));
  }
}

// Função para desconectar sessão manualmente
export async function disconnectSession(sessionId) {
  const client = getWhatsappJsSession(sessionId);
  if (client) {
    try {
      await client.logout();
      cleanupSession(sessionId);
      return true;
    } catch (error) {
      console.error(`Erro ao desconectar sessão ${sessionId}:`, error);
      cleanupSession(sessionId);
      return false;
    }
  }
  return false;
}

// Função para listar todas as sessões
export function listSessions() {
  return Object.keys(sessions);
}
