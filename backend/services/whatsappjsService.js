import fs from "fs/promises";
import path from "path";
import qrCode from "qrcode-terminal";
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import { Session, Ticket, TicketMessage, Contact } from '../models/index.js';
import { emitToTicket, emitToAll } from './socket.js';
import { sessionQRs, sessionStatus } from './sessionState.js';

// Array global para armazenar sessões ativas
let sessions = [];

// Handlers globais para capturar erros não tratados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não tratado (uncaughtException):', error);
  console.error('Stack trace:', error.stack);
  // Não encerrar o processo, apenas logar
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promessa rejeitada não tratada (unhandledRejection):', reason);
  console.error('Stack trace:', reason?.stack || reason);
  // Não encerrar o processo, apenas logar
});

// Interface para sessão estendida
class SessionExtended extends Client {
  constructor(options) {
    super(options);
    this.id = null;
    this.sessionId = null;
  }
}

// Função para limpar arquivos de autenticação
const cleanupAuthFiles = async (sessionId, whatsappId) => {
  try {
    console.log(`🧹 Iniciando limpeza de arquivos de autenticação para sessão ${sessionId || whatsappId}`);

    const fs = await import('fs/promises');
    const path = await import('path');

    // Lista de diretórios/padrões a limpar
    const authPaths = [
      // WhatsApp Web.js
      path.resolve(process.cwd(), `.wwebjs_auth/session-bd_${sessionId || whatsappId}`),
      path.resolve(process.cwd(), `.wwebjs_cache/session-bd_${sessionId || whatsappId}`),
      path.resolve(process.cwd(), `backend/.wwebjs_auth/session-bd_${sessionId || whatsappId}`),
      path.resolve(process.cwd(), `backend/.wwebjs_cache/session-bd_${sessionId || whatsappId}`),

      // Baileys
      path.resolve(process.cwd(), `baileys_auth_${sessionId || whatsappId}`),
      path.resolve(process.cwd(), `backend/baileys_auth_${sessionId || whatsappId}`),
    ];

    // Também limpar padrões globais se sessionId específico não funcionar
    if (sessionId) {
      authPaths.push(
        path.resolve(process.cwd(), `.wwebjs_auth/session-bd_${sessionId}`),
        path.resolve(process.cwd(), `.wwebjs_cache/session-bd_${sessionId}`),
        path.resolve(process.cwd(), `backend/.wwebjs_auth/session-bd_${sessionId}`),
        path.resolve(process.cwd(), `backend/.wwebjs_cache/session-bd_${sessionId}`),
        path.resolve(process.cwd(), `baileys_auth_${sessionId}`),
        path.resolve(process.cwd(), `backend/baileys_auth_${sessionId}`),
      );
    }

    let cleanedCount = 0;

    for (const authPath of authPaths) {
      try {
        // Verificar se o caminho existe
        await fs.access(authPath);

        // Se existir, remover recursivamente
        await fs.rm(authPath, { recursive: true, force: true });
        console.log(`✅ Arquivo/pasta removido: ${authPath}`);
        cleanedCount++;
      } catch (error) {
        // Se não existir, apenas continuar silenciosamente
        if (error.code !== 'ENOENT') {
          console.warn(`⚠️ Erro ao remover ${authPath}:`, error.message);
        }
      }
    }

    // Também tentar limpar padrões com curinga (baileys_auth_*)
    try {
      const { glob } = await import('glob');

      const patterns = [
        path.resolve(process.cwd(), `baileys_auth_${sessionId || whatsappId}*`),
        path.resolve(process.cwd(), `backend/baileys_auth_${sessionId || whatsappId}*`),
        path.resolve(process.cwd(), `.wwebjs_auth/session-bd_${sessionId || whatsappId}*`),
        path.resolve(process.cwd(), `.wwebjs_cache/session-bd_${sessionId || whatsappId}*`),
        path.resolve(process.cwd(), `backend/.wwebjs_auth/session-bd_${sessionId || whatsappId}*`),
        path.resolve(process.cwd(), `backend/.wwebjs_cache/session-bd_${sessionId || whatsappId}*`),
      ];

      for (const pattern of patterns) {
        const matches = await glob(pattern);
        for (const match of matches) {
          try {
            await fs.rm(match, { recursive: true, force: true });
            console.log(`✅ Arquivo/pasta removido (padrão): ${match}`);
            cleanedCount++;
          } catch (error) {
            console.warn(`⚠️ Erro ao remover ${match}:`, error.message);
          }
        }
      }
    } catch (globError) {
      console.warn(`⚠️ Erro ao usar glob para limpeza:`, globError.message);
    }

    console.log(`🧹 Limpeza concluída: ${cleanedCount} arquivos/pastas removidos para sessão ${sessionId || whatsappId}`);
    return cleanedCount;
  } catch (error) {
    console.error(`❌ Erro geral na limpeza de arquivos:`, error);
    return 0;
  }
};

// Função segura para destruir sessões WhatsApp com tratamento de erro EBUSY
const safeDestroySession = async (client, sessionId, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🗑️ Tentativa ${attempt}/${maxRetries} de destruir sessão ${sessionId}`);

      // Primeiro tentar logout se disponível
      if (client.logout && typeof client.logout === 'function') {
        try {
          await client.logout();
          console.log(`✅ Logout realizado para sessão ${sessionId}`);
        } catch (logoutError) {
          console.warn(`⚠️ Logout falhou para sessão ${sessionId}:`, logoutError.message);
          // Continue mesmo se logout falhar
        }
      }

      // Aguardar um pouco para o Chrome fechar completamente
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Tentar destroy
      await client.destroy();
      console.log(`✅ Sessão ${sessionId} destruída com sucesso`);

      // Limpar arquivos de autenticação após destruir a sessão
      const cleanedCount = await cleanupAuthFiles(sessionId, client.id);
      console.log(`🧹 Arquivos de autenticação limpos: ${cleanedCount} itens removidos`);

      return true;
    } catch (error) {
      console.error(`❌ Erro na tentativa ${attempt} de destruir sessão ${sessionId}:`, error.message);

      // Verificar se é erro de contexto destruído
      if (error.message && error.message.includes('Execution context was destroyed')) {
        console.log(`🚨 Contexto já destruído para sessão ${sessionId}, considerando como destruída`);
        // Mesmo com erro, tentar limpar arquivos
        const cleanedCount = await cleanupAuthFiles(sessionId, client.id);
        console.log(`🧹 Arquivos de autenticação limpos (mesmo com erro): ${cleanedCount} itens removidos`);
        return true;
      }

      if (attempt === maxRetries) {
        console.error(`💥 Falhou após ${maxRetries} tentativas de destruir sessão ${sessionId}`);
        // Mesmo falhando, tentar forçar limpeza dos arquivos
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const sessionPath = path.resolve(process.cwd(), `.wwebjs_auth/session-bd_${client.id || sessionId}`);
          await fs.rm(sessionPath, { recursive: true, force: true });
          console.log(`🧹 Arquivos da sessão ${sessionId} removidos forçadamente`);

          // Limpeza adicional com nossa função
          const cleanedCount = await cleanupAuthFiles(sessionId, client.id);
          console.log(`🧹 Limpeza adicional concluída: ${cleanedCount} itens removidos`);
        } catch (cleanupError) {
          console.error(`❌ Falha ao limpar arquivos da sessão ${sessionId}:`, cleanupError.message);
        }
        return false;
      }

      // Aguardar progressivamente mais tempo entre tentativas
      const delay = attempt * 4000;
      console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
};// Função para verificar saúde das sessões
const checkSessionHealth = async (wbot, sessionId) => {
  try {
    console.log(`🏥 Verificando saúde da sessão ${sessionId}`);

    // Tentar uma operação simples para verificar se a sessão está funcional
    const chats = await wbot.getChats();
    console.log(`✅ Sessão ${sessionId} saudável - ${chats.length} chats carregados`);
    return true;
  } catch (error) {
    console.error(`❌ Sessão ${sessionId} com problemas de saúde:`, error.message);

    // Verificar se é erro crítico
    if (error.message && error.message.includes('Execution context was destroyed')) {
      console.error(`🚨 Sessão ${sessionId} corrompida - Execution context was destroyed`);
      return false;
    }

    // Para outros erros, pode ser temporário
    console.warn(`⚠️ Sessão ${sessionId} com erro não crítico, mantendo ativa`);
    return true;
  }
};

// Função para sincronizar mensagens não lidas
const syncUnreadMessages = async (wbot) => {
  try {
    console.log(`🔄 Sincronizando mensagens não lidas para sessão: ${wbot.sessionId}`);
    
    // Verificar se wbot.sessionId está definido
    if (!wbot.sessionId) {
      console.error(`❌ wbot.sessionId indefinido em syncUnreadMessages! Tentando alternativas...`);
      
      // Tentar usar wbot.id como sessionId
      if (wbot.id) {
        wbot.sessionId = wbot.id.toString();
        console.log(`🔧 Usando wbot.id como sessionId: ${wbot.sessionId}`);
      }
      
      // Tentar usar o wid do WhatsApp
      if (!wbot.sessionId && wbot.info && wbot.info.wid) {
        const whatsappId = wbot.info.wid._serialized.split('@')[0];
        wbot.sessionId = whatsappId;
        console.log(`🔧 Usando wid como sessionId: ${whatsappId}`);
      }
      
      if (!wbot.sessionId) {
        console.error(`❌ Não foi possível determinar sessionId em syncUnreadMessages`);
        return;
      }
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
    console.log(`[DEBUG] Iniciando handleMessage para mensagem:`, {
      from: msg.from,
      body: msg.body?.substring(0, 100),
      type: msg.type,
      timestamp: msg.timestamp,
      hasMedia: msg.hasMedia
    });

    if (msg.from === 'status@broadcast') {
      console.log('[DEBUG] Ignorando mensagem de status@broadcast');
      return;
    }

    console.log(`📨 Nova mensagem WhatsApp.js de ${msg.from}: ${msg.body}`);
    console.log(`🔍 Dados do wbot:`, {
      sessionId: wbot.sessionId,
      id: wbot.id,
      hasSessionId: !!wbot.sessionId
    });
    
    // Verificar se wbot.sessionId está definido
    if (!wbot.sessionId) {
      console.error(`❌ wbot.sessionId está indefinido! Tentando alternativas...`);
      
      // Tentar usar wbot.id como sessionId
      if (wbot.id) {
        wbot.sessionId = wbot.id.toString();
        console.log(`🔧 Usando wbot.id como sessionId: ${wbot.sessionId}`);
      }
      
      // Tentar usar o wid do WhatsApp
      if (!wbot.sessionId && wbot.info && wbot.info.wid) {
        const whatsappId = wbot.info.wid._serialized.split('@')[0];
        wbot.sessionId = whatsappId;
        console.log(`🔧 Usando wid como sessionId: ${whatsappId}`);
      }
      
      // Se ainda não conseguiu, tentar continuar sem sessionId
      if (!wbot.sessionId) {
        console.error(`❌ Não foi possível determinar sessionId, pulando processamento`);
        return;
      }
    }
    
    // Buscar a sessão no banco de dados usando o whatsappId
    console.log(`🔍 Buscando sessão no banco com whatsappId: ${wbot.sessionId}`);
    let session = await Session.findOne({
      where: { whatsappId: wbot.sessionId }
    });

    console.log(`[DEBUG] Resultado da busca por whatsappId:`, session ? {
      id: session.id,
      whatsappId: session.whatsappId,
      name: session.name,
      status: session.status
    } : 'Nenhuma sessão encontrada');

    // Se não encontrou pela primeira tentativa, tentar buscar pelo ID da sessão
    if (!session && wbot.id) {
      console.log(`🔍 Tentando buscar sessão pelo ID: ${wbot.id}`);
      session = await Session.findOne({
        where: { id: wbot.id }
      });
      console.log(`[DEBUG] Resultado da busca por ID:`, session ? {
        id: session.id,
        whatsappId: session.whatsappId,
        name: session.name,
        status: session.status
      } : 'Nenhuma sessão encontrada');
    }

    // Se ainda não encontrou, tentar buscar pelo número do WhatsApp
    if (!session && wbot.info && wbot.info.wid) {
      const whatsappNumber = wbot.info.wid._serialized.split('@')[0];
      console.log(`🔍 Tentando buscar sessão pelo número: ${whatsappNumber}`);
      session = await Session.findOne({
        where: { whatsappId: whatsappNumber }
      });
      console.log(`[DEBUG] Resultado da busca por número:`, session ? {
        id: session.id,
        whatsappId: session.whatsappId,
        name: session.name,
        status: session.status
      } : 'Nenhuma sessão encontrada');
    }
    
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
        contactId: contact ? contact.id : null,
        lastMessage: msg.body || '',
        unreadCount: 1,
        status: 'open',
        chatStatus: 'waiting' // Iniciar como aguardando
      });
      console.log(`🎫 Novo ticket criado: #${ticket.id} para ${msg.from} na sessão ${wbot.sessionId} (ID: ${session.id}) com contato ${contact?.id || 'N/A'}`);

      // Atribuir automaticamente à fila da sessão
      try {
        const { Queue } = await import('../models/index.js');
        const queue = await Queue.findOne({
          where: {
            sessionId: session.id,
            isActive: true
          }
        });

        if (queue) {
          await ticket.update({
            queueId: queue.id,
            status: 'open'
          });
          console.log(`✅ Ticket #${ticket.id} atribuído automaticamente à fila "${queue.name}"`);
        } else {
          console.log(`ℹ️ Nenhuma fila ativa encontrada para a sessão ${session.id}`);
        }
      } catch (queueError) {
        console.error(`❌ Erro ao atribuir fila automaticamente:`, queueError);
      }
      // Emitir notificação para frontend (desktop/mobile)
      try {
        const payload = {
          title: 'Nova mensagem',
          body: contact?.name ? `${contact.name}: ${msg.body}` : `${msg.from}: ${msg.body}`,
          ticketId: ticket.id,
          contact: msg.from,
          iconUrl: contact?.profilePicUrl || null
        };
        emitToAll('notification', payload);
        try {
          const push = await import('./push.js');
          if (push && push.broadcastPush) await push.broadcastPush(payload);
        } catch (pushErr) {
          console.warn('⚠️ Push broadcast failed (new ticket):', pushErr);
        }
      } catch (notifyErr) {
        console.error('❌ Falha ao emitir notificação via socket:', notifyErr);
      }
    } else {
      // Atualizar ticket existente e vincular ao contato se não estiver vinculado
      ticket.lastMessage = msg.body || '';
      ticket.unreadCount += 1;
      ticket.updatedAt = new Date();
      
      if (!ticket.contactId && contact) {
        ticket.contactId = contact.id;
        console.log(`🔗 Ticket #${ticket.id} vinculado ao contato ${contact.id}`);
      }
      
      // Reabrir ticket se estiver fechado ou resolvido
      const wasResolvedOrClosed = (ticket.status === 'closed' || ticket.chatStatus === 'resolved');
      if (wasResolvedOrClosed) {
        const prevStatus = { status: ticket.status, chatStatus: ticket.chatStatus };
        ticket.status = 'open';
        ticket.chatStatus = 'waiting'; // Reabrir como aguardando
        console.log(`🔄 Ticket #${ticket.id} reaberto por nova mensagem (status anterior: ${prevStatus.status}/${prevStatus.chatStatus})`);
        // Emitir notificação também para reabertura
        try {
          const payload = {
            title: 'Novo contato',
            body: contact?.name ? `${contact.name}: ${msg.body}` : `${msg.from}: ${msg.body}`,
            ticketId: ticket.id,
            contact: msg.from,
            iconUrl: contact?.profilePicUrl || null
          };
          emitToAll('notification', payload);
          try {
            const push = await import('./push.js');
            if (push && push.broadcastPush) await push.broadcastPush(payload);
          } catch (pushErr) {
            console.warn('⚠️ Push broadcast failed (reopen):', pushErr);
          }
        } catch (notifyErr) {
          console.error('❌ Falha ao emitir notificação via socket (reopen):', notifyErr);
        }
      }
      await ticket.save();
    }
    
    // Verificar se é mensagem de grupo e obter informações do participante
    let groupInfo = {
      isFromGroup: false,
      groupName: null,
      participantName: null,
      participantId: null
    };

    // Verificar se é resposta de botão interativo
    let buttonResponse = null;
    if (msg.type === 'buttons_response') {
      buttonResponse = {
        buttonId: msg.selectedButtonId,
        buttonText: msg.selectedButtonText || msg.body
      };
      console.log(`🔘 Resposta de botão detectada:`, buttonResponse);
    } else if (msg.type === 'list_response') {
      buttonResponse = {
        listId: msg.selectedRowId,
        listText: msg.selectedRowTitle || msg.body,
        listDescription: msg.selectedRowDescription
      };
      console.log(`📋 Resposta de lista detectada:`, buttonResponse);
    }

    if (contact && contact.isGroup && msg.author) {
      groupInfo.isFromGroup = true;
      groupInfo.participantId = msg.author;
      
      try {
        // Obter informações do grupo
        const groupContact = await wbot.getContactById(msg.from);
        if (groupContact && groupContact.name) {
          groupInfo.groupName = groupContact.name;
        }
        
        // Obter informações do participante que enviou a mensagem
        const participantContact = await wbot.getContactById(msg.author);
        if (participantContact) {
          groupInfo.participantName = participantContact.name || participantContact.pushname || msg.author.split('@')[0];
        } else {
          // Fallback: usar o ID sem @c.us
          groupInfo.participantName = msg.author.split('@')[0];
        }
        
        console.log(`👥 Mensagem de grupo detectada:`, {
          groupName: groupInfo.groupName,
          participantName: groupInfo.participantName,
          participantId: groupInfo.participantId,
          groupId: msg.from
        });
      } catch (groupError) {
        console.warn(`⚠️ Erro ao obter informações do grupo:`, groupError.message);
        groupInfo.participantName = msg.author ? msg.author.split('@')[0] : 'Participante';
      }
    }

    // Salvar mensagem
    const messageData = {
      ticketId: ticket.id,
      sender: 'contact',
      content: msg.body || '',
      timestamp: new Date(),
      isFromGroup: groupInfo.isFromGroup,
      groupName: groupInfo.groupName,
      participantName: groupInfo.participantName,
      participantId: groupInfo.participantId
    };

    // Adicionar informações de resposta de botão se aplicável
    if (buttonResponse) {
      messageData.content = `[BOTÃO] ${buttonResponse.buttonText || buttonResponse.listText}`;
      if (buttonResponse.buttonId) {
        messageData.buttonId = buttonResponse.buttonId;
      }
      if (buttonResponse.listId) {
        messageData.listId = buttonResponse.listId;
      }
      if (buttonResponse.listDescription) {
        messageData.buttonDescription = buttonResponse.listDescription;
      }
    }

    const message = await TicketMessage.create(messageData);
    
    console.log(`💾 Mensagem salva no ticket #${ticket.id}`);
    
    // Emitir nova mensagem via WebSocket
    try {
      console.log(`🔄 Emitindo nova mensagem via WebSocket para ticket ${ticket.id}`);
      emitToTicket(ticket.id, 'new-message', message);
      emitToAll('message-update', { ticketId: ticket.id, message });
      
      // Também emitir atualização de tickets para refletir nova atividade
      const { Ticket: TicketModel, Contact, Queue, User } = await import('../models/index.js');
      const tickets = await TicketModel.findAll({
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

    // Processar regras da fila
    try {
      console.log(`🔧 Processando regras da fila para ticket #${ticket.id}`);
      if (ticket.queueId) {
        const { processQueueRules } = await import('./messageCallbacks.js');
        await processQueueRules(ticket, session.id, !ticket.assignedUserId);
        console.log(`✅ Regras da fila processadas com sucesso`);
      } else {
        console.log(`ℹ️ Ticket #${ticket.id} não tem fila atribuída, pulando processamento de regras`);
      }
    } catch (queueError) {
      console.error(`❌ Erro ao processar regras da fila:`, queueError);
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
      
      const sessionName = whatsapp.name || whatsapp.whatsappId;
      
      if (!sessionName) {
        console.error(`❌ sessionName não definido! whatsapp.name: ${whatsapp.name}, whatsapp.whatsappId: ${whatsapp.whatsappId}`);
        reject(new Error("Nome da sessão não definido"));
        return;
      }
      
      console.log(`🚀 Iniciando sessão WhatsApp.js para: ${sessionName}`);
      let sessionCfg;

      if (whatsapp && whatsapp.session) {
        sessionCfg = JSON.parse(whatsapp.session);
      }

      // Verificar se já existe uma sessão
      const existingSessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
      if (existingSessionIndex !== -1) {
        console.log(`Removendo sessão existente: ${whatsapp.id}`);
        await safeDestroySession(sessions[existingSessionIndex], whatsapp.id);
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
        try {
          console.log("📱 QR Code gerado para sessão:", sessionName);
          qrCode.generate(qr, { small: true });

          // Converter QR para base64 data URL
          const QRCode = await import('qrcode');
          const qrDataURL = await QRCode.toDataURL(qr);

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

          // Armazenar QR code para acesso via API
          const { sessionQRs, sessionStatus } = await import('./sessionState.js');
          sessionQRs.set(whatsapp.whatsappId, qrDataURL);
          sessionStatus.set(whatsapp.whatsappId, 'qr_ready');

          // Emitir evento via socket se disponível
          try {
            const { emitToAll } = await import('./socket.js');
            console.log(`📡 Emitindo session-qr-update para sessão ${whatsapp.id} com status 'qr_ready'`);
            emitToAll("session-qr-update", {
              sessionId: whatsapp.id,
              qrCode: qrDataURL,
              status: 'qr_ready'
            });
            console.log('✅ QR Code emitido via WebSocket');
          } catch (err) {
            console.log('Socket não disponível para emitir QR');
          }
        } catch (error) {
          console.error('❌ Erro ao processar QR code:', error);
        }
      });

      wbot.on("authenticated", async session => {
        console.log(`✅ Sessão ${sessionName} AUTENTICADA - Emitindo evento de autenticação`);
        
        try {
          const { emitToAll } = await import('./socket.js');
          console.log(`📡 Emitindo session-status-update para sessão ${whatsapp.id} com status 'authenticated'`);
          emitToAll("session-status-update", {
            sessionId: whatsapp.id,
            status: 'authenticated'
          });
          console.log('✅ Evento de autenticação emitido via WebSocket');
        } catch (err) {
          console.log('Socket não disponível para emitir autenticação');
        }
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
          emitToAll("session-qr-update", {
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
        try {
          console.log(`🟢 Sessão ${sessionName} PRONTA - Iniciando atualização do banco`);
          console.log(`🔍 wbot.sessionId antes de definir: ${wbot.sessionId}`);

          // Garantir que sessionId está definido
          wbot.sessionId = sessionName;
          console.log(`🔍 wbot.sessionId após definir: ${wbot.sessionId}`);

          await whatsapp.update({
            status: "CONNECTED",
            qrcode: "",
            retries: 0,
            number: wbot.info.wid._serialized.split("@")[0],
            whatsappId: wbot.info.wid._serialized.split("@")[0] // Atualizar whatsappId com o número real
          });

          // Atualizar sessionId na sessão ativa para manter consistência
          wbot.sessionId = wbot.info.wid._serialized.split("@")[0];
          console.log(`🔄 SessionId atualizado na memória: ${wbot.sessionId}`);

          console.log(`🟢 Sessão ${sessionName} - Status atualizado no banco: CONNECTED`);

          // Atualizar status para acesso via API
          const { sessionStatus, sessionQRs } = await import('./sessionState.js');
          sessionStatus.set(whatsapp.whatsappId, 'connected');
          sessionQRs.delete(whatsapp.whatsappId); // Limpar QR code quando conectado

          try {
            const { emitToAll } = await import('./socket.js');

            console.log(`📡 Emitindo session-status-update para sessão ${whatsapp.id} com status 'connected'`);
            emitToAll("session-status-update", {
              sessionId: whatsapp.id,
              status: 'connected'
            });

            console.log(`📡 Emitindo session-qr-update para sessão ${whatsapp.id} com status 'connected'`);
            emitToAll("session-qr-update", {
              sessionId: whatsapp.id,
              qrCode: '',
              status: 'connected'
            });

            console.log('✅ Ambos os eventos de status conectado emitidos via WebSocket');
          } catch (err) {
            console.log('Socket não disponível para emitir status conectado');
          }

          // Adicionar à lista se não existir
          const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
          if (sessionIndex === -1) {
            sessions.push(wbot);
          }

          wbot.sendPresenceAvailable();
          await syncUnreadMessages(wbot);

          resolve(wbot);
        } catch (error) {
          console.error('❌ Erro no evento ready:', error);
          reject(error);
        }
      });

      wbot.on("disconnected", async (reason) => {
        try {
          console.log(`🔴 Sessão ${sessionName} desconectada:`, reason);
          console.log(`[DEBUG] Tipo de desconexão:`, typeof reason);

          // Identificar o tipo de desconexão
          const isLogout = reason === 'LOGOUT';
          const isTimeout = reason === 'TIMEOUT';
          const isNetworkError = reason && reason.includes('Network');

          console.log(`[DEBUG] Análise da desconexão:`, {
            isLogout,
            isTimeout,
            isNetworkError,
            reason: reason
          });

          await whatsapp.update({
            status: "DISCONNECTED"
          });

          // Remover da lista de sessões
          const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
          if (sessionIndex !== -1) {
            sessions.splice(sessionIndex, 1);
          }

          // Limpar arquivos de autenticação automaticamente
          const cleanedCount = await cleanupAuthFiles(whatsapp.id, whatsapp.whatsappId);
          console.log(`🧹 Arquivos de autenticação limpos automaticamente: ${cleanedCount} itens`);

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

          // Se foi logout forçado, não tentar reconectar automaticamente
          if (isLogout) {
            console.log(`🚫 Logout detectado para sessão ${sessionName}, não reconectando automaticamente`);
            reject(new Error(`Sessão desconectada por logout: ${reason}`));
            return;
          }

          // Para outros tipos de desconexão, podemos tentar reconectar
          console.log(`🔄 Desconexão não forçada detectada (${reason}), mantendo possibilidade de reconexão`);

          reject(new Error(`Sessão desconectada: ${reason}`));
        } catch (error) {
          console.error('❌ Erro no evento disconnected:', error);
          reject(error);
        }
      });      wbot.on("message", async msg => {
        try {
          console.log(`📨 [DEBUG] Evento message disparado - Raw message:`, JSON.stringify({
            from: msg.from,
            to: msg.to,
            body: msg.body,
            type: msg.type,
            timestamp: msg.timestamp,
            hasMedia: msg.hasMedia,
            fromMe: msg.fromMe,
            author: msg.author,
            deviceType: msg.deviceType,
            isForwarded: msg.isForwarded,
            isStatus: msg.isStatus,
            isStarred: msg.isStarred,
            quotedMsg: msg.quotedMsg ? {
              from: msg.quotedMsg.from,
              body: msg.quotedMsg.body,
              type: msg.quotedMsg.type
            } : null
          }, null, 2));

          await handleMessage(msg, wbot);
        } catch (error) {
          console.error('❌ Erro ao processar mensagem WhatsApp.js:', error);

          // Verificar se é erro de contexto destruído
          if (error.message && error.message.includes('Execution context was destroyed')) {
            console.error('🚨 Erro crítico: Execution context was destroyed. Sessão provavelmente corrompida.');

            // Tentar marcar a sessão como desconectada
            try {
              await whatsapp.update({ status: "DISCONNECTED" });
              console.log('✅ Status da sessão atualizado para DISCONNECTED devido a erro crítico');
            } catch (updateError) {
              console.error('❌ Falha ao atualizar status da sessão:', updateError);
            }

            // Remover da lista de sessões ativas
            const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
            if (sessionIndex !== -1) {
              sessions.splice(sessionIndex, 1);
              console.log('🗑️ Sessão removida da lista devido a erro crítico');
            }
          }

          console.error('❌ Stack trace:', error.stack);
          // Não lançar erro para não quebrar o fluxo
        }
      });

    } catch (err) {
      console.error('Erro ao inicializar sessão WhatsApp.js:', err);
      console.error('Stack trace completo:', err.stack);
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
export const removeWbot = async (whatsappId) => {
  try {
    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex !== -1) {
      // Destruir a sessão (que já inclui limpeza de arquivos)
      await safeDestroySession(sessions[sessionIndex], whatsappId);
      sessions.splice(sessionIndex, 1);
      console.log(`🗑️ Sessão WhatsApp.js ${whatsappId} removida`);
    } else {
      // Mesmo se não estiver na lista, tentar limpar arquivos
      console.log(`⚠️ Sessão ${whatsappId} não encontrada na lista, limpando arquivos apenas`);
      await cleanupAuthFiles(whatsappId, whatsappId);
    }
  } catch (err) {
    console.error('Erro ao remover sessão WhatsApp.js:', err);
    // Mesmo com erro, tentar limpar arquivos
    try {
      await cleanupAuthFiles(whatsappId, whatsappId);
    } catch (cleanupErr) {
      console.error('Erro ao limpar arquivos na remoção:', cleanupErr);
    }
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
    
    await safeDestroySession(sessions[sessionIndex], whatsappId);
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
    // Mesmo sem sessão ativa, tentar limpar arquivos
    const cleanedCount = await cleanupAuthFiles(whatsappIDNumber, whatsappIDNumber);
    console.log(`🧹 Arquivos limpos para sessão inexistente: ${cleanedCount} itens`);
    throw new Error("Sessão WhatsApp não inicializada.");
  }

  try {
    console.log(`🔌 Desligando sessão WhatsApp ID: ${whatsappIDNumber}`);
    await safeDestroySession(sessions[sessionIndex], whatsappIDNumber);
    console.log(`✅ Sessão ${whatsappIDNumber} desligada com sucesso.`);

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
    // Mesmo com erro, tentar limpar arquivos
    try {
      const cleanedCount = await cleanupAuthFiles(whatsappIDNumber, whatsappIDNumber);
      console.log(`🧹 Arquivos limpos após erro: ${cleanedCount} itens`);
    } catch (cleanupErr) {
      console.error('Erro ao limpar arquivos no shutdown:', cleanupErr);
    }
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
      await safeDestroySession(sessions[existingSessionIndex], sessionId);
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
        
        // Garantir que sessionId está definido (pode ser chamado antes do ready)
        if (!wbot.sessionId) {
          console.log(`⚠️ wbot.sessionId não definido, definindo como: ${sessionName}`);
          wbot.sessionId = sessionName;
        }
        
        // Se ainda não tiver sessionId, usar o id do wbot como fallback
        if (!wbot.sessionId && wbot.id) {
          console.log(`🔧 Usando wbot.id como sessionId: ${wbot.id}`);
          wbot.sessionId = wbot.id.toString();
        }
        
        // Se ainda não tiver, tentar buscar pelo whatsappId
        if (!wbot.sessionId) {
          console.log(`🔍 Tentando encontrar sessionId pelo wbot.info.wid...`);
          if (wbot.info && wbot.info.wid) {
            const whatsappId = wbot.info.wid._serialized.split('@')[0];
            wbot.sessionId = whatsappId;
            console.log(`🔧 sessionId definido pelo wid: ${whatsappId}`);
          }
        }
        
        // Verificar se sessionId está definido
        if (!wbot.sessionId) {
          console.error(`❌ wbot.sessionId indefinido no evento message! Tentando continuar...`);
          // Não retornar, tentar processar mesmo assim
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
export const getWhatsappJsSession = async (sessionId) => {
  console.log(`🔍 Procurando sessão WhatsApp.js: "${sessionId}"`);
  console.log(`📊 Total de sessões ativas: ${sessions.length}`);

  // Primeiro, buscar a sessão no banco de dados para obter o whatsappId
  let dbSession = null;
  try {
    const { Session } = await import('../models/index.js');
    
    // Se sessionId parece ser um whatsappId (muito grande), buscar por whatsappId
    if (sessionId && sessionId.toString().length > 10) {
      dbSession = await Session.findOne({ where: { whatsappId: sessionId } });
      console.log(`🗄️ Busca por whatsappId "${sessionId}":`, dbSession ? {
        id: dbSession.id,
        whatsappId: dbSession.whatsappId,
        name: dbSession.name
      } : 'Não encontrada');
    } else {
      // Caso contrário, buscar por ID
      dbSession = await Session.findByPk(sessionId);
      console.log(`🗄️ Busca por ID "${sessionId}":`, dbSession ? {
        id: dbSession.id,
        whatsappId: dbSession.whatsappId,
        name: dbSession.name
      } : 'Não encontrada');
    }
  } catch (error) {
    console.warn(`⚠️ Erro ao buscar sessão no banco:`, error.message);
  }

  // Log de todas as sessões ativas para debug
  sessions.forEach((s, index) => {
    console.log(`   [${index}] sessionId: "${s.sessionId}", id: ${s.id}`);
  });

  // Buscar por sessionId direto primeiro
  let sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
  
  // Se não encontrou e temos o whatsappId do banco, buscar por ele
  if (sessionIndex === -1 && dbSession?.whatsappId) {
    console.log(`🔍 Tentando buscar por whatsappId: "${dbSession.whatsappId}"`);
    sessionIndex = sessions.findIndex(s => s.sessionId === dbSession.whatsappId);
  }

  // Se ainda não encontrou, tentar buscar por ID numérico convertido para string
  if (sessionIndex === -1 && dbSession?.id) {
    console.log(`🔍 Tentando buscar por ID do banco convertido: "${dbSession.id}"`);
    sessionIndex = sessions.findIndex(s => s.sessionId === dbSession.id.toString());
  }

  console.log(`🔍 Índice encontrado: ${sessionIndex}`);

  if (sessionIndex === -1) {
    console.error(`❌ Sessão WhatsApp.js não encontrada para ID: "${sessionId}"`);
    console.error(`   Sessões disponíveis:`, sessions.map(s => ({ sessionId: s.sessionId, id: s.id })));
    
    // Retornar null em vez de lançar erro para evitar crashes
    return null;
  }

  const session = sessions[sessionIndex];
  console.log(`✅ Sessão encontrada: "${session.sessionId}"`);

  return session;
};

/**
 * Enviar texto por sessionId
 */
export const sendText = async (sessionId, to, text) => {
  console.log(`🔍 Buscando sessão WhatsApp-Web.js: "${sessionId}"`);

  const client = await getWhatsappJsSession(sessionId);
  if (!client) {
    console.error(`❌ Sessão "${sessionId}" não encontrada no WhatsApp-Web.js`);
    throw new Error(`Sessão "${sessionId}" não encontrada ou não está ativa`);
  }

  console.log(`✅ Sessão "${sessionId}" encontrada, enviando mensagem...`);

  // Verificar se o cliente está pronto e conectado
  try {
    const state = await client.getState();
    if (state !== 'CONNECTED') {
      console.error(`❌ Cliente WhatsApp não está conectado (estado: ${state})`);
      throw new Error(`Cliente WhatsApp não está conectado para sessão "${sessionId}"`);
    }
  } catch (stateError) {
    console.warn(`⚠️ Não foi possível verificar estado da sessão, tentando enviar mesmo assim`);
  }

  const result = await client.sendMessage(to, text);  // Após enviar, tentar atualizar informações do contato
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
  // Se áudio, enviar como mensagem de voz (sem título/caption) para parecer gravado
  if (mimetype?.startsWith('audio/')) {
    return client.sendMessage(to, media, { sendAudioAsVoice: true });
  }
  return client.sendMessage(to, media);
};

/**
 * Limpar arquivos de autenticação manualmente
 */
export const cleanupSessionFiles = async (sessionId, whatsappId) => {
  console.log(`🧹 Solicitação manual de limpeza para sessão ${sessionId || whatsappId}`);
  return await cleanupAuthFiles(sessionId, whatsappId);
};

/**
 * Remover uma sessão por sessionId
 */
export const removeWhatsappJsSession = async (sessionId) => {
  try {
    const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
    if (sessionIndex !== -1) {
      await safeDestroySession(sessions[sessionIndex], sessionId);
      sessions.splice(sessionIndex, 1);
      console.log(`Sessão WhatsApp.js removida: ${sessionId}`);
    } else {
      // Mesmo se não estiver na lista, tentar limpar arquivos
      console.log(`⚠️ Sessão ${sessionId} não encontrada na lista, limpando arquivos apenas`);
      await cleanupAuthFiles(sessionId, sessionId);
    }
  } catch (error) {
    console.error(`Erro ao remover sessão ${sessionId}:`, error);
    // Mesmo com erro, tentar limpar arquivos
    try {
      await cleanupAuthFiles(sessionId, sessionId);
    } catch (cleanupErr) {
      console.error('Erro ao limpar arquivos na remoção:', cleanupErr);
    }
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
      // Mesmo sem sessão ativa, tentar limpar arquivos
      const cleanedCount = await cleanupAuthFiles(sessionId, sessionId);
      console.log(`🧹 Arquivos limpos para sessão inexistente: ${cleanedCount} itens`);
      return;
    }

    // Destruir a sessão (que já inclui limpeza)
    await safeDestroySession(sessions[sessionIndex], sessionId);
    sessions.splice(sessionIndex, 1);

    console.log(`Sessão ${sessionId} desligada com sucesso`);
  } catch (error) {
    console.error(`Erro ao desligar sessão ${sessionId}:`, error);
    // Mesmo com erro, tentar limpar arquivos
    try {
      const cleanedCount = await cleanupAuthFiles(sessionId, sessionId);
      console.log(`🧹 Arquivos limpos após erro: ${cleanedCount} itens`);
    } catch (cleanupErr) {
      console.error('Erro ao limpar arquivos no shutdown:', cleanupErr);
    }
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
      await safeDestroySession(client, sessionId);
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

/**
 * Enviar mensagem com botões interativos
 */
export const sendButtons = async (sessionId, to, text, buttons, title = null, footer = null) => {
  try {
    console.log(`📤 Enviando botões via WhatsApp.js para ${to} na sessão ${sessionId}`);
    
    const session = await getWhatsappJsSession(sessionId);
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada ou não está ativa`);
    }

    // Verificar se a sessão está conectada através do estado do cliente
    try {
      const state = await session.getState();
      if (state !== 'CONNECTED') {
        throw new Error(`Sessão ${sessionId} não está conectada (estado: ${state})`);
      }
    } catch (stateError) {
      console.warn(`⚠️ Não foi possível verificar estado da sessão, tentando enviar mesmo assim`);
    }

    // Formatar botões para o WhatsApp Web.js
    const formattedButtons = buttons.map((button, index) => ({
      buttonId: button.id || `btn_${index}`,
      buttonText: {
        displayText: button.text || button.displayText
      },
      type: 1
    }));

    // Criar a mensagem com botões
    const buttonMessage = {
      text: text,
      buttons: formattedButtons,
      headerType: 1
    };

    // Adicionar título se fornecido
    if (title) {
      buttonMessage.title = title;
    }

    // Adicionar rodapé se fornecido
    if (footer) {
      buttonMessage.footer = footer;
    }

    console.log(`📋 Estrutura dos botões:`, JSON.stringify(buttonMessage, null, 2));

    // Enviar a mensagem
    const message = await session.sendMessage(to, buttonMessage);
    
    console.log(`✅ Botões enviados com sucesso para ${to}`);
    console.log(`📋 Resposta do WhatsApp:`, message);
    
    return {
      success: true,
      messageId: message?.id?._serialized || message?.key?.id || 'unknown',
      data: message
    };
    
  } catch (error) {
    console.error(`❌ Erro ao enviar botões para ${to}:`, error);
    throw error;
  }
};

/**
 * Enviar lista interativa (Menu)
 */
export const sendList = async (sessionId, to, text, buttonText, sections, title = null, footer = null) => {
  try {
    console.log(`📤 Enviando lista interativa via WhatsApp.js para ${to} na sessão ${sessionId}`);
    
    const session = await getWhatsappJsSession(sessionId);
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada ou não está ativa`);
    }

    // Verificar se a sessão está conectada através do estado do cliente
    try {
      const state = await session.getState();
      if (state !== 'CONNECTED') {
        throw new Error(`Sessão ${sessionId} não está conectada (estado: ${state})`);
      }
    } catch (stateError) {
      console.warn(`⚠️ Não foi possível verificar estado da sessão, tentando enviar mesmo assim`);
    }

    // Formatar seções para o WhatsApp Web.js
    const formattedSections = sections.map(section => ({
      title: section.title,
      rows: section.rows.map((row, index) => ({
        rowId: row.id || `row_${index}`,
        title: row.title,
        description: row.description || ''
      }))
    }));

    // Criar a mensagem com lista
    const listMessage = {
      text: text,
      buttonText: buttonText,
      sections: formattedSections,
      listType: 1
    };

    // Adicionar título se fornecido
    if (title) {
      listMessage.title = title;
    }

    // Adicionar rodapé se fornecido
    if (footer) {
      listMessage.footer = footer;
    }

    console.log(`📋 Estrutura da lista:`, JSON.stringify(listMessage, null, 2));

    // Enviar a mensagem
    const message = await session.sendMessage(to, listMessage);
    
    console.log(`✅ Lista enviada com sucesso para ${to}`);
    console.log(`📋 Resposta do WhatsApp:`, message);
    
    return {
      success: true,
      messageId: message?.id?._serialized || message?.key?.id || 'unknown',
      data: message
    };
    
  } catch (error) {
    console.error(`❌ Erro ao enviar lista para ${to}:`, error);
    throw error;
  }
};

/**
 * Enviar enquete (Poll) - Alternativa aos botões
 */
export const sendPoll = async (sessionId, to, question, options, optionsConfig = {}) => {
  try {
    console.log(`📊 Enviando enquete via WhatsApp.js para ${to} na sessão ${sessionId}`);
    
    const session = await getWhatsappJsSession(sessionId);
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada ou não está ativa`);
    }

    // Verificar se a sessão está conectada
    try {
      const state = await session.getState();
      if (state !== 'CONNECTED') {
        throw new Error(`Sessão ${sessionId} não está conectada (estado: ${state})`);
      }
    } catch (stateError) {
      console.warn(`⚠️ Não foi possível verificar estado da sessão, tentando enviar mesmo assim`);
    }

    // Configurações padrão para a enquete
    const pollConfig = {
      messageSecret: optionsConfig.messageSecret || undefined,
      options: optionsConfig.options || undefined,
      allowMultipleAnswers: optionsConfig.allowMultipleAnswers || false,
      ...optionsConfig
    };

    console.log(`📋 Estrutura da enquete:`, {
      question,
      options,
      pollConfig
    });

    // Enviar a enquete usando Poll do whatsapp-web.js
    const poll = new pkg.Poll(question, options, pollConfig);
    const message = await session.sendMessage(to, poll);

    console.log(`✅ Enquete enviada com sucesso para ${to}`);
    console.log(`📋 Resposta do WhatsApp:`, message);

    return {
      success: true,
      messageId: message?.id?._serialized || message?.key?.id || 'unknown',
      data: message
    };

  } catch (error) {
    console.error(`❌ Erro ao enviar enquete para ${to}:`, error);
    throw error;
  }
};
