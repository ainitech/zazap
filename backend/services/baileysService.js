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

// Interface para sessões
class BaileysSession {
  constructor(socket, sessionId) {
    this.socket = socket;
    this.sessionId = sessionId;
    this.status = 'connecting';
  }
}

// Armazenar sessões ativas
const sessions = [];

// Função para criar ou atualizar contato no Baileys
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
      name: contactInfo?.notify || null,
      pushname: contactInfo?.notify || null,
      formattedNumber: phoneNumber || null,
      profilePicUrl: profilePicUrl || null,
      isBlocked: false,
      isGroup: whatsappId.includes('@g.us'),
      isWAContact: contactInfo?.exists !== false, // default true
      lastSeen: new Date()
    };
    
    if (contact) {
      // Atualizar contato existente
      await contact.update(contactData);
      console.log(`✅ Contato Baileys atualizado: ${contactData.name || contactData.whatsappId}`);
      
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
 * Processar mensagens recebidas
 */
const handleMessage = async (msg, sock) => {
  try {
    if (msg.key && msg.key.remoteJid && msg.key.remoteJid.includes('status@broadcast')) return;
    
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const fromJid = msg.key.remoteJid;
    
    console.log(`📨 Nova mensagem Baileys de ${fromJid}: ${messageText}`);
    
    // Buscar a sessão no banco de dados usando o sessionId do socket
    const session = await Session.findOne({
      where: { whatsappId: sock.sessionId }
    });
    
    if (!session) {
      console.error(`❌ Sessão não encontrada no banco: ${sock.sessionId}`);
      return;
    }
    
    console.log(`✅ Sessão encontrada no banco: ID ${session.id}, whatsappId: ${session.whatsappId}`);
    
    // Criar ou atualizar contato
    const contact = await createOrUpdateContactBaileys(fromJid, session.id, sock);
    
    // Buscar ou criar ticket
    let ticket = await Ticket.findOne({ 
      where: { 
        sessionId: session.id,
        contact: fromJid 
      } 
    });
    
    if (!ticket) {
      ticket = await Ticket.create({
        sessionId: session.id,
        contact: fromJid,
        contactId: contact ? contact.id : null, // Vincular ao contato criado
        lastMessage: messageText,
        unreadCount: 1,
        status: 'open',
        chatStatus: 'waiting' // Iniciar como aguardando
      });
      console.log(`🎫 Novo ticket criado: #${ticket.id} para ${fromJid} na sessão ${sock.sessionId} (ID: ${session.id}) com contato ${contact?.id || 'N/A'}`);
      try {
        const payload = {
          title: 'Nova mensagem',
          body: contact?.name ? `${contact.name}: ${messageText}` : `${fromJid}: ${messageText}`,
          ticketId: ticket.id,
          contact: fromJid,
          iconUrl: contact?.profilePicUrl || null
        };
        emitToAll('notification', payload);
        try {
          const push = await import('./push.js');
          if (push && push.broadcastPush) await push.broadcastPush(payload);
        } catch (pushErr) {
          console.warn('⚠️ Push broadcast failed (baileys new ticket):', pushErr);
        }
      } catch (notifyErr) {
        console.error('❌ Falha ao emitir notificação via socket (baileys):', notifyErr);
      }
    } else {
      // Atualizar ticket existente e vincular ao contato se não estiver vinculado
      ticket.lastMessage = messageText;
      ticket.unreadCount += 1;
      ticket.updatedAt = new Date();
      
      if (!ticket.contactId && contact) {
        ticket.contactId = contact.id;
        console.log(`🔗 Ticket #${ticket.id} vinculado ao contato ${contact.id}`);
      }
      
      // Reabrir ticket se estiver fechado ou resolvido
      const wasResolvedOrClosed = (ticket.status === 'closed' || ticket.chatStatus === 'resolved');
      if (wasResolvedOrClosed) {
        const prev = { status: ticket.status, chatStatus: ticket.chatStatus };
        ticket.status = 'open';
        ticket.chatStatus = 'waiting'; // Reabrir como aguardando
        console.log(`🔄 Ticket #${ticket.id} reaberto por nova mensagem (status anterior: ${prev.status}/${prev.chatStatus})`);
        try {
          const payload = {
            title: 'Novo contato',
            body: contact?.name ? `${contact.name}: ${messageText}` : `${fromJid}: ${messageText}`,
            ticketId: ticket.id,
            contact: fromJid,
            iconUrl: contact?.profilePicUrl || null
          };
          emitToAll('notification', payload);
          try {
            const push = await import('./push.js');
            if (push && push.broadcastPush) await push.broadcastPush(payload);
          } catch (pushErr) {
            console.warn('⚠️ Push broadcast failed (baileys reopen):', pushErr);
          }
        } catch (notifyErr) {
          console.error('❌ Falha ao emitir notificação via socket (baileys reopen):', notifyErr);
        }
      }
      await ticket.save();
    }
    
    // Salvar mensagem
    const message = await TicketMessage.create({
      ticketId: ticket.id,
      sender: 'contact',
      content: messageText,
      timestamp: new Date()
    });
    
    console.log(`💾 Mensagem salva no ticket #${ticket.id}`);
    
    // Emitir nova mensagem via WebSocket
    try {
      console.log(`🔄 Emitindo nova mensagem via WebSocket para ticket ${ticket.id}`);
      emitToTicket(ticket.id, 'new-message', message);
      emitToAll('message-update', { ticketId: ticket.id, message });
      
      // Também emitir atualização de tickets para refletir nova atividade
      const tickets = await Ticket.findAll({
        include: [
          {
            model: Contact,
            required: false
          },
          {
            model: Queue,
            required: false
          },
          {
            model: User,
            as: 'AssignedUser',
            required: false
          }
        ],
        order: [['updatedAt', 'DESC']]
      });
      emitToAll('tickets-update', tickets);
      
      console.log(`✅ Eventos WebSocket emitidos com sucesso`);
    } catch (socketError) {
      console.error(`❌ Erro ao emitir evento WebSocket:`, socketError);
    }
    
  } catch (error) {
    console.error('Erro ao processar mensagem Baileys:', error);
  }
};

/**
 * Criar uma nova sessão Baileys
 */
export const createBaileysSession = async (sessionId, onQR, onReady, onMessage) => {
  try {
    console.log(`Criando sessão Baileys: ${sessionId}`);

    // Verificar se já existe uma sessão
    const existingSessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
    if (existingSessionIndex !== -1) {
      console.log(`Removendo sessão existente: ${sessionId}`);
      await sessions[existingSessionIndex].socket.end();
      sessions.splice(existingSessionIndex, 1);
    }

    // Configurar autenticação
    const authDir = path.resolve(process.cwd(), `baileys_auth_${sessionId}`);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    
    // Obter versão mais recente do Baileys
    const { version } = await fetchLatestBaileysVersion();

    // Criar socket
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10_000,
      emitOwnEvents: true,
      fireInitQueries: true,
      browser: ['ZaZap', 'Desktop', '1.0.0'],
    });

    // Criar instância da sessão
    const session = new BaileysSession(sock, sessionId);
    sessions.push(session);

    // Evento para salvar credenciais
    sock.ev.on('creds.update', saveCreds);
    
    // Evento de atualização de conexão
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr && onQR) {
        try {
          console.log(`QR Code gerado para sessão Baileys ${sessionId}`);
          // Gerar QR Code como base64
          const qrCodeDataURL = await qrcode.toDataURL(qr);
          session.status = 'qr';
          onQR(qrCodeDataURL);
          
          // Emitir via WebSocket
          try {
            const { emitToAll } = await import('./socket.js');
            // Buscar sessão no banco para obter o ID
            const sessionRecord = await Session.findOne({ where: { whatsappId: sessionId } });
            if (sessionRecord) {
              emitToAll("qr-code-update", {
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
        
        // Emitir via WebSocket
        try {
          const { emitToAll } = await import('./socket.js');
          const sessionRecord = await Session.findOne({ where: { whatsappId: sessionId } });
          if (sessionRecord) {
            emitToAll("session-status-update", {
              sessionId: sessionRecord.id,
              status: 'connected'
            });
            emitToAll("qr-code-update", {
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
        const shouldReconnect = lastDisconnect?.error instanceof Boom &&
          lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut;
          
        console.log(`🔴 Sessão Baileys ${sessionId} fechada:`, lastDisconnect?.error, ', deveria reconectar:', shouldReconnect);
        
        session.status = 'disconnected';
        
        // Remover da lista de sessões
        const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
        if (sessionIndex !== -1) {
          sessions.splice(sessionIndex, 1);
        }
        
        if (!shouldReconnect) {
          console.log(`Limpando sessão Baileys ${sessionId}`);
          await cleanupBaileysSession(sessionId);
        }
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
            await handleMessage(msg, sock);
            
            if (onMessage) {
              await onMessage(msg, sock);
            }
          }
        }
      }
    });

    // Evento de presença
    sock.ev.on('presence.update', ({ id, presences }) => {
      console.log(`Presença atualizada para ${id}:`, presences);
    });

    return sock;

  } catch (error) {
    console.error(`Erro ao criar sessão Baileys ${sessionId}:`, error);
    
    // Remover da lista em caso de erro
    const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
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
  const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
  
  if (sessionIndex === -1) {
    throw new Error("Sessão Baileys não encontrada");
  }
  
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
  
  console.log(`✅ Sessão "${sessionId}" encontrada, enviando mensagem...`);
  const result = await sock.sendMessage(to, { text });
  
  // Após enviar, tentar atualizar informações do contato
  try {
    const session = await Session.findOne({ where: { whatsappId: sessionId } });
    if (session) {
      await createOrUpdateContactBaileys(to, session.id, sock);
    }
  } catch (updateError) {
    console.log(`⚠️ Erro ao atualizar contato após envio: ${updateError.message}`);
  }
  
  return result;
};

/**
 * Enviar mídia
 */
export const sendMedia = async (sessionId, to, buffer, mimetype, caption) => {
  const sock = getBaileysSession(sessionId);
  if (!sock) throw new Error('Sessão Baileys não encontrada');

  let content;
  try {
    if (mimetype?.startsWith('audio/')) {
      // Enviar como mensagem de voz (ptt) para parecer gravado na hora
      content = { audio: buffer, mimetype, ptt: true };
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
    // Fallback como documento se falhar
    const fallback = { document: buffer, mimetype };
    if (caption) fallback.caption = caption;
    return await sock.sendMessage(to, fallback);
  }
};

/**
 * Limpar uma sessão Baileys
 */
export const cleanupBaileysSession = async (sessionId) => {
  try {
    const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
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
      const authPath = path.resolve(process.cwd(), `baileys_auth_${sessionId}`);
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
    
    const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
    if (sessionIndex === -1) {
      console.warn(`Sessão ${sessionId} não encontrada para desligar`);
      return;
    }

    const session = sessions[sessionIndex];
    
    // Fazer logout e destruir a sessão
    try {
      await session.socket.logout();
    } catch (error) {
      console.warn(`Erro ao fazer logout da sessão ${sessionId}:`, error.message);
    }
    
    await session.socket.end();
    sessions.splice(sessionIndex, 1);
    
    // Remover arquivos da sessão
    const authPath = path.resolve(process.cwd(), `baileys_auth_${sessionId}`);
    
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
  const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
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
  return sessions.map(session => session.sessionId);
};

/**
 * Obter status de uma sessão
 */
export const getBaileysSessionStatus = (sessionId) => {
  const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
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
