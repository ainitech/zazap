import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Session, Ticket, TicketMessage, Contact } from '../models/index.js';
import { emitToTicket, emitToAll } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sanitiza o ID para um nome de pasta compatível com Windows/macOS/Linux
const sanitizeForFs = (name) => String(name).replace(/[^a-zA-Z0-9._-]/g, '_');

// Centraliza os arquivos de autenticação do Baileys em uma pasta única (configurável por env)
const getAuthRoot = () => {
  return process.env.BAILEYS_AUTH_ROOT
    ? path.resolve(process.cwd(), process.env.BAILEYS_AUTH_ROOT)
    : path.resolve(process.cwd(), 'privated', 'baileys');
};

const getAuthDir = (sessionId) => {
  // Normalizar sessionId - sempre usar apenas o número base sem device ID
  const baseNumber = sessionId.split(':')[0]; // Remove o :XX se existir
  const sanitized = sanitizeForFs(baseNumber);
  return path.resolve(getAuthRoot(), sanitized);
};

// Função auxiliar para encontrar sessão por ID normalizado
const findSessionIndex = (sessionId) => {
  const baseNumber = sessionId.split(':')[0];
  return sessions.findIndex(s => {
    const sBaseNumber = s.sessionId.split(':')[0];
    return sBaseNumber === baseNumber;
  });
};

// Função para limpar e recriar pasta de autenticação (async, usando fs/promises)
const cleanAndRecreateAuthDir = async (sessionId) => {
  const authDir = getAuthDir(sessionId);
  try {
    // Remover (force=true ignora inexistente)
    await fs.rm(authDir, { recursive: true, force: true });
    console.log(`🧹 Pasta de auth removida (se existia): ${authDir}`);
    await fs.mkdir(authDir, { recursive: true });
    console.log(`📁 Pasta de auth recriada: ${authDir}`);
  } catch (error) {
    console.error(`❌ Erro ao limpar/recriar pasta de auth:`, error);
  }
};

// Interface para sessões
class BaileysSession {
  constructor(socket, sessionId) {
    this.socket = socket;
    this.sessionId = sessionId;
    this.status = 'connecting';
  this.reconnectAttempts = 0;
  this.reconnectTimer = null;
  }
}

// Armazenar sessões ativas
const sessions = [];
// Map para rastrear tentativas de reconexão por número base (sessionId normalizado)
const reconnectAttemptsMap = new Map();

// Função para criar ou atualizar contato no Baileys
// IMPORTANTE: Não sobrescrever name/pushname existentes com valores nulos ou vazios
const createOrUpdateContactBaileys = async (whatsappId, sessionId, sock) => {
  try {
    console.log(`👤 Criando/atualizando contato Baileys: ${whatsappId} na sessão: ${sessionId}`);
    
    // Buscar contato existente
    let contact = await Contact.findOne({
      where: {
        whatsappId: whatsappId,
        sessionId: sessionId
      }
    });
    
    // Obter informações do contato do WhatsApp
    let contactInfo = null;
    let profilePicUrl = null;
    
    try {
      // No Baileys, usamos onWhatsApp para verificar se é um contato válido
      const [contactExists] = await sock.onWhatsApp(whatsappId);
      
      // Tentar obter foto do perfil
      try {
        profilePicUrl = await sock.profilePictureUrl(whatsappId, 'image');
      } catch (picError) {
        console.log(`⚠️ Não foi possível obter foto do perfil para ${whatsappId}:`, picError.message);
      }
      
      contactInfo = contactExists;
    } catch (infoError) {
      console.log(`⚠️ Não foi possível obter informações do contato ${whatsappId}:`, infoError.message);
    }
    
    // Extrair número limpo do JID
    const phoneNumber = whatsappId.split('@')[0];
    
    const contactData = {
      whatsappId,
      sessionId,
      // Só definir name/pushname se houver valor novo; caso contrário preservamos existente
      ...(contactInfo?.notify ? { name: contactInfo.notify } : {}),
      ...(contactInfo?.notify ? { pushname: contactInfo.notify } : {}),
      formattedNumber: phoneNumber || null,
      profilePicUrl: profilePicUrl || null,
      isBlocked: false,
      isGroup: whatsappId.includes('@g.us'),
      isWAContact: contactInfo?.exists !== false, // default true
      lastSeen: new Date()
    };
    
    if (contact) {
      // Garantir que não apagaremos name/pushname existentes
      const updatePayload = { ...contactData };
      if (!('name' in updatePayload)) updatePayload.name = contact.name; // preserva
      if (!('pushname' in updatePayload)) updatePayload.pushname = contact.pushname; // preserva

      await contact.update(updatePayload);
      console.log(`✅ Contato Baileys atualizado: ${(updatePayload.name || updatePayload.pushname || updatePayload.whatsappId)}`);
      
      // Emitir evento de contato atualizado
      emitToAll('contact-updated', contact);
    } else {
      // Criar novo contato
      contact = await Contact.create(contactData);
      console.log(`🆕 Novo contato Baileys criado: ${contactData.name || contactData.whatsappId}`);
      
      // Emitir evento de novo contato
      emitToAll('contact-updated', contact);
    }
    
    return contact;
  } catch (error) {
    console.error(`❌ Erro ao criar/atualizar contato Baileys ${whatsappId}:`, error);
    return null;
  }
};

/**
 * Criar uma nova sessão Baileys
 */
export const createBaileysSession = async (sessionId, onQR, onReady, onMessage) => {
  try {
    console.log(`Criando sessão Baileys: ${sessionId}`);

    // Verificar se já existe uma sessão
    const existingSessionIndex = findSessionIndex(sessionId);
    if (existingSessionIndex !== -1) {
      console.log(`Removendo sessão existente: ${sessions[existingSessionIndex].sessionId} (busca: ${sessionId})`);
      if (sessions[existingSessionIndex].socket) {
        await sessions[existingSessionIndex].socket.end();
      }
      sessions.splice(existingSessionIndex, 1);
    }

    // Garantir diretórios de autenticação será feito logo abaixo junto com authRoot/authDir
    // (removido check duplicado para evitar redeclaração de variável)
    
    // Garantir que diretórios existam
    const authRoot = getAuthRoot();
    await fs.mkdir(authRoot, { recursive: true });
    const authDir = getAuthDir(sessionId);
    await fs.mkdir(authDir, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    // Obter versão mais recente do Baileys
    const { version } = await fetchLatestBaileysVersion();
    console.log(`📱 Versão do Baileys: ${version}`);
    console.log(`🔌 makeWASocket disponível: ${typeof makeWASocket}`);

    // Criar socket
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: 90_000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 30_000,
      emitOwnEvents: true,
      fireInitQueries: false,
      browser: ['ZaZap', 'Desktop', '1.0.0'],
      retryRequestDelayMs: 250,
      maxMsgRetryCount: 5,
      // Adicionar configurações para melhor reconexão
      qrTimeout: 60_000, // 60 segundos para QR
      getMessage: async () => null, // Evitar erros de mensagem não encontrada
      appStateMacVerification: {
        patch: false,
        snapshot: false
      }
    });

  // Criar instância da sessão (preservar tentativas de reconexão se existirem)
  const baseNumber = sessionId.split(':')[0];
  const previousAttempts = reconnectAttemptsMap.get(baseNumber) || 0;
  const session = new BaileysSession(sock, sessionId);
  session.reconnectAttempts = previousAttempts; // manter histórico para backoff
  sessions.push(session);

    // LOG DO SOCKET CRIADO PARA ANÁLISE
    // Logs detalhados do socket (reduzidos para evitar ruído em produção)
    if (sock.authState) {
      console.log(`sock.authState existe:`, !!sock.authState);
    }

    // Evento para salvar credenciais
    sock.ev.on('creds.update', saveCreds);
    
    // Evento de atualização de conexão
  const scheduleReconnect = async (sessionId, onQR, onReady, onMessage, reasonCode) => {
      try {
        const existingIndex = findSessionIndex(sessionId);
        if (existingIndex === -1) {
          console.log(`⚠️ Não foi possível agendar reconexão: sessão ${sessionId} não encontrada`);
          return;
        }
        const s = sessions[existingIndex];
        if (s.reconnectTimer) {
          clearTimeout(s.reconnectTimer);
          s.reconnectTimer = null;
        }

        // Para erro 515 (Stream Error), NÃO limpar auth na primeira tentativa
        // Só limpar se já tentamos reconectar antes
        if (reasonCode === 515 && s.reconnectAttempts >= 2) {
          console.log(`🔧 Código 515 detectado após ${s.reconnectAttempts} tentativas - limpando autenticação`);
          try {
            // Fechar socket existente
            if (s.socket && typeof s.socket.end === 'function') {
              await s.socket.end();
            }
            // Limpar pasta de auth apenas após múltiplas falhas
            await cleanAndRecreateAuthDir(sessionId);
            // Resetar tentativas após limpar auth
            s.reconnectAttempts = 0;
            reconnectAttemptsMap.set(sessionId.split(':')[0], 0);
          } catch (cleanupError) {
            console.error(`⚠️ Erro ao limpar antes de reconectar (515):`, cleanupError);
          }
        } else if (reasonCode === 515) {
          console.log(`🔧 Código 515 detectado - tentativa #${s.reconnectAttempts + 1} - mantendo autenticação`);
          try {
            // Apenas fechar socket, sem limpar auth
            if (s.socket && typeof s.socket.end === 'function') {
              await s.socket.end();
            }
          } catch (closeError) {
            console.error(`⚠️ Erro ao fechar socket:`, closeError);
          }
        }

        // Incrementar tentativas e calcular delay exponencial
  s.reconnectAttempts += 1;
  reconnectAttemptsMap.set(sessionId.split(':')[0], s.reconnectAttempts);
        const base = reasonCode === 515 ? 3000 : 5000; // Delay um pouco maior para 515
        const maxDelay = 60000; // 60s
        const delay = Math.min(base * Math.pow(2, Math.min(s.reconnectAttempts - 1, 3)), maxDelay);
        const maxAttempts = reasonCode === 515 ? 5 : 8; // Mais tentativas para erro 515

        // Emitir status de reconexão
        try {
          const { emitToAll } = await import('./socket.js');
          const sessionRecord = await Session.findOne({ where: { whatsappId: sessionId } });
          if (sessionRecord) {
            emitToAll('session-status-update', {
              sessionId: sessionRecord.id,
              status: 'reconnecting',
              attempt: s.reconnectAttempts,
              nextDelayMs: delay,
              reasonCode
            });
          }
        } catch (e) {
          console.log('⚠️ Falha ao emitir status reconnecting:', e.message);
        }

        if (s.reconnectAttempts > maxAttempts) {
          console.log(`❌ Máximo de tentativas de reconexão atingido para ${sessionId}`);
            s.status = 'failed';
          try {
            const { emitToAll } = await import('./socket.js');
            const sessionRecord = await Session.findOne({ where: { whatsappId: sessionId } });
            if (sessionRecord) {
              emitToAll('session-status-update', {
                sessionId: sessionRecord.id,
                status: 'failed',
                attempts: s.reconnectAttempts,
                reasonCode
              });
            }
          } catch (_) {}
          return;
        }

        console.log(`🔄 Agendando reconexão (#${s.reconnectAttempts}) para sessão ${sessionId} em ${(delay/1000).toFixed(1)}s (código: ${reasonCode})`);
        s.reconnectTimer = setTimeout(async () => {
          s.reconnectTimer = null;
          try {
            // Remover sessão antiga antes de criar nova
            const oldIndex = findSessionIndex(sessionId);
            if (oldIndex !== -1) {
              sessions.splice(oldIndex, 1);
            }
            await createBaileysSession(sessionId, onQR, onReady, onMessage);
          } catch (reErr) {
            console.error(`❌ Erro ao tentar reconectar sessão ${sessionId}:`, reErr);
            // Se falhar, agendar outra tentativa
            const newIndex = findSessionIndex(sessionId);
            if (newIndex === -1) {
              // Recriar objeto de sessão para continuar tentando
              const tempSession = new BaileysSession(null, sessionId);
              tempSession.reconnectAttempts = s.reconnectAttempts;
              sessions.push(tempSession);
            }
            scheduleReconnect(sessionId, onQR, onReady, onMessage, reasonCode);
          }
        }, delay);
      } catch (err) {
        console.error('Erro no scheduleReconnect:', err);
      }
    };

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr && onQR) {
        try {
          console.log(`QR Code gerado para sessão Baileys ${sessionId}`);
          let qrCodeDataURL;
          try {
            // Tentar gerar com menor nível de correção para caber mais dados
            qrCodeDataURL = await qrcode.toDataURL(qr, { errorCorrectionLevel: 'L', margin: 1, scale: 4 });
          } catch (genErr) {
            console.warn('⚠️ Falha ao gerar imagem QR (tamanho grande). Enviando fallback RAW codificado em base64:', genErr.message);
            // Fallback: enviar string RAW base64 para o frontend converter
            qrCodeDataURL = `RAW:${Buffer.from(qr, 'utf-8').toString('base64')}`;
          }
          session.status = 'qr';
          onQR(qrCodeDataURL);
          
          // Emitir via WebSocket
          try {
            const { emitToAll } = await import('./socket.js');
            // Buscar sessão no banco para obter o ID
            const sessionRecord = await Session.findOne({ where: { whatsappId: sessionId } });
            if (sessionRecord) {
              emitToAll("session-qr-update", {
                sessionId: sessionRecord.id,
                qrCode: qrCodeDataURL,
                status: 'qr_ready'
              });
              console.log('✅ QR Code Baileys emitido via WebSocket');
            }
          } catch (socketError) {
            console.log('Socket não disponível para emitir QR Baileys');
          }
        } catch (error) {
          console.error('Erro ao gerar QR Code:', error);
        }
      }
      
      if (connection === 'open') {
        console.log(`🟢 Sessão Baileys ${sessionId} conectada e pronta`);
        session.status = 'connected';
        // Resetar tentativas de reconexão
        const baseNumber = sessionId.split(':')[0];
        reconnectAttemptsMap.set(baseNumber, 0);
        session.reconnectAttempts = 0;
        if (session.reconnectTimer) {
          clearTimeout(session.reconnectTimer);
          session.reconnectTimer = null;
        }

        // Capturar número real da conta sem sobrescrever o identificador customizado fornecido pelo usuário
        if (sock.user && sock.user.id) {
          const actualWhatsAppId = sock.user.id.split('@')[0];
          console.log(`📱 Número real detectado para sessão ${sessionId}: ${actualWhatsAppId} (preservando ID customizado)`);
          try {
            // Buscar por whatsappId (ID customizado) ou fallback por realNumber existente
            const sessionRecord = await Session.findOne({ where: { whatsappId: sessionId } });
            if (sessionRecord) {
              await sessionRecord.update({
                status: 'CONNECTED',
                realNumber: actualWhatsAppId
              });
              console.log(`🔒 whatsappId preservado (${sessionRecord.whatsappId}), realNumber armazenado (${actualWhatsAppId})`);
            }
          } catch (updateError) {
            console.error('❌ Erro ao salvar realNumber da sessão:', updateError);
          }
        }
        
        // Emitir via WebSocket
        try {
          const { emitToAll } = await import('./socket.js');
          const sessionRecord = await Session.findOne({ where: { whatsappId: sessionId } });
          if (sessionRecord) {
            emitToAll("session-status-update", {
              sessionId: sessionRecord.id,
              status: 'connected'
            });
            emitToAll("session-qr-update", {
              sessionId: sessionRecord.id,
              qrCode: '',
              status: 'connected'
            });
            console.log('✅ Status conectado Baileys emitido via WebSocket');
          }
        } catch (socketError) {
          console.log('Socket não disponível para Baileys');
        }
        
        if (onReady) onReady(sock);
      }
      
      if (connection === 'close') {
        const rawError = lastDisconnect?.error;
        const statusCode = rawError?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isStreamError = statusCode === 515; // Stream error específico
        const isBadSession = statusCode === 401; // Unauthorized/bad session
        const shouldReconnect = (rawError instanceof Boom && !isLoggedOut && !isBadSession) || isStreamError;

        console.log(`🔴 Sessão Baileys ${sessionId} fechada (statusCode=${statusCode}) shouldReconnect=${shouldReconnect}`);
        
        // Log adicional para erro 515
        if (isStreamError) {
          console.log(`⚠️ Erro de stream detectado (515) - reconexão será tentada mantendo autenticação`);
        }
        
        if (isBadSession) {
          console.log(`⚠️ Sessão inválida (401) - limpando autenticação`);
          await cleanAndRecreateAuthDir(sessionId);
        }

        session.status = 'disconnected';

        // Emitir status de desconexão
        try {
          const { emitToAll } = await import('./socket.js');
          const sessionRecord = await Session.findOne({ where: { whatsappId: sessionId } });
          if (sessionRecord) {
            emitToAll('session-status-update', {
              sessionId: sessionRecord.id,
              status: 'disconnected',
              code: statusCode
            });
          }
        } catch (e) {}

        // Se não deve reconectar (logout), limpar completamente
        if (!shouldReconnect) {
          console.log(`ℹ️ Não haverá reconexão para sessão ${sessionId} (logout ou erro irreversível)`);
          await cleanupBaileysSession(sessionId);
          return;
        }

        // Agendar reconexão com backoff
        scheduleReconnect(sessionId, onQR, onReady, onMessage, statusCode);
      }
      
      if (connection === 'connecting') {
        console.log(`🔄 Sessão Baileys ${sessionId} conectando...`);
        session.status = 'connecting';
      }
    });
    
    // Evento de mensagens
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type === 'notify' && messages && messages.length > 0) {
        for (const msg of messages) {
          if (!msg.key.fromMe && !msg.key.remoteJid.includes('@broadcast')) {
            console.log(`📨 Mensagem recebida via Baileys:`, msg);
            // Usar apenas o callback onMessage que já está configurado corretamente
            if (onMessage) {
              console.log(`🔄 Chamando callback onMessage para sessão ${sessionId}`);
              await onMessage(msg); // Remover o segundo parâmetro
            } else {
              console.log(`⚠️ Callback onMessage não definido para sessão ${sessionId}`);
            }
          }
        }
      }
    });

    // Evento de presença
    sock.ev.on('presence.update', ({ id, presences }) => {
      console.log(`Presença atualizada para ${id}:`, presences);
    });

    // Adicionar handler de erro global para o socket
    sock.ev.on('error', (error) => {
      console.error(`❌ Erro no socket Baileys ${sessionId}:`, error);
      // Se for erro crítico, forçar reconexão
      if (error.message?.includes('Stream Errored')) {
        console.log(`🔧 Erro de stream detectado - forçando reconexão`);
        sock.end();
      }
    });

    return sock;

  } catch (error) {
    console.error(`Erro ao criar sessão Baileys ${sessionId}:`, error);
    
    // Remover da lista em caso de erro
    const sessionIndex = findSessionIndex(sessionId);
    if (sessionIndex !== -1) {
      sessions.splice(sessionIndex, 1);
    }
    
    throw error;
  }
};

/**
 * Obter uma sessão existente
 */
export const getBaileysSession = (sessionId) => {
  // Normalizar sessionId para encontrar a sessão correta
  const baseNumber = sessionId.split(':')[0]; // Remove o :XX se existir
  
  // Procurar por uma sessão que tenha o mesmo número base
  const sessionIndex = sessions.findIndex(s => {
    const sBaseNumber = s.sessionId.split(':')[0];
    return sBaseNumber === baseNumber;
  });
  
  if (sessionIndex === -1) {
    console.log(`❌ Sessão Baileys não encontrada para ${sessionId} (base: ${baseNumber})`);
    const available = sessions.map(s => s.sessionId).join(', ');
    console.log(`📋 Sessões disponíveis: ${available || 'nenhuma'}`);
    // Não lançar erro aqui; retornar null permite chamadas 'safe' em verificações
    return null;
  }
  
  console.log(`✅ Sessão Baileys encontrada: ${sessions[sessionIndex].sessionId} para busca ${sessionId}`);
  return sessions[sessionIndex].socket;
};

/**
 * Enviar texto
 */
export const sendText = async (sessionId, to, text) => {
  console.log(`🔍 Buscando sessão Baileys: "${sessionId}"`);
  
  const sock = getBaileysSession(sessionId);
  if (!sock) {
    console.error(`❌ Sessão "${sessionId}" não encontrada no Baileys`);
    throw new Error(`Sessão "${sessionId}" não encontrada no Baileys`);
  }
  
  // Normalizar destino para JID válido
  let jid = to;
  if (typeof jid === 'string' && !jid.includes('@')) {
    // Remover caracteres não numéricos
    const onlyDigits = jid.replace(/[^0-9]/g, '');
    // Adicionar domínio padrão
    jid = `${onlyDigits}@s.whatsapp.net`;
  }
  console.log(`✅ Sessão "${sessionId}" encontrada, enviando mensagem para ${jid} (input original: ${to})...`);
  const result = await sock.sendMessage(jid, { text });
  
  // Após enviar, tentar atualizar informações do contato
  try {
    const session = await Session.findOne({ where: { whatsappId: sessionId } });
    if (session) {
      await createOrUpdateContactBaileys(jid, session.id, sock);

      // Criar ou localizar ticket e salvar mensagem enviada para refletir no frontend
      try {
        const { Ticket, TicketMessage } = await import('../models/index.js');
        let ticket = await Ticket.findOne({ where: { sessionId: session.id, contact: jid } });
        if (!ticket) {
          ticket = await Ticket.create({
            sessionId: session.id,
            contact: jid,
            lastMessage: text,
            unreadCount: 0,
            status: 'open'
          });
        } else {
          await ticket.update({ lastMessage: text, updatedAt: new Date() });
        }

        const saved = await TicketMessage.create({
          ticketId: ticket.id,
          sender: 'user',
          content: text,
          messageId: result?.key?.id || null,
          timestamp: new Date(),
          messageType: 'text'
        });

        // Emitir eventos para atualizar frontend
        try {
          emitToAll('new-message', {
            id: saved.id,
            ticketId: ticket.id,
            sender: 'user',
            content: text,
            timestamp: saved.createdAt,
            messageType: 'text',
            messageId: saved.messageId
          });
          const { emitToTicket } = await import('./socket.js');
          emitToTicket(ticket.id, 'new-message', {
            id: saved.id,
            ticketId: ticket.id,
            sender: 'user',
            content: text,
            timestamp: saved.createdAt,
            messageType: 'text',
            messageId: saved.messageId
          });
        } catch (emitErr) {
          console.log('⚠️ Falha ao emitir evento de mensagem enviada:', emitErr.message);
        }
      } catch (ticketErr) {
        console.log('⚠️ Erro ao registrar mensagem enviada localmente:', ticketErr.message);
      }
    }
  } catch (updateError) {
    console.log(`⚠️ Erro ao atualizar contato após envio: ${updateError.message}`);
  }
  
  return result;
};

/**
 * Gerar waveform artificial para nota de voz
 */
const generateWaveform = (duration = 5) => {
  // Gerar um waveform artificial com variações realistas
  const samples = Math.max(32, Math.floor(duration * 10)); // Mínimo 32 amostras
  const waveform = new Uint8Array(samples);
  
  console.log(`🎵 Gerando waveform para ${duration}s com ${samples} amostras`);
  
  for (let i = 0; i < samples; i++) {
    // Criar padrão de onda com variações mais realistas
    const progress = i / samples;
    
    // Envelope natural (começa baixo, sobe, depois desce)
    let envelope = Math.sin(progress * Math.PI);
    
    // Variação aleatória para parecer fala natural
    const variation = Math.random() * 0.4 + 0.6; // Entre 0.6 e 1.0
    
    // Padrão de fala (algumas pausas e picos)
    const speechPattern = Math.sin(progress * Math.PI * 4) * 0.3 + 0.7;
    
    // Adicionar alguns picos e vales para parecer mais natural
    if (Math.random() < 0.1) {
      envelope *= 1.5; // Picos ocasionais
    } else if (Math.random() < 0.05) {
      envelope *= 0.3; // Vales ocasionais
    }
    
    const amplitude = Math.min(127, Math.max(10, envelope * variation * speechPattern * 100));
    waveform[i] = Math.floor(amplitude);
  }
  
  // Log de amostra para debug
  const sampleValues = Array.from(waveform.slice(0, 10)).join(', ');
  console.log(`🎵 Primeiras 10 amostras do waveform: [${sampleValues}...]`);
  
  return waveform;
};

/**
 * Calcular duração aproximada do áudio baseada no tamanho do arquivo
 */
const estimateAudioDuration = (bufferSize, bitrate = 32000) => {
  // Estimativa aproximada: tamanho do arquivo / bitrate
  const estimatedSeconds = Math.max(1, Math.floor(bufferSize / (bitrate / 8)));
  return Math.min(estimatedSeconds, 60); // Máximo 60 segundos
};

/**
 * Enviar áudio como PTT (Push-to-Talk) - mensagem de voz
 */
export const sendVoiceNote = async (sessionId, to, buffer, mimetype = 'audio/ogg; codecs=opus', duration = null) => {
  const sock = getBaileysSession(sessionId);
  if (!sock) throw new Error('Sessão Baileys não encontrada');

  try {
    console.log('🎵 Enviando PTT via Baileys:', {
      to,
      bufferSize: buffer.length,
      mimetype,
      duration
    });
    
    // Validar buffer
    if (!buffer || buffer.length === 0) {
      throw new Error('Buffer de áudio vazio');
    }
    
    // Calcular duração mais precisa
    let audioDuration = duration;
    if (!audioDuration || audioDuration <= 0) {
      // Estimativa baseada no tamanho do arquivo e taxa de bits
      const avgBitrate = 32000; // 32kbps para opus
      audioDuration = Math.max(1, Math.floor(buffer.length * 8 / avgBitrate));
      audioDuration = Math.min(audioDuration, 300); // Máximo 5 minutos
    }
    
    console.log('🎵 Duração calculada:', audioDuration, 'segundos');
    
    // Gerar waveform mais realista
    const generateRealisticWaveform = (duration) => {
      const sampleCount = Math.min(64, duration * 2); // 2 amostras por segundo, máximo 64
      const waveform = new Uint8Array(sampleCount);
      
      for (let i = 0; i < sampleCount; i++) {
        // Gerar valores mais realistas (0-100)
        const baseLevel = 20 + Math.random() * 40; // 20-60
        const variation = Math.sin(i * 0.5) * 20; // Variação senoidal
        waveform[i] = Math.max(0, Math.min(100, Math.floor(baseLevel + variation)));
      }
      
      return waveform;
    };
    
    const waveform = generateRealisticWaveform(audioDuration);
    
    // Garantir mimetype compatível
    let audioMimetype = mimetype;
    if (!mimetype.includes('opus') && !mimetype.includes('aac')) {
      audioMimetype = 'audio/ogg; codecs=opus';
      console.log('🎵 Convertendo mimetype para:', audioMimetype);
    }
    
    // Mensagem de voz otimizada para WhatsApp
    const voiceMessage = {
      audio: buffer,
      mimetype: audioMimetype,
      ptt: true,              // OBRIGATÓRIO para PTT
      seconds: audioDuration,
      waveform: waveform,
      fileLength: buffer.length
    };
    
    console.log('🎵 Configuração final do PTT:', {
      ptt: voiceMessage.ptt,
      seconds: voiceMessage.seconds,
      waveformLength: voiceMessage.waveform.length,
      mimetype: voiceMessage.mimetype,
      fileLength: voiceMessage.fileLength
    });
    
    // Enviar mensagem
    const result = await sock.sendMessage(to, voiceMessage);
    
    console.log('✅ PTT enviado com sucesso via Baileys');
    return result;
    
  } catch (error) {
    console.error('❌ Erro ao enviar PTT via Baileys:', error);
    
    // Log detalhado do erro
    console.error('🎵 Detalhes do erro:', {
      message: error.message,
      stack: error.stack,
      sessionId,
      to,
      bufferSize: buffer?.length
    });
    
    throw error;
  }
};

/**
 * Enviar mídia
 */
export const sendMedia = async (sessionId, to, buffer, mimetype, caption, options = {}) => {
  const sock = getBaileysSession(sessionId);
  if (!sock) throw new Error('Sessão Baileys não encontrada');

  let content;
  try {
    if (mimetype?.startsWith('audio/')) {
      // Para áudios, verificar se deve ser enviado como nota de voz
      const isVoiceNote = options.isVoiceNote !== false; // Por padrão, áudios são notas de voz
      
      if (isVoiceNote) {
        console.log(`🎵 Enviando áudio como nota de voz (PTT)`);
        return await sendVoiceNote(sessionId, to, buffer, mimetype, options.duration);
      } else {
        console.log(`🎵 Enviando áudio como arquivo de mídia`);
        content = { audio: buffer, mimetype };
        if (caption) content.caption = caption;
      }
    } else if (mimetype?.startsWith('image/')) {
      content = { image: buffer, mimetype };
      if (caption) content.caption = caption;
    } else if (mimetype?.startsWith('video/')) {
      content = { video: buffer, mimetype };
      if (caption) content.caption = caption;
    } else {
      // Documento genérico
      content = { document: buffer, mimetype };
      if (caption) content.caption = caption;
    }
    return await sock.sendMessage(to, content);
  } catch (err) {
    console.error('Erro ao enviar mídia, tentando fallback:', err);
    // Fallback como documento se falhar
    const fallback = { document: buffer, mimetype };
    if (caption) fallback.caption = caption;
    return await sock.sendMessage(to, fallback);
  }
};

/**
 * Enviar enquete (poll)
 */
export const sendPoll = async (sessionId, to, question, options, opts = {}) => {
  const sock = getBaileysSession(sessionId);
  if (!sock) throw new Error('Sessão Baileys não encontrada');

  const allowMultipleAnswers = !!opts.allowMultipleAnswers;
  const selectableCount = allowMultipleAnswers ? Math.min(Math.max(2, options.length), 12) : 1;

  const poll = {
    name: question,
    values: options,
    selectableCount
  };

  const sent = await sock.sendMessage(to, { poll });
  return { messageId: sent?.key?.id || null };
};

/**
 * Limpar uma sessão Baileys
 */
export const cleanupBaileysSession = async (sessionId) => {
  try {
    const sessionIndex = findSessionIndex(sessionId);
    if (sessionIndex !== -1) {
      const session = sessions[sessionIndex];
      
      try {
        await session.socket.end();
      } catch (error) {
        console.error(`Erro ao finalizar sessão Baileys ${sessionId}:`, error);
      }
      
      sessions.splice(sessionIndex, 1);
    }
    
    // Limpar arquivos de autenticação
    try {
  const authPath = getAuthDir(sessionId);
      await fs.rm(authPath, { recursive: true, force: true });
      console.log(`Arquivos de autenticação da sessão ${sessionId} removidos`);
    } catch (error) {
      console.warn(`Erro ao remover arquivos de auth da sessão ${sessionId}:`, error.message);
    }
    
    console.log(`Sessão Baileys ${sessionId} removida da memória`);
  } catch (error) {
    console.error(`Erro ao limpar sessão Baileys ${sessionId}:`, error);
  }
};

/**
 * Remover uma sessão Baileys
 */
export const removeBaileysSession = async (sessionId) => {
  await cleanupBaileysSession(sessionId);
};

/**
 * Reiniciar uma sessão Baileys
 */
export const restartBaileysSession = async (sessionId, onQR, onReady, onMessage) => {
  try {
    console.log(`Reiniciando sessão Baileys: ${sessionId}`);
    
    // Remover sessão existente
    await cleanupBaileysSession(sessionId);
    
    // Aguardar um pouco antes de recriar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Criar nova sessão
    return await createBaileysSession(sessionId, onQR, onReady, onMessage);
  } catch (error) {
    console.error(`Erro ao reiniciar sessão Baileys ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Desligar uma sessão completamente
 */
export const shutdownBaileysSession = async (sessionId) => {
  try {
    console.log(`Desligando sessão Baileys: ${sessionId}`);
    
    // Normalizar sessionId para encontrar a sessão correta
    const baseNumber = sessionId.split(':')[0];
    const sessionIndex = sessions.findIndex(s => {
      const sBaseNumber = s.sessionId.split(':')[0];
      return sBaseNumber === baseNumber;
    });
    
    if (sessionIndex === -1) {
      console.warn(`Sessão ${sessionId} não encontrada para desligar`);
      return;
    }

    const session = sessions[sessionIndex];
    console.log(`🔄 Sessão encontrada: ${session.sessionId} para desligar ${sessionId}`);
    
    // Fazer logout e destruir a sessão
    try {
      await session.socket.logout();
    } catch (error) {
      console.warn(`Erro ao fazer logout da sessão ${sessionId}:`, error.message);
    }
    
    await session.socket.end();
    sessions.splice(sessionIndex, 1);
    
    // Remover arquivos da sessão
  const authPath = getAuthDir(sessionId);
    
    try {
      await fs.rm(authPath, { recursive: true, force: true });
      console.log(`Arquivos da sessão removidos: ${authPath}`);
    } catch (error) {
      console.warn(`Erro ao remover arquivos da sessão: ${error.message}`);
    }

    console.log(`Sessão ${sessionId} desligada com sucesso`);
  } catch (error) {
    console.error(`Erro ao desligar sessão Baileys ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Desconectar sessão manualmente
 */
export const disconnectBaileysSession = async (sessionId) => {
  const sessionIndex = findSessionIndex(sessionId);
  if (sessionIndex !== -1) {
    const session = sessions[sessionIndex];
    try {
      await session.socket.logout();
      await cleanupBaileysSession(sessionId);
      return true;
    } catch (error) {
      console.error(`Erro ao desconectar sessão Baileys ${sessionId}:`, error);
      await cleanupBaileysSession(sessionId);
      return false;
    }
  }
  return false;
};

/**
 * Listar todas as sessões Baileys
 */
export const listBaileysSessions = () => {
  return sessions
    .filter(s => s && typeof s.sessionId === 'string' && s.sessionId.trim() !== '')
    .map(session => session.sessionId);
};

/**
 * Obter status de uma sessão
 */
export const getBaileysSessionStatus = (sessionId) => {
  const sessionIndex = findSessionIndex(sessionId);
  return sessionIndex !== -1 ? sessions[sessionIndex].status : 'disconnected';
};

/**
 * Listar todas as sessões ativas
 */
export const getAllActiveBaileysSessions = () => {
  return sessions.map(session => ({
    sessionId: session.sessionId,
    status: session.status
  }));
};

/**
 * Buscar informações do contato no Baileys
 */
export const getContactInfoBaileys = async (sessionId, contactId) => {
  try {
    console.log(`🔍 Buscando informações do contato ${contactId} na sessão Baileys ${sessionId}`);
    
    const session = getBaileysSession(sessionId);
    if (!session) {
      throw new Error(`Sessão Baileys ${sessionId} não encontrada`);
    }

    const sock = session.socket;

    // Buscar informações do contato
    let contactInfo = {
      id: contactId,
      name: contactId.replace('@c.us', '').replace('@s.whatsapp.net', ''),
      pushname: null,
      formattedNumber: contactId.replace('@c.us', '').replace('@s.whatsapp.net', ''),
      isBlocked: false,
      isGroup: contactId.includes('@g.us'),
      isMe: false,
      isWAContact: true,
      profilePicUrl: null
    };

    try {
      // Tentar buscar foto do perfil
      const profilePic = await sock.profilePictureUrl(contactId, 'image');
      contactInfo.profilePicUrl = profilePic;
      console.log(`✅ Foto do perfil encontrada para ${contactId}`);
    } catch (error) {
      console.log(`⚠️ Não foi possível obter foto do perfil para ${contactId}: ${error.message}`);
    }

    try {
      // Tentar buscar status/nome do contato
      const contactDetails = await sock.onWhatsApp(contactId);
      if (contactDetails && contactDetails.length > 0) {
        contactInfo.isWAContact = contactDetails[0].exists;
      }
    } catch (error) {
      console.log(`⚠️ Não foi possível verificar se o contato existe: ${error.message}`);
    }

    return contactInfo;
  } catch (error) {
    console.error(`❌ Erro ao buscar informações do contato ${contactId}:`, error);
    throw error;
  }
};

/**
 * Buscar mídias de um chat específico no Baileys
 */
export const getChatMediaBaileys = async (sessionId, contactId, limit = 50) => {
  try {
    console.log(`🔍 Buscando mídias do chat ${contactId} na sessão Baileys ${sessionId}`);
    
    const session = getBaileysSession(sessionId);
    if (!session) {
      throw new Error(`Sessão Baileys ${sessionId} não encontrada`);
    }

    // Por ora, retornamos array vazio, pois implementar busca de mídia no Baileys 
    // requer implementação mais complexa de armazenamento de mensagens
    console.log(`⚠️ Busca de mídias no Baileys ainda não implementada completamente`);
    return [];
  } catch (error) {
    console.error(`❌ Erro ao buscar mídias do chat ${contactId}:`, error);
    throw error;
  }
};
