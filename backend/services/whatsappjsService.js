import fs from "fs/promises";
import path from "path";
import qrCode from "qrcode-terminal";
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import { Session, Ticket, TicketMessage, Contact } from '../models/index.js';
import { emitToTicket, emitToAll } from './socket.js';

// Interface para sessão estendida
class SessionExtended extends Client {
  constructor(options) {
    super(options);
    this.id = null;
    this.sessionId = null;
  }
}

// Armazenar sessões ativas
const sessions = [];

// Função para sincronizar mensagens não lidas
const syncUnreadMessages = async (wbot) => {
  try {
    console.log(`🔄 Sincronizando mensagens não lidas para sessão: ${wbot.sessionId}`);
    
    if (!wbot.sessionId) {
      console.error(`❌ wbot.sessionId indefinido em syncUnreadMessages!`);
      return;
    }
    
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const chats = await wbot.getChats();
    console.log(`Total de chats carregados: ${chats.length}`);

    for (const chat of chats) {
      if (chat.unreadCount > 0) {
        const unreadMessages = await chat.fetchMessages({
          limit: chat.unreadCount
        });

        for (const msg of unreadMessages) {
          await handleMessage(msg, wbot);
        }

        await chat.sendSeen();
      }
    }
  } catch (error) {
    console.error("Erro ao carregar os chats:", error);
  }
};

// Função para criar ou atualizar contato
const createOrUpdateContact = async (whatsappId, sessionId, wbot) => {
  try {
    console.log(`👤 Criando/atualizando contato: ${whatsappId} na sessão: ${sessionId}`);
    
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
      contactInfo = await wbot.getContactById(whatsappId);
      
      // Tentar obter foto do perfil
      try {
        profilePicUrl = await contactInfo.getProfilePicUrl();
      } catch (picError) {
        console.log(`⚠️ Não foi possível obter foto do perfil para ${whatsappId}:`, picError.message);
      }
    } catch (infoError) {
      console.log(`⚠️ Não foi possível obter informações do contato ${whatsappId}:`, infoError.message);
    }
    
    const contactData = {
      whatsappId,
      sessionId,
      name: contactInfo?.name || contactInfo?.pushname || null,
      pushname: contactInfo?.pushname || null,
      formattedNumber: contactInfo?.number || null,
      profilePicUrl: profilePicUrl || null,
      isBlocked: contactInfo?.isBlocked || false,
      isGroup: contactInfo?.isGroup || false,
      isWAContact: contactInfo?.isWAContact !== false, // default true
      lastSeen: new Date()
    };
    
    if (contact) {
      // Atualizar contato existente
      await contact.update(contactData);
      console.log(`✅ Contato atualizado: ${contactData.name || contactData.whatsappId}`);
      
      // Emitir evento de contato atualizado
      emitToAll('contact-updated', contact);
    } else {
      // Criar novo contato
      contact = await Contact.create(contactData);
      console.log(`🆕 Novo contato criado: ${contactData.name || contactData.whatsappId}`);
      
      // Emitir evento de novo contato
      emitToAll('contact-updated', contact);
    }
    
    return contact;
  } catch (error) {
    console.error(`❌ Erro ao criar/atualizar contato ${whatsappId}:`, error);
    return null;
  }
};

// Função para processar mensagens recebidas
const handleMessage = async (msg, wbot) => {
  try {
    if (msg.from === 'status@broadcast') return;
    
    console.log(`📨 Nova mensagem WhatsApp.js de ${msg.from}: ${msg.body}`);
    console.log(`🔍 Dados do wbot:`, {
      sessionId: wbot.sessionId,
      id: wbot.id,
      hasSessionId: !!wbot.sessionId
    });
    
    // Verificar se wbot.sessionId está definido
    if (!wbot.sessionId) {
      console.error(`❌ wbot.sessionId está indefinido! Dados do wbot:`, wbot);
      return;
    }
    
    // Buscar a sessão no banco de dados usando o whatsappId
    console.log(`🔍 Buscando sessão no banco com whatsappId: ${wbot.sessionId}`);
    const session = await Session.findOne({
      where: { whatsappId: wbot.sessionId }
    });
    
    if (!session) {
      console.error(`❌ Sessão não encontrada no banco: ${wbot.sessionId}`);
      // Tentar buscar todas as sessões para debug
      const allSessions = await Session.findAll({ limit: 5 });
      console.log(`📋 Sessões disponíveis no banco:`, allSessions.map(s => ({ id: s.id, whatsappId: s.whatsappId })));
      return;
    }
    
    console.log(`✅ Sessão encontrada no banco: ID ${session.id}, whatsappId: ${session.whatsappId}`);
    
    // Criar ou atualizar contato
    const contact = await createOrUpdateContact(msg.from, session.id, wbot);
    
    // Buscar ou criar ticket
    let ticket = await Ticket.findOne({ 
      where: { 
        sessionId: session.id,
        contact: msg.from 
      } 
    });
    
    if (!ticket) {
      ticket = await Ticket.create({
        sessionId: session.id,
        contact: msg.from,
        contactId: contact ? contact.id : null, // Vincular ao contato criado
        lastMessage: msg.body || '',
        unreadCount: 1,
        status: 'open'
      });
      console.log(`🎫 Novo ticket criado: #${ticket.id} para ${msg.from} na sessão ${wbot.sessionId} (ID: ${session.id}) com contato ${contact?.id || 'N/A'}`);
    } else {
      // Atualizar ticket existente e vincular ao contato se não estiver vinculado
      ticket.lastMessage = msg.body || '';
      ticket.unreadCount += 1;
      ticket.updatedAt = new Date();
      
      if (!ticket.contactId && contact) {
        ticket.contactId = contact.id;
        console.log(`🔗 Ticket #${ticket.id} vinculado ao contato ${contact.id}`);
      }
      
      if (ticket.status === 'closed') {
        ticket.status = 'open';
        console.log(`🔄 Ticket #${ticket.id} reaberto por nova mensagem`);
      }
      await ticket.save();
    }
    
    // Salvar mensagem
    const message = await TicketMessage.create({
      ticketId: ticket.id,
      sender: 'contact',
      content: msg.body || '',
      timestamp: new Date()
    });
    
    console.log(`💾 Mensagem salva no ticket #${ticket.id}`);
    
    // Emitir nova mensagem via WebSocket
    try {
      console.log(`🔄 Emitindo nova mensagem via WebSocket para ticket ${ticket.id}`);
      emitToTicket(ticket.id, 'new-message', message);
      emitToAll('message-update', { ticketId: ticket.id, message });
      
      // Também emitir atualização de tickets para refletir nova atividade
      const { Ticket: TicketModel } = await import('../models/index.js');
      const tickets = await TicketModel.findAll({
        order: [['updatedAt', 'DESC']]
      });
      emitToAll('tickets-update', tickets);
      
      console.log(`✅ Eventos WebSocket emitidos com sucesso`);
    } catch (socketError) {
      console.error(`❌ Erro ao emitir evento WebSocket:`, socketError);
    }
    
  } catch (error) {
    console.error('Erro ao processar mensagem WhatsApp.js:', error);
  }
};

/**
 * Inicializar sessão WhatsApp.js (versão robusta)
 */
export const initWbot = async (whatsapp) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('🚀 Iniciando sessão WhatsApp.js para:', whatsapp.name);
      
      const sessionName = whatsapp.name;
      let sessionCfg;

      if (whatsapp && whatsapp.session) {
        sessionCfg = JSON.parse(whatsapp.session);
      }

      // Verificar se já existe uma sessão
      const existingSessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
      if (existingSessionIndex !== -1) {
        console.log(`Removendo sessão existente: ${whatsapp.id}`);
        await sessions[existingSessionIndex].destroy();
        sessions.splice(existingSessionIndex, 1);
      }

      const wbot = new SessionExtended({
        session: sessionCfg,
        authStrategy: new LocalAuth({ clientId: `bd_${whatsapp.id}` }),
        puppeteer: {
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox", 
            "--disable-dev-shm-usage",
            "--log-level=3",
            "--no-default-browser-check",
            "--disable-site-isolation-trials",
            "--no-experiments",
            "--ignore-gpu-blacklist",
            "--ignore-certificate-errors",
            "--ignore-certificate-errors-spki-list",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-default-apps",
            "--enable-features=NetworkService",
            "--disable-webgl",
            "--disable-threaded-animation",
            "--disable-threaded-scrolling",
            "--disable-in-process-stack-traces",
            "--disable-histogram-customizer",
            "--disable-gl-extensions",
            "--disable-composited-antialiasing",
            "--disable-canvas-aa",
            "--disable-3d-apis",
            "--disable-accelerated-2d-canvas",
            "--disable-accelerated-jpeg-decoding",
            "--disable-accelerated-mjpeg-decode",
            "--disable-app-list-dismiss-on-blur",
            "--disable-accelerated-video-decode",
            "--disable-background-timer-throttling",
            "--disable-features=IsolateOrigins,site-per-process"
          ],
          executablePath: process.env.CHROME_BIN || undefined,
        },
      });

      wbot.id = whatsapp.id;
      wbot.sessionId = sessionName;
      wbot.initialize();

      wbot.on("qr", async qr => {
        console.log("📱 QR Code gerado para sessão:", sessionName);
        qrCode.generate(qr, { small: true });
        
        await whatsapp.update({ 
          qrcode: qr, 
          status: "qrcode", 
          retries: 0 
        });

        // Adicionar à lista se não existir
        const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
        if (sessionIndex === -1) {
          sessions.push(wbot);
        }

        // Emitir evento via socket se disponível
        try {
          const { emitToAll } = await import('./socket.js');
          emitToAll("qr-code-update", {
            sessionId: whatsapp.id,
            qrCode: qr,
            status: 'qr_ready'
          });
          console.log('✅ QR Code emitido via WebSocket');
        } catch (err) {
          console.log('Socket não disponível para emitir QR');
        }
      });

      wbot.on("authenticated", async session => {
        console.log(`✅ Sessão ${sessionName} AUTENTICADA`);
      });

      wbot.on("auth_failure", async msg => {
        console.error(`❌ Falha na autenticação da sessão ${sessionName}:`, msg);

        if (whatsapp.retries > 1) {
          await whatsapp.update({ session: "", retries: 0 });
        }

        const retry = whatsapp.retries;
        await whatsapp.update({
          status: "DISCONNECTED",
          retries: retry + 1,
          number: ""
        });

        // Remover da lista em caso de falha
        const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
        if (sessionIndex !== -1) {
          sessions.splice(sessionIndex, 1);
        }

        try {
          const { emitToAll } = await import('./socket.js');
          emitToAll("session-status-update", {
            sessionId: whatsapp.id,
            status: 'error'
          });
          emitToAll("qr-code-update", {
            sessionId: whatsapp.id,
            qrCode: '',
            status: 'error'
          });
          console.log('✅ Status de erro emitido via WebSocket');
        } catch (err) {
          console.log('Socket não disponível');
        }

        reject(new Error("Erro ao iniciar sessão WhatsApp."));
      });

      wbot.on("ready", async () => {
        console.log(`🟢 Sessão ${sessionName} PRONTA`);

        await whatsapp.update({
          status: "CONNECTED",
          qrcode: "",
          retries: 0,
          number: wbot.info.wid._serialized.split("@")[0]
        });

        try {
          const { emitToAll } = await import('./socket.js');
          emitToAll("session-status-update", {
            sessionId: whatsapp.id,
            status: 'connected'
          });
          emitToAll("qr-code-update", {
            sessionId: whatsapp.id,
            qrCode: '',
            status: 'connected'
          });
          console.log('✅ Status conectado emitido via WebSocket');
        } catch (err) {
          console.log('Socket não disponível');
        }

        // Adicionar à lista se não existir
        const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
        if (sessionIndex === -1) {
          sessions.push(wbot);
        }

        wbot.sendPresenceAvailable();
        await syncUnreadMessages(wbot);

        resolve(wbot);
      });

      wbot.on("disconnected", async (reason) => {
        console.log(`🔴 Sessão ${sessionName} desconectada:`, reason);
        
        await whatsapp.update({
          status: "DISCONNECTED"
        });

        // Remover da lista de sessões
        const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
        if (sessionIndex !== -1) {
          sessions.splice(sessionIndex, 1);
        }

        try {
          const { getIO } = await import('./socket.js');
          const io = getIO();
          io.emit("whatsappSession", {
            action: "update",
            session: whatsapp
          });
        } catch (err) {
          console.log('Socket não disponível');
        }
      });

      wbot.on("message", async msg => {
        await handleMessage(msg, wbot);
      });

    } catch (err) {
      console.error('Erro ao inicializar sessão WhatsApp.js:', err);
      reject(err);
    }
  });
};

// Função para obter sessão ativa
export const getWbot = (whatsappId) => {
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);

  if (sessionIndex === -1) {
    throw new Error("Sessão WhatsApp não inicializada");
  }
  return sessions[sessionIndex];
};

// Função para remover sessão
export const removeWbot = (whatsappId) => {
  try {
    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex !== -1) {
      sessions[sessionIndex].destroy();
      sessions.splice(sessionIndex, 1);
      console.log(`🗑️ Sessão WhatsApp.js ${whatsappId} removida`);
    }
  } catch (err) {
    console.error('Erro ao remover sessão WhatsApp.js:', err);
  }
};

// Função para reiniciar sessão
export const restartWbot = async (whatsappId) => {
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
  if (sessionIndex !== -1) {
    const whatsapp = await Session.findByPk(whatsappId);
    if (!whatsapp) {
      throw new Error("WhatsApp não encontrado.");
    }
    
    sessions[sessionIndex].destroy();
    sessions.splice(sessionIndex, 1);

    const newSession = await initWbot(whatsapp);
    return newSession;
  }
  throw new Error("Sessão WhatsApp não inicializada.");
};

// Função para desligar sessão completamente
export const shutdownWbot = async (whatsappId) => {
  const whatsappIDNumber = parseInt(whatsappId, 10);

  if (Number.isNaN(whatsappIDNumber)) {
    throw new Error("Formato de ID WhatsApp inválido.");
  }

  const whatsapp = await Session.findByPk(whatsappIDNumber);
  if (!whatsapp) {
    throw new Error("WhatsApp não encontrado.");
  }

  const sessionIndex = sessions.findIndex(s => s.id === whatsappIDNumber);
  if (sessionIndex === -1) {
    console.warn(`Sessão com ID ${whatsappIDNumber} não foi encontrada.`);
    throw new Error("Sessão WhatsApp não inicializada.");
  }

  const sessionPath = path.resolve(
    process.cwd(),
    `.wwebjs_auth/session-bd_${whatsappIDNumber}`
  );

  try {
    console.log(`🔌 Desligando sessão WhatsApp ID: ${whatsappIDNumber}`);
    await sessions[sessionIndex].destroy();
    console.log(`✅ Sessão ${whatsappIDNumber} desligada com sucesso.`);

    console.log(`🗂️ Removendo arquivos da sessão: ${sessionPath}`);
    await fs.rm(sessionPath, { recursive: true, force: true });
    console.log(`✅ Arquivos da sessão removidos: ${sessionPath}`);

    sessions.splice(sessionIndex, 1);
    console.log(`📝 Sessão ${whatsappIDNumber} removida da lista.`);
    
    const retry = whatsapp.retries;
    await whatsapp.update({
      status: "DISCONNECTED",
      qrcode: "",
      session: "",
      retries: retry + 1,
      number: ""
    });
    
  } catch (error) {
    console.error(`Erro ao desligar sessão ${whatsappIDNumber}:`, error);
    throw new Error("Falha ao destruir sessão WhatsApp.");
  }
};

// Função para enviar mensagem
export const sendMessage = async (whatsappId, to, message) => {
  try {
    const wbot = getWbot(whatsappId);
    await wbot.sendMessage(to, message);
    console.log(`� Mensagem enviada para ${to}`);
    return true;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
};

// Função para obter status da sessão
export const getSessionStatus = (whatsappId) => {
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
  return sessionIndex !== -1 ? 'connected' : 'disconnected';
};

// Função para listar todas as sessões ativas
export const getAllActiveSessions = () => {
  return sessions.map(session => ({
    id: session.id,
    status: 'connected'
  }));
};

/**
 * Criar uma nova sessão WhatsApp.js (interface simplificada)
 */
export const createWhatsappJsSession = async (sessionId, onReady, onMessage) => {
  try {
    console.log(`Criando sessão WhatsApp.js: ${sessionId}`);

    // Verificar se já existe uma sessão
    const existingSessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
    if (existingSessionIndex !== -1) {
      console.log(`Removendo sessão existente: ${sessionId}`);
      await sessions[existingSessionIndex].destroy();
      sessions.splice(existingSessionIndex, 1);
    }

    const wbot = new SessionExtended({
      authStrategy: new LocalAuth({ clientId: `zazap_${sessionId}` }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox", 
          "--disable-dev-shm-usage",
          "--log-level=3",
          "--no-default-browser-check",
          "--disable-site-isolation-trials",
          "--no-experiments",
          "--ignore-gpu-blacklist",
          "--ignore-certificate-errors",
          "--ignore-certificate-errors-spki-list",
          "--disable-gpu",
          "--disable-extensions",
          "--disable-default-apps",
          "--enable-features=NetworkService",
          "--disable-webgl",
          "--disable-threaded-animation",
          "--disable-threaded-scrolling",
          "--disable-in-process-stack-traces",
          "--disable-histogram-customizer",
          "--disable-gl-extensions",
          "--disable-composited-antialiasing",
          "--disable-canvas-aa",
          "--disable-3d-apis",
          "--disable-accelerated-2d-canvas",
          "--disable-accelerated-jpeg-decoding",
          "--disable-accelerated-mjpeg-decode",
          "--disable-app-list-dismiss-on-blur",
          "--disable-accelerated-video-decode",
          "--disable-background-timer-throttling",
          "--disable-features=IsolateOrigins,site-per-process"
        ],
        executablePath: process.env.CHROME_BIN || undefined,
      },
    });

    wbot.sessionId = sessionId;
    wbot.initialize();

    wbot.on("qr", async qr => {
      console.log(`QR Code gerado para sessão: ${sessionId}`);
      
      // Adicionar à lista se não existir
      const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
      if (sessionIndex === -1) {
        sessions.push(wbot);
      }
    });

    wbot.on("authenticated", async session => {
      console.log(`Sessão autenticada: ${sessionId}`);
    });

    wbot.on("auth_failure", async msg => {
      console.error(`Falha na autenticação da sessão ${sessionId}:`, msg);
      
      // Remover da lista em caso de falha
      const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
      if (sessionIndex !== -1) {
        sessions.splice(sessionIndex, 1);
      }
    });

    wbot.on("ready", async () => {
      console.log(`Sessão WhatsApp.js pronta: ${sessionId}`);
      console.log(`🔍 Verificando wbot.sessionId antes de syncUnreadMessages:`, wbot.sessionId);

      // Adicionar à lista se não existir
      const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
      if (sessionIndex === -1) {
        sessions.push(wbot);
      }

      wbot.sendPresenceAvailable();
      
      // Verificar novamente antes de chamar syncUnreadMessages
      if (wbot.sessionId) {
        console.log(`✅ wbot.sessionId definido: ${wbot.sessionId}, iniciando syncUnreadMessages`);
        await syncUnreadMessages(wbot);
      } else {
        console.error(`❌ wbot.sessionId indefinido no evento ready! sessionId original: ${sessionId}`);
      }

      if (onReady) onReady(wbot);
    });

    wbot.on("message", async msg => {
      try {
        // Verificar se é uma mensagem válida e não é de status
        if (msg.from === 'status@broadcast') return;
        
        console.log(`📨 Nova mensagem WhatsApp.js de ${msg.from}: ${msg.body}`);
        
        // Verificar se sessionId está definido
        if (!wbot.sessionId) {
          console.error(`❌ wbot.sessionId indefinido no evento message! SessionId original: ${sessionId}`);
          return;
        }
        
        // Chamar handleMessage
        await handleMessage(msg, wbot);
        
        // Chamar onMessage se definido
        if (onMessage) {
          await onMessage(msg, wbot);
        }
      } catch (error) {
        console.error(`Erro ao processar mensagem na sessão ${sessionId}:`, error);
      }
    });

    wbot.on("disconnected", (reason) => {
      console.log(`Sessão WhatsApp.js desconectada: ${sessionId}, razão: ${reason}`);
      
      const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
      if (sessionIndex !== -1) {
        sessions.splice(sessionIndex, 1);
      }
    });

    return wbot;

  } catch (error) {
    console.error(`Erro ao criar sessão WhatsApp.js ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Obter uma sessão por sessionId
 */
export const getWhatsappJsSession = (sessionId) => {
  const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
  
  if (sessionIndex === -1) {
    throw new Error("Sessão WhatsApp.js não encontrada");
  }
  
  return sessions[sessionIndex];
};

/**
 * Enviar texto por sessionId
 */
export const sendText = async (sessionId, to, text) => {
  console.log(`🔍 Buscando sessão WhatsApp-Web.js: "${sessionId}"`);
  
  const client = getWhatsappJsSession(sessionId);
  if (!client) {
    console.error(`❌ Sessão "${sessionId}" não encontrada no WhatsApp-Web.js`);
    throw new Error(`Sessão "${sessionId}" não encontrada no WhatsApp-Web.js`);
  }
  
  console.log(`✅ Sessão "${sessionId}" encontrada, enviando mensagem...`);
  const result = await client.sendMessage(to, text);
  
  // Após enviar, tentar atualizar informações do contato
  try {
    const session = await Session.findOne({ where: { whatsappId: sessionId } });
    if (session) {
      await createOrUpdateContact(to, session.id, client);
    }
  } catch (updateError) {
    console.log(`⚠️ Erro ao atualizar contato após envio: ${updateError.message}`);
  }
  
  return result;
};

/**
 * Enviar mídia por sessionId
 */
export const sendMedia = async (sessionId, to, base64, filename, mimetype) => {
  console.log(`🔍 Buscando sessão WhatsApp-Web.js para mídia: "${sessionId}"`);
  
  const client = getWhatsappJsSession(sessionId);
  if (!client) {
    console.error(`❌ Sessão "${sessionId}" não encontrada no WhatsApp-Web.js`);
    throw new Error(`Sessão "${sessionId}" não encontrada no WhatsApp-Web.js`);
  }
  
  console.log(`✅ Sessão "${sessionId}" encontrada, enviando mídia...`);
  const media = new MessageMedia(mimetype, base64, filename);
  return client.sendMessage(to, media);
};

/**
 * Limpar uma sessão (alias para compatibilidade)
 */
export const cleanupSession = (sessionId) => {
  const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
  if (sessionIndex !== -1) {
    sessions[sessionIndex].destroy();
    sessions.splice(sessionIndex, 1);
    console.log(`Sessão WhatsApp.js removida: ${sessionId}`);
  }
};

/**
 * Remover uma sessão por sessionId
 */
export const removeWhatsappJsSession = (sessionId) => {
  try {
    const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
    if (sessionIndex !== -1) {
      sessions[sessionIndex].destroy();
      sessions.splice(sessionIndex, 1);
      console.log(`Sessão WhatsApp.js removida: ${sessionId}`);
    }
  } catch (error) {
    console.error(`Erro ao remover sessão ${sessionId}:`, error);
  }
};

/**
 * Reiniciar uma sessão por sessionId
 */
export const restartWhatsappJsSession = async (sessionId, onReady, onMessage) => {
  try {
    console.log(`Reiniciando sessão WhatsApp.js: ${sessionId}`);
    
    // Remover sessão existente
    removeWhatsappJsSession(sessionId);
    
    // Aguardar um pouco antes de recriar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Criar nova sessão
    return await createWhatsappJsSession(sessionId, onReady, onMessage);
  } catch (error) {
    console.error(`Erro ao reiniciar sessão ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Desligar uma sessão completamente por sessionId
 */
export const shutdownWhatsappJsSession = async (sessionId) => {
  try {
    console.log(`Desligando sessão WhatsApp.js: ${sessionId}`);
    
    const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
    if (sessionIndex === -1) {
      console.warn(`Sessão ${sessionId} não encontrada para desligar`);
      return;
    }

    // Destruir a sessão
    await sessions[sessionIndex].destroy();
    sessions.splice(sessionIndex, 1);
    
    // Remover arquivos da sessão
    const sessionPath = path.resolve(
      process.cwd(),
      `.wwebjs_auth/session-zazap_${sessionId}`
    );

    try {
      await fs.rm(sessionPath, { recursive: true, force: true });
      console.log(`Arquivos da sessão removidos: ${sessionPath}`);
    } catch (error) {
      console.warn(`Erro ao remover arquivos da sessão: ${error.message}`);
    }

    console.log(`Sessão ${sessionId} desligada com sucesso`);
  } catch (error) {
    console.error(`Erro ao desligar sessão ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Desconectar sessão manualmente por sessionId
 */
export const disconnectSession = async (sessionId) => {
  try {
    const client = getWhatsappJsSession(sessionId);
    if (client) {
      await client.logout();
      removeWhatsappJsSession(sessionId);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Erro ao desconectar sessão ${sessionId}:`, error);
    removeWhatsappJsSession(sessionId);
    return false;
  }
};

/**
 * Listar todas as sessões por sessionId
 */
export const listSessions = () => {
  return sessions.map(session => session.sessionId).filter(id => id);
};

/**
 * Buscar informações do contato no WhatsApp
 */
export const getContactInfo = async (sessionId, contactId) => {
  try {
    console.log(`🔍 Buscando informações do contato ${contactId} na sessão ${sessionId}`);
    
    const session = getWhatsappJsSession(sessionId);
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada`);
    }

    // Buscar informações do contato
    const contact = await session.getContactById(contactId);
    if (!contact) {
      throw new Error(`Contato ${contactId} não encontrado`);
    }

    const contactInfo = {
      id: contact.id._serialized,
      name: contact.name || contact.pushname || contact.formattedNumber,
      pushname: contact.pushname,
      formattedNumber: contact.formattedNumber,
      isBlocked: contact.isBlocked,
      isGroup: contact.isGroup,
      isMe: contact.isMe,
      isWAContact: contact.isWAContact,
      profilePicUrl: null
    };

    // Tentar buscar foto do perfil
    try {
      const profilePic = await contact.getProfilePicUrl();
      contactInfo.profilePicUrl = profilePic;
      console.log(`✅ Foto do perfil encontrada para ${contactId}`);
    } catch (error) {
      console.log(`⚠️ Não foi possível obter foto do perfil para ${contactId}: ${error.message}`);
    }

    return contactInfo;
  } catch (error) {
    console.error(`❌ Erro ao buscar informações do contato ${contactId}:`, error);
    throw error;
  }
};

/**
 * Buscar mídias de um chat específico
 */
export const getChatMedia = async (sessionId, contactId, limit = 50) => {
  try {
    console.log(`🔍 Buscando mídias do chat ${contactId} na sessão ${sessionId}`);
    
    const session = getWhatsappJsSession(sessionId);
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada`);
    }

    const chat = await session.getChatById(contactId);
    if (!chat) {
      throw new Error(`Chat ${contactId} não encontrado`);
    }

    // Buscar mensagens do chat
    const messages = await chat.fetchMessages({ limit: limit * 2 }); // Buscar mais para filtrar

    // Filtrar apenas mensagens com mídia
    const mediaMessages = messages.filter(msg => 
      msg.hasMedia && (
        msg.type === 'image' || 
        msg.type === 'video' || 
        msg.type === 'audio' || 
        msg.type === 'document' ||
        msg.type === 'sticker'
      )
    ).slice(0, limit);

    const mediaInfo = [];
    
    for (const msg of mediaMessages) {
      try {
        const media = await msg.downloadMedia();
        mediaInfo.push({
          id: msg.id._serialized,
          type: msg.type,
          timestamp: msg.timestamp,
          mimetype: media.mimetype,
          filename: media.filename || `${msg.type}_${msg.timestamp}`,
          data: media.data, // Base64
          size: media.data ? Buffer.from(media.data, 'base64').length : 0,
          caption: msg.body || '',
          fromMe: msg.fromMe
        });
      } catch (error) {
        console.warn(`⚠️ Erro ao baixar mídia da mensagem ${msg.id._serialized}:`, error.message);
      }
    }

    console.log(`✅ ${mediaInfo.length} mídias encontradas para ${contactId}`);
    return mediaInfo;
  } catch (error) {
    console.error(`❌ Erro ao buscar mídias do chat ${contactId}:`, error);
    throw error;
  }
};
