// Lightweight whatsapp-web.js service living side-by-side with Baileys
// Keeps state isolated under privated/wwebjs-sessions to avoid conflicts.
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import pkg from 'whatsapp-web.js';
import QRCode from 'qrcode';
import ffmpeg from 'fluent-ffmpeg';

const { Client, LocalAuth, MessageMedia, Contact, Location, Poll, Chat } = pkg;

// Windows fix: prevent Chrome from locking chrome_debug.log by redirecting logs to NUL
if (process.platform === 'win32' && !process.env.CHROME_LOG_FILE) {
  process.env.CHROME_LOG_FILE = 'NUL';
}

// Additional Windows fixes for file locks
if (process.platform === 'win32') {
  process.env.PUPPETEER_CACHE_DIR = path.join(process.cwd(), 'privated', 'puppeteer-cache');
}

// Runtime in-memory registry of clients
const clients = new Map(); // key: sessionId -> { client, status }

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const baseAuthDir = path.join(process.cwd(), 'privated', 'wwebjs-sessions');
ensureDir(baseAuthDir);

const listWwebjsSessions = () => Array.from(clients.keys());

const cleanupWwebjsSession = async (sessionId) => {
  try {
    console.log(`🧹 Limpando sessão WWebJS órfã: ${sessionId}`);
    
    // Remover da registry se existir
    if (clients.has(sessionId)) {
      const entry = clients.get(sessionId);
      if (entry?.client) {
        try {
          await entry.client.destroy();
        } catch (e) {
          console.warn(`Erro ao destruir cliente órfão:`, e?.message);
        }
      }
      clients.delete(sessionId);
    }
    
    // Tentar limpar arquivos de sessão órfãos
    const sessionDir = path.join(baseAuthDir, `session-${sessionId}`);
    if (fs.existsSync(sessionDir)) {
      try {
        // No Windows, tentar remover após um delay
        setTimeout(() => {
          try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            console.log(`🗑️ Diretório de sessão órfão removido: ${sessionDir}`);
          } catch (e) {
            console.warn(`⚠️ Não foi possível remover diretório órfão:`, e?.message);
          }
        }, 1000);
      } catch (e) {
        console.warn(`⚠️ Erro ao agendar limpeza do diretório:`, e?.message);
      }
    }
    
    console.log(`✅ Limpeza da sessão ${sessionId} concluída`);
  } catch (e) {
    console.error(`❌ Erro na limpeza da sessão ${sessionId}:`, e?.message);
  }
};

const getWwebjsSession = (sessionId) => clients.get(sessionId)?.client || null;

// Função para verificar se uma sessão existe em disco
const hasWwebjsSessionOnDisk = (sessionId) => {
  try {
    const sessionDir = path.join(baseAuthDir, `session-${sessionId}`);
    return fs.existsSync(sessionDir);
  } catch (e) {
    return false;
  }
};

// Função para listar todas as sessões que existem em disco
const listSessionsOnDisk = () => {
  try {
    if (!fs.existsSync(baseAuthDir)) {
      return [];
    }
    
    const dirs = fs.readdirSync(baseAuthDir);
    const sessionDirs = dirs.filter(dir => dir.startsWith('session-'));
    const sessions = sessionDirs.map(dir => dir.replace('session-', ''));
    
    console.log(`📁 Sessões WWebJS em disco: ${sessions.join(', ') || 'nenhuma'}`);
    return sessions;
  } catch (e) {
    console.error('Erro ao listar sessões em disco:', e.message);
    return [];
  }
};

// Função para listar todas as sessões (ativas + em disco)
const listAllWwebjsSessions = () => {
  const activeSessions = Array.from(clients.keys());
  const diskSessions = [];
  
  try {
    if (fs.existsSync(baseAuthDir)) {
      const entries = fs.readdirSync(baseAuthDir);
      for (const entry of entries) {
        if (entry.startsWith('session-')) {
          const sessionId = entry.replace('session-', '');
          if (!activeSessions.includes(sessionId)) {
            diskSessions.push(sessionId);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao listar sessões em disco:', e.message);
  }
  
  return { activeSessions, diskSessions, all: [...activeSessions, ...diskSessions] };
};

// Função para tentar reconectar uma sessão existente em disco
const reconnectWwebjsSession = async (sessionId) => {
  try {
    if (!hasWwebjsSessionOnDisk(sessionId)) {
      return null;
    }
    
    console.log(`🔄 Tentando reconectar sessão WWebJS existente: ${sessionId}`);
    
    // Usar a função createWwebjsSession para reconectar
    await createWwebjsSession(sessionId, {
      onReady: (client) => {
        console.log(`✅ Sessão WWebJS ${sessionId} reconectada com sucesso`);
      },
      onQR: (qr) => {
        console.log(`📱 QR gerado para reconexão da sessão ${sessionId}`);
      }
    });
    
    return getWwebjsSession(sessionId);
  } catch (e) {
    console.error(`❌ Erro ao reconectar sessão ${sessionId}:`, e.message);
    return null;
  }
};

export async function createWwebjsSession(sessionId, {
  onQR,
  onReady,
  onMessage
} = {}) {
  if (!sessionId) throw new Error('sessionId is required');
  
  // Se já existe uma sessão, destruir primeiro
  if (clients.has(sessionId)) {
    console.log(`⚠️ Sessão ${sessionId} já existe, removendo antes de criar nova...`);
    try {
      const existing = clients.get(sessionId);
      if (existing?.client) {
        await existing.client.destroy();
      }
    } catch (e) {
      console.warn(`Erro ao remover sessão existente:`, e?.message);
    }
    clients.delete(sessionId);
  }

  const authStrategy = new LocalAuth({
    clientId: sessionId,
    dataPath: baseAuthDir,
    // Evita tentar remover arquivos do perfil do Chrome no logout (EBUSY no Windows)
    deleteDataOnLogout: false
  });

  // Windows hardening: guard LocalAuth.logout against EBUSY (file locks on Chrome profile files)
  try {
    const origLogout = authStrategy.logout?.bind(authStrategy);
    if (typeof origLogout === 'function') {
      authStrategy.logout = async (...args) => {
        try {
          return await origLogout(...args);
        } catch (e) {
          const msg = e?.message || String(e || '');
          if (e?.code === 'EBUSY' || /EBUSY|resource busy or locked/i.test(msg)) {
            console.warn('⚠️ LocalAuth.logout: ignorando EBUSY no Windows (arquivo bloqueado):', msg);
            // Best-effort: swallow error to avoid crashing process
            return;
          }
          throw e;
        }
      };
    }
  } catch (patchErr) {
    console.warn('Não foi possível proteger LocalAuth.logout:', patchErr?.message);
  }

  const client = new Client({
    authStrategy,
    puppeteer: {
      headless: true,
      // Args otimizados para estabilidade no Windows
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-logging',
        '--log-level=3',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--no-crash-upload',
        '--disable-crash-reporter',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-background-networking',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-report-upload',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      executablePath: process.env.CHROME_BIN || undefined,
      // Configurações adicionais para estabilidade
      defaultViewport: null,
      ignoreDefaultArgs: ['--disable-extensions'],
      timeout: 60000 // 60 segundos de timeout
    }
  });

  clients.set(sessionId, { client, status: 'initializing' });

  client.on('qr', async (qr) => {
    try {
      console.log(`📱 QR Code recebido para sessão ${sessionId}`);
      const dataUrl = await QRCode.toDataURL(qr);
      onQR && onQR({ qr, dataUrl });
    } catch (e) {
      console.warn(`Erro ao gerar QR dataURL para ${sessionId}:`, e?.message);
      onQR && onQR({ qr });
    }
  });

  client.on('ready', () => {
    const entry = clients.get(sessionId);
    if (entry) entry.status = 'ready';
    console.log(`✅ WWebJS ready for ${sessionId}`);
    
    // Verificar se o client ainda está válido antes de continuar
    if (!client.info) {
      console.warn(`⚠️ Cliente ${sessionId} não possui info válido após ready`);
      return;
    }
    
    try {
      // Disponibiliza presença
      if (typeof client.sendPresenceAvailable === 'function') {
        client.sendPresenceAvailable();
      }
    } catch (e) {
      console.warn('sendPresenceAvailable falhou (wwebjs):', e?.message);
    }
    
    // Disparar callback com o client para acesso a info (ex: número real)
    onReady && onReady(client);
    
    // Sincronizar mensagens não lidas com delay para estabilizar
    // WhatsApp-web.js mantém estado persistente, sincronização é opcional
    if (onMessage) {
      setTimeout(() => {
        // Verificar se o cliente ainda está válido antes da sincronização
        if (client.info && entry?.status === 'ready') {
          syncUnreadMessages(client, async (msg) => {
            try { 
              // Só processar mensagens que não são nossas e são recentes (últimas 2h)
              if (!msg.fromMe && msg.timestamp && (Date.now() - msg.timestamp * 1000) < 2 * 60 * 60 * 1000) {
                await onMessage(msg); 
              }
            } catch (e) { 
              console.error('onMessage (syncUnread) erro:', e); 
            }
          });
        } else {
          console.warn(`⚠️ Cliente ${sessionId} não está mais válido para sincronização`);
        }
      }, 3000); // 3 segundos é suficiente para estabilizar
    }
  });

  client.on('authenticated', () => {
    const entry = clients.get(sessionId);
    if (entry) entry.status = 'authenticated';
  });

  client.on('auth_failure', (msg) => {
    const entry = clients.get(sessionId);
    if (entry) entry.status = 'auth_failure';
    console.error(`WWebJS auth_failure for ${sessionId}:`, msg);
    // Manter na registry para permitir retry manual
  });

  client.on('disconnected', (reason) => {
    const entry = clients.get(sessionId);
    if (entry) entry.status = 'disconnected';
    console.warn(`WWebJS disconnected for ${sessionId}:`, reason);
    
    // WhatsApp-web.js é diferente do Baileys - mantém sessão persistente
    // Só remove da registry se for remoção manual explícita
    // A sessão pode reconectar automaticamente
    if (/LOGOUT/i.test(String(reason || ''))) {
      // Em LOGOUT, não tente limpar arquivos em Windows; deixar diretório para próxima sessão
      console.warn('⚠️ Logout detectado. Em Windows, evitar limpeza de sessão para prevenir EBUSY.');
    }
  });

  client.on('message', async (message) => {
    try {
      onMessage && (await onMessage(message));
    } catch (err) {
      console.error('Error in onMessage callback:', err);
    }
  });

  // Initialize com retry robusto e timeouts
  let initAttempts = 0;
  const maxAttempts = 3;
  
  while (initAttempts < maxAttempts) {
    try {
      initAttempts++;
      console.log(`🔄 Tentativa ${initAttempts}/${maxAttempts} de inicializar sessão ${sessionId}`);
      
      await client.initialize();
      console.log(`✅ Sessão ${sessionId} inicializada com sucesso na tentativa ${initAttempts}`);
      break;
      
    } catch (err) {
      console.error(`❌ Tentativa ${initAttempts} falhou:`, err?.message);
      
      // Se for o último tentativa, relançar o erro
      if (initAttempts >= maxAttempts) {
        clients.delete(sessionId);
        throw new Error(`Falha ao inicializar sessão ${sessionId} após ${maxAttempts} tentativas: ${err?.message}`);
      }
      
      // Aguardar antes da próxima tentativa
      const delay = initAttempts * 2000; // 2s, 4s, 6s...
      console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Tentar destruir o cliente antes de recriar
      try {
        await client.destroy();
      } catch (destroyErr) {
        console.warn(`Erro ao destruir cliente antes de retry:`, destroyErr?.message);
      }
    }
  }
  
  return client;
}

// Sincroniza mensagens não lidas de forma simples e robusta
async function syncUnreadMessages(client, eachMessageCb) {
  try {
    console.log('🔄 Iniciando sincronização simples de mensagens não lidas...');
    
    // Verificar se o cliente ainda está válido
    if (!client || !client.info) {
      console.warn('⚠️ Cliente não está pronto para sincronização');
      return;
    }
    
    const chats = await client.getChats();
    console.log(`📋 Encontrados ${chats.length} chats`);
    
    let processedCount = 0;
    
    // Processar apenas os primeiros 10 chats com mensagens não lidas
    const unreadChats = chats.filter(chat => chat.unreadCount > 0).slice(0, 10);
    
    for (const chat of unreadChats) {
      try {
        console.log(`📥 Chat ${chat.name || chat.id._serialized} tem ${chat.unreadCount} mensagens não lidas`);
        
        // Limitar a 5 mensagens por chat
        const limit = Math.min(chat.unreadCount, 5);
        const unreadMessages = await chat.fetchMessages({ limit });
        
        for (const msg of unreadMessages) {
          try { 
            await eachMessageCb(msg); 
            processedCount++;
          } catch (e) { 
            console.error('syncUnread eachMessage erro:', e?.message);
          }
        }
        
        // Marcar como lido só se processou sem erros
        try { 
          await chat.sendSeen(); 
          console.log(`✅ Chat marcado como lido`);
        } catch (e) { 
          console.warn('Erro ao marcar chat como lido:', e?.message);
        }
      } catch (e) {
        console.warn(`Erro ao processar chat:`, e?.message);
      }
    }
    
    console.log(`✅ Sincronização simples completa: ${processedCount} mensagens processadas`);
  } catch (e) {
    console.warn('syncUnreadMessages falhou:', e?.message);
    // Não relançar o erro - WhatsApp-web.js é resiliente
  }
}

const sendText = async (sessionId, to, text) => {
  const client = getWwebjsSession(sessionId);
  if (!client) throw new Error('Session not found or not initialized');
  
  // Verificar se o cliente está realmente pronto
  try {
    const state = await client.getState();
    if (state !== 'CONNECTED') {
      throw new Error(`WWebJS client is not ready. Current state: ${state}`);
    }
  } catch (e) {
    throw new Error(`WWebJS client is not ready: ${e.message}`);
  }
  
  if (!to || !text) throw new Error('to and text are required');
  return client.sendMessage(normalizeJid(to), text);
};

const sendMedia = async (sessionId, to, { base64, mimetype, filename }) => {
  const client = getWwebjsSession(sessionId);
  if (!client) throw new Error('Session not found or not initialized');
  
  // Verificar se o cliente está realmente pronto
  try {
    const state = await client.getState();
    if (state !== 'CONNECTED') {
      throw new Error(`WWebJS client is not ready. Current state: ${state}`);
    }
  } catch (e) {
    throw new Error(`WWebJS client is not ready: ${e.message}`);
  }
  
  if (!to || !base64 || !mimetype) throw new Error('to, base64 and mimetype are required');
  const media = new MessageMedia(mimetype, stripDataUrl(base64), filename || 'file');
  return client.sendMessage(normalizeJid(to), media);
};

// Convert an arbitrary audio buffer to OGG/Opus optimized for voice notes
async function convertToOggOpusVoice(inputBuffer) {
  const tempDir = path.resolve(process.cwd(), 'uploads', 'temp');
  try { if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true }); } catch {}

  const ts = Date.now();
  const inPath = path.join(tempDir, `in_${ts}.audio`);
  const outPath = path.join(tempDir, `out_${ts}.ogg`);

  await fsPromises.writeFile(inPath, inputBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg(inPath)
      .noVideo() // -vn
      .audioChannels(1) // -ac 1
      .audioFrequency(48000) // -ar 48000
      .audioCodec('libopus') // -c:a libopus
      .audioBitrate('64k') // -b:a 64k
      .format('ogg') // -f ogg
      .outputOptions([
        '-application', 'voip',
        '-avoid_negative_ts', 'make_zero',
        '-map_metadata', '-1'
      ])
      .on('start', (cmd) => {
        console.log(`[WWebJS] FFmpeg voice note cmd: ${cmd}`);
      })
      .on('error', async (err) => {
        console.error('[WWebJS] FFmpeg error (voice):', err.message);
        try { await fsPromises.unlink(inPath); } catch {}
        try { await fsPromises.unlink(outPath); } catch {}
        reject(err);
      })
      .on('end', async () => {
        try {
          const outBuf = await fsPromises.readFile(outPath);
          await fsPromises.unlink(inPath).catch(() => {});
          await fsPromises.unlink(outPath).catch(() => {});
          resolve(outBuf);
        } catch (e) {
          reject(e);
        }
      })
      .save(outPath);
  });
}

// Send voice note (PTT) ensuring OGG/Opus format and voice UI in WhatsApp
async function sendVoiceNote(sessionId, to, buffer, originalMimetype = 'audio/*') {
  const client = getWwebjsSession(sessionId);
  if (!client) throw new Error('Session not found or not initialized');

  // Ensure client is ready
  try {
    const state = await client.getState();
    if (state !== 'CONNECTED') {
      throw new Error(`WWebJS client is not ready. Current state: ${state}`);
    }
  } catch (e) {
    throw new Error(`WWebJS client is not ready: ${e.message}`);
  }

  // Convert to OGG/Opus voice note
  let oggBuffer;
  try {
    oggBuffer = await convertToOggOpusVoice(buffer);
  } catch (e) {
    console.warn('[WWebJS] Voice conversion failed, will send original audio as file:', e.message);
    // Fallback: send original as media (non-voice)
    const b64 = Buffer.isBuffer(buffer) ? buffer.toString('base64') : buffer;
    const media = new MessageMedia(originalMimetype, stripDataUrl(b64), 'audio');
    return client.sendMessage(normalizeJid(to), media);
  }

  const base64 = Buffer.from(oggBuffer).toString('base64');
  const media = new MessageMedia('audio/ogg; codecs=opus', base64, 'ptt.ogg');
  // sendAudioAsVoice triggers voice note UI in recipients
  return client.sendMessage(normalizeJid(to), media, { sendAudioAsVoice: true });
}

// Simple presence update wrapper to mimic Baileys API
async function sendPresenceUpdate(sessionId, to, presenceStatus) {
  const client = getWwebjsSession(sessionId);
  if (!client) throw new Error('Session not found or not initialized');

  // whatsapp-web.js presence controls are chat-scoped
  const chatId = normalizeJid(to);
  try {
    if (presenceStatus === 'composing' || presenceStatus === 'typing') {
      await client.sendPresenceAvailable(); // ensure available
      // No direct typing API, we can send a chat state by sending presence to chat
      if (typeof client.sendPresenceAvailable === 'function') {
        // Best-effort: toggle available then do nothing; WhatsApp-web.js lacks direct typing API
      }
    } else if (presenceStatus === 'recording') {
      // No dedicated recording in wwebjs; treat as composing equivalent
      if (typeof client.sendPresenceAvailable === 'function') {
        await client.sendPresenceAvailable();
      }
    } else if (presenceStatus === 'available' || presenceStatus === 'paused') {
      if (typeof client.sendPresenceAvailable === 'function') {
        await client.sendPresenceAvailable();
      }
    }
  } catch (e) {
    throw new Error(`Falha ao atualizar presença: ${e.message}`);
  }
}

function stripDataUrl(data) {
  const idx = data.indexOf('base64,');
  return idx >= 0 ? data.substring(idx + 'base64,'.length) : data;
}

function normalizeJid(id) {
  if (!id) return id;
  const s = String(id);
  if (s.includes('@')) return s; // already a jid
  // assume whatsapp phone without country code handling here; user should pass full
  return s.endsWith('@s.whatsapp.net') ? s : `${s}@s.whatsapp.net`;
}

const removeWwebjsSession = async (sessionId) => {
  try {
    const entry = clients.get(sessionId);
    if (entry && entry.client) {
      console.log(`🗑️ Removendo sessão WWebJS: ${sessionId}`);
      try {
  // Evitar logout completo para não tentar remover arquivos bloqueados (EBUSY)
  // Apenas destruir a sessão em memória; LocalAuth.deleteDataOnLogout=false evita limpeza agressiva
  await entry.client.destroy();
        console.log(`✅ Cliente ${sessionId} destruído com sucesso`);
      } catch (e) {
        console.warn(`⚠️ Erro ao destruir cliente ${sessionId}:`, e?.message);
      }
    }
    clients.delete(sessionId);
    console.log(`✅ Sessão WWebJS ${sessionId} removida da registry`);
  } catch (e) {
    console.error(`❌ Erro ao remover sessão WWebJS ${sessionId}:`, e?.message);
  }
};

// Graceful shutdown de todas as sessões
const shutdownAllWwebjsSessions = async () => {
  console.log('🛑 Iniciando shutdown graceful de todas as sessões WWebJS...');
  const sessionIds = Array.from(clients.keys());
  
  for (const sessionId of sessionIds) {
    try {
      const entry = clients.get(sessionId);
      if (entry && entry.client) {
        console.log(`🛑 Destruindo cliente WWebJS: ${sessionId}`);
        await entry.client.destroy();
      }
      clients.delete(sessionId);
    } catch (e) {
      console.warn(`Erro no shutdown da sessão ${sessionId}:`, e?.message);
    }
  }
  
  console.log('✅ Shutdown de sessões WWebJS concluído');
};

// ===== ADVANCED MESSAGING FEATURES =====

const sendSticker = async (sessionId, chatId, stickerPath, options = {}) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const media = MessageMedia.fromFilePath(stickerPath);
    const result = await client.sendMessage(chatId, media, { 
      sendMediaAsSticker: true,
      ...options 
    });
    
    console.log(`✅ Sticker sent to ${chatId} via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error sending sticker: ${error.message}`);
    throw error;
  }
};

const sendContact = async (sessionId, chatId, contactId, options = {}) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const contact = await client.getContactById(contactId);
    const result = await client.sendMessage(chatId, contact, options);
    
    console.log(`✅ Contact sent to ${chatId} via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error sending contact: ${error.message}`);
    throw error;
  }
};

const sendLocation = async (sessionId, chatId, latitude, longitude, description = '', options = {}) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const location = new Location(latitude, longitude, description);
    const result = await client.sendMessage(chatId, location, options);
    
    console.log(`✅ Location sent to ${chatId} via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error sending location: ${error.message}`);
    throw error;
  }
};

const sendPoll = async (sessionId, chatId, pollName, pollOptions, options = {}) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const poll = new Poll(pollName, pollOptions, options);
    const result = await client.sendMessage(chatId, poll);
    
    console.log(`✅ Poll sent to ${chatId} via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error sending poll: ${error.message}`);
    throw error;
  }
};

const replyToMessage = async (sessionId, messageId, text, options = {}) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    // Get the message to reply to
    const message = await client.getMessageById(messageId);
    if (!message) throw new Error(`Message ${messageId} not found`);

    const result = await message.reply(text, options);
    
    console.log(`✅ Reply sent to message ${messageId} via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error replying to message: ${error.message}`);
    throw error;
  }
};

const reactToMessage = async (sessionId, messageId, reaction) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const message = await client.getMessageById(messageId);
    if (!message) throw new Error(`Message ${messageId} not found`);

    const result = await message.react(reaction);
    
    console.log(`✅ Reaction ${reaction} sent to message ${messageId} via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error reacting to message: ${error.message}`);
    throw error;
  }
};

const forwardMessage = async (sessionId, messageId, chatId, options = {}) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const message = await client.getMessageById(messageId);
    if (!message) throw new Error(`Message ${messageId} not found`);

    const result = await message.forward(chatId, options);
    
    console.log(`✅ Message forwarded from ${messageId} to ${chatId} via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error forwarding message: ${error.message}`);
    throw error;
  }
};

const deleteMessage = async (sessionId, messageId, everyone = false) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const message = await client.getMessageById(messageId);
    if (!message) throw new Error(`Message ${messageId} not found`);

    const result = await message.delete(everyone);
    
    console.log(`✅ Message ${messageId} deleted via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error deleting message: ${error.message}`);
    throw error;
  }
};

const editMessage = async (sessionId, messageId, newText, options = {}) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const message = await client.getMessageById(messageId);
    if (!message) throw new Error(`Message ${messageId} not found`);

    const result = await message.edit(newText, options);
    
    console.log(`✅ Message ${messageId} edited via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error editing message: ${error.message}`);
    throw error;
  }
};

// ===== MEDIA FEATURES =====

const downloadMedia = async (sessionId, messageId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const message = await client.getMessageById(messageId);
    if (!message) throw new Error(`Message ${messageId} not found`);

    if (!message.hasMedia) {
      throw new Error('Message does not contain media');
    }

    const media = await message.downloadMedia();
    
    console.log(`✅ Media downloaded from message ${messageId} via session ${sessionId}`);
    return media;
  } catch (error) {
    console.error(`❌ Error downloading media: ${error.message}`);
    throw error;
  }
};

const getProfilePicture = async (sessionId, contactId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const contact = await client.getContactById(contactId);
    if (!contact) throw new Error(`Contact ${contactId} not found`);

    const profilePicUrl = await contact.getProfilePicUrl();
    
    console.log(`✅ Profile picture retrieved for ${contactId} via session ${sessionId}`);
    return profilePicUrl;
  } catch (error) {
    console.error(`❌ Error getting profile picture: ${error.message}`);
    throw error;
  }
};

// ===== CONTACT FEATURES =====

const getContactInfo = async (sessionId, contactId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const contact = await client.getContactById(contactId);
    if (!contact) throw new Error(`Contact ${contactId} not found`);

    const contactInfo = {
      id: contact.id,
      name: contact.name,
      pushname: contact.pushname,
      shortName: contact.shortName,
      number: contact.number,
      isMe: contact.isMe,
      isUser: contact.isUser,
      isGroup: contact.isGroup,
      isWAContact: contact.isWAContact,
      isMyContact: contact.isMyContact,
      isBlocked: contact.isBlocked,
      profilePicUrl: await contact.getProfilePicUrl().catch(() => null)
    };
    
    console.log(`✅ Contact info retrieved for ${contactId} via session ${sessionId}`);
    return contactInfo;
  } catch (error) {
    console.error(`❌ Error getting contact info: ${error.message}`);
    throw error;
  }
};

const blockContact = async (sessionId, contactId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const contact = await client.getContactById(contactId);
    if (!contact) throw new Error(`Contact ${contactId} not found`);

    const result = await contact.block();
    
    console.log(`✅ Contact ${contactId} blocked via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error blocking contact: ${error.message}`);
    throw error;
  }
};

const unblockContact = async (sessionId, contactId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const contact = await client.getContactById(contactId);
    if (!contact) throw new Error(`Contact ${contactId} not found`);

    const result = await contact.unblock();
    
    console.log(`✅ Contact ${contactId} unblocked via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error unblocking contact: ${error.message}`);
    throw error;
  }
};

// ===== CHAT FEATURES =====

const muteChat = async (sessionId, chatId, unmuteDate = null) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(chatId);
    if (!chat) throw new Error(`Chat ${chatId} not found`);

    const result = await chat.mute(unmuteDate);
    
    console.log(`✅ Chat ${chatId} muted via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error muting chat: ${error.message}`);
    throw error;
  }
};

const unmuteChat = async (sessionId, chatId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(chatId);
    if (!chat) throw new Error(`Chat ${chatId} not found`);

    const result = await chat.unmute();
    
    console.log(`✅ Chat ${chatId} unmuted via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error unmuting chat: ${error.message}`);
    throw error;
  }
};

const pinChat = async (sessionId, chatId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(chatId);
    if (!chat) throw new Error(`Chat ${chatId} not found`);

    const result = await chat.pin();
    
    console.log(`✅ Chat ${chatId} pinned via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error pinning chat: ${error.message}`);
    throw error;
  }
};

const unpinChat = async (sessionId, chatId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(chatId);
    if (!chat) throw new Error(`Chat ${chatId} not found`);

    const result = await chat.unpin();
    
    console.log(`✅ Chat ${chatId} unpinned via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error unpinning chat: ${error.message}`);
    throw error;
  }
};

const archiveChat = async (sessionId, chatId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(chatId);
    if (!chat) throw new Error(`Chat ${chatId} not found`);

    const result = await chat.archive();
    
    console.log(`✅ Chat ${chatId} archived via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error archiving chat: ${error.message}`);
    throw error;
  }
};

const unarchiveChat = async (sessionId, chatId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(chatId);
    if (!chat) throw new Error(`Chat ${chatId} not found`);

    const result = await chat.unarchive();
    
    console.log(`✅ Chat ${chatId} unarchived via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error unarchiving chat: ${error.message}`);
    throw error;
  }
};

const markChatUnread = async (sessionId, chatId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(chatId);
    if (!chat) throw new Error(`Chat ${chatId} not found`);

    const result = await chat.markUnread();
    
    console.log(`✅ Chat ${chatId} marked as unread via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error marking chat as unread: ${error.message}`);
    throw error;
  }
};

const clearChat = async (sessionId, chatId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(chatId);
    if (!chat) throw new Error(`Chat ${chatId} not found`);

    const result = await chat.clearMessages();
    
    console.log(`✅ Chat ${chatId} cleared via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error clearing chat: ${error.message}`);
    throw error;
  }
};

const deleteChat = async (sessionId, chatId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(chatId);
    if (!chat) throw new Error(`Chat ${chatId} not found`);

    const result = await chat.delete();
    
    console.log(`✅ Chat ${chatId} deleted via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error deleting chat: ${error.message}`);
    throw error;
  }
};

// ===== GROUP FEATURES =====

const createGroup = async (sessionId, groupName, participants) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const result = await client.createGroup(groupName, participants);
    
    console.log(`✅ Group ${groupName} created via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error creating group: ${error.message}`);
    throw error;
  }
};

const getGroupInfo = async (sessionId, groupId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(groupId);
    if (!chat) throw new Error(`Group ${groupId} not found`);
    if (!chat.isGroup) throw new Error(`Chat ${groupId} is not a group`);

    const groupInfo = {
      id: chat.id,
      name: chat.name,
      description: chat.description,
      participants: chat.participants,
      owner: chat.owner,
      createdAt: chat.createdAt,
      isGroup: chat.isGroup,
      groupMetadata: chat.groupMetadata
    };
    
    console.log(`✅ Group info retrieved for ${groupId} via session ${sessionId}`);
    return groupInfo;
  } catch (error) {
    console.error(`❌ Error getting group info: ${error.message}`);
    throw error;
  }
};

const updateGroupSubject = async (sessionId, groupId, subject) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(groupId);
    if (!chat) throw new Error(`Group ${groupId} not found`);
    if (!chat.isGroup) throw new Error(`Chat ${groupId} is not a group`);

    const result = await chat.setSubject(subject);
    
    console.log(`✅ Group ${groupId} subject updated via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error updating group subject: ${error.message}`);
    throw error;
  }
};

const updateGroupDescription = async (sessionId, groupId, description) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(groupId);
    if (!chat) throw new Error(`Group ${groupId} not found`);
    if (!chat.isGroup) throw new Error(`Chat ${groupId} is not a group`);

    const result = await chat.setDescription(description);
    
    console.log(`✅ Group ${groupId} description updated via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error updating group description: ${error.message}`);
    throw error;
  }
};

const updateGroupSettings = async (sessionId, groupId, settings) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(groupId);
    if (!chat) throw new Error(`Group ${groupId} not found`);
    if (!chat.isGroup) throw new Error(`Chat ${groupId} is not a group`);

    // Settings can include: messagesAdminsOnly, editAdminsOnly, etc.
    const results = {};
    
    if (settings.messagesAdminsOnly !== undefined) {
      results.messagesAdminsOnly = await chat.setMessagesAdminsOnly(settings.messagesAdminsOnly);
    }
    
    if (settings.infoAdminsOnly !== undefined) {
      results.infoAdminsOnly = await chat.setInfoAdminsOnly(settings.infoAdminsOnly);
    }
    
    console.log(`✅ Group ${groupId} settings updated via session ${sessionId}`);
    return results;
  } catch (error) {
    console.error(`❌ Error updating group settings: ${error.message}`);
    throw error;
  }
};

const addGroupParticipants = async (sessionId, groupId, participants) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(groupId);
    if (!chat) throw new Error(`Group ${groupId} not found`);
    if (!chat.isGroup) throw new Error(`Chat ${groupId} is not a group`);

    const result = await chat.addParticipants(participants);
    
    console.log(`✅ Participants added to group ${groupId} via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error adding group participants: ${error.message}`);
    throw error;
  }
};

const removeGroupParticipants = async (sessionId, groupId, participants) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(groupId);
    if (!chat) throw new Error(`Group ${groupId} not found`);
    if (!chat.isGroup) throw new Error(`Chat ${groupId} is not a group`);

    const result = await chat.removeParticipants(participants);
    
    console.log(`✅ Participants removed from group ${groupId} via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error removing group participants: ${error.message}`);
    throw error;
  }
};

const promoteGroupParticipants = async (sessionId, groupId, participants) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(groupId);
    if (!chat) throw new Error(`Group ${groupId} not found`);
    if (!chat.isGroup) throw new Error(`Chat ${groupId} is not a group`);

    const result = await chat.promoteParticipants(participants);
    
    console.log(`✅ Participants promoted in group ${groupId} via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error promoting group participants: ${error.message}`);
    throw error;
  }
};

const demoteGroupParticipants = async (sessionId, groupId, participants) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(groupId);
    if (!chat) throw new Error(`Group ${groupId} not found`);
    if (!chat.isGroup) throw new Error(`Chat ${groupId} is not a group`);

    const result = await chat.demoteParticipants(participants);
    
    console.log(`✅ Participants demoted in group ${groupId} via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error demoting group participants: ${error.message}`);
    throw error;
  }
};

const getGroupInviteLink = async (sessionId, groupId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(groupId);
    if (!chat) throw new Error(`Group ${groupId} not found`);
    if (!chat.isGroup) throw new Error(`Chat ${groupId} is not a group`);

    const inviteCode = await chat.getInviteCode();
    const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
    
    console.log(`✅ Group invite link retrieved for ${groupId} via session ${sessionId}`);
    return { inviteCode, inviteLink };
  } catch (error) {
    console.error(`❌ Error getting group invite link: ${error.message}`);
    throw error;
  }
};

const revokeGroupInviteLink = async (sessionId, groupId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(groupId);
    if (!chat) throw new Error(`Group ${groupId} not found`);
    if (!chat.isGroup) throw new Error(`Chat ${groupId} is not a group`);

    const newInviteCode = await chat.revokeInvite();
    const newInviteLink = `https://chat.whatsapp.com/${newInviteCode}`;
    
    console.log(`✅ Group invite link revoked for ${groupId} via session ${sessionId}`);
    return { inviteCode: newInviteCode, inviteLink: newInviteLink };
  } catch (error) {
    console.error(`❌ Error revoking group invite link: ${error.message}`);
    throw error;
  }
};

const joinGroupViaLink = async (sessionId, inviteCode) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const result = await client.acceptInvite(inviteCode);
    
    console.log(`✅ Joined group via invite link using session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error joining group via link: ${error.message}`);
    throw error;
  }
};

const leaveGroup = async (sessionId, groupId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const chat = await client.getChatById(groupId);
    if (!chat) throw new Error(`Group ${groupId} not found`);
    if (!chat.isGroup) throw new Error(`Chat ${groupId} is not a group`);

    const result = await chat.leave();
    
    console.log(`✅ Left group ${groupId} via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error leaving group: ${error.message}`);
    throw error;
  }
};

// ===== STATUS FEATURES =====

const setUserStatus = async (sessionId, status) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const result = await client.setStatus(status);
    
    console.log(`✅ User status updated via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error setting user status: ${error.message}`);
    throw error;
  }
};

const getUserStatus = async (sessionId, contactId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    const contact = await client.getContactById(contactId);
    if (!contact) throw new Error(`Contact ${contactId} not found`);

    const status = await contact.getAbout();
    
    console.log(`✅ User status retrieved for ${contactId} via session ${sessionId}`);
    return status;
  } catch (error) {
    console.error(`❌ Error getting user status: ${error.message}`);
    throw error;
  }
};

// ===== CHANNEL FEATURES =====

const getChannels = async (sessionId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    // Note: Channel features may not be available in all versions
    const chats = await client.getChats();
    const channels = chats.filter(chat => chat.isNewsletter);
    
    console.log(`✅ Channels retrieved via session ${sessionId}`);
    return channels;
  } catch (error) {
    console.error(`❌ Error getting channels: ${error.message}`);
    throw error;
  }
};

const followChannel = async (sessionId, channelId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    // Note: This may require specific WhatsApp-web.js version with channel support
    const result = await client.followNewsletter(channelId);
    
    console.log(`✅ Channel ${channelId} followed via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error following channel: ${error.message}`);
    throw error;
  }
};

const unfollowChannel = async (sessionId, channelId) => {
  try {
    const client = getWwebjsSession(sessionId);
    if (!client) throw new Error(`Session ${sessionId} not found`);

    // Note: This may require specific WhatsApp-web.js version with channel support
    const result = await client.unfollowNewsletter(channelId);
    
    console.log(`✅ Channel ${channelId} unfollowed via session ${sessionId}`);
    return result;
  } catch (error) {
    console.error(`❌ Error unfollowing channel: ${error.message}`);
    throw error;
  }
};

// ===== EXPORTS =====
export default {
  createWwebjsSession,
  getWwebjsSession,
  listWwebjsSessions,
  listAllWwebjsSessions,
  hasWwebjsSessionOnDisk,
  reconnectWwebjsSession,
  removeWwebjsSession,
  cleanupWwebjsSession,
  shutdownAllWwebjsSessions,
  sendText,
  sendMedia,
  sendVoiceNote,
  sendPresenceUpdate,
  // Advanced messaging features
  sendSticker,
  sendContact,
  sendLocation,
  sendPoll,
  replyToMessage,
  reactToMessage,
  forwardMessage,
  deleteMessage,
  editMessage,
  // Media features
  downloadMedia,
  getProfilePicture,
  // Contact features
  getContactInfo,
  blockContact,
  unblockContact,
  // Chat features
  muteChat,
  unmuteChat,
  pinChat,
  unpinChat,
  archiveChat,
  unarchiveChat,
  markChatUnread,
  clearChat,
  deleteChat,
  // Group features
  createGroup,
  getGroupInfo,
  updateGroupSubject,
  updateGroupDescription,
  updateGroupSettings,
  addGroupParticipants,
  removeGroupParticipants,
  promoteGroupParticipants,
  demoteGroupParticipants,
  getGroupInviteLink,
  revokeGroupInviteLink,
  joinGroupViaLink,
  leaveGroup,
  // Status features
  setUserStatus,
  getUserStatus,
  // Channel features (if available)
  getChannels,
  followChannel,
  unfollowChannel
};
