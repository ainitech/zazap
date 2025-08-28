import { Op } from 'sequelize';
import { emitToAll } from './socket.js';
import { sendText as sendTextWhatsappJs } from './whatsappjsService.js';
import { sendText as sendTextBaileys } from './baileysService.js';
import { getWhatsappJsSession } from './whatsappjsService.js';
import { getBaileysSession } from './baileysService.js';
import { Session, Ticket, Queue, User, TicketMessage, Contact } from '../models/index.js';

// Função para detectar se uma mensagem pode ser resposta de enquete
const detectPollResponse = async (messageBody, ticketId) => {
  try {
    // Buscar enquetes recentes no ticket (últimas 24 horas)
    const recentPolls = await TicketMessage.findAll({
      where: {
        ticketId,
        messageType: 'poll',
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    if (recentPolls.length === 0) {
      return null; // Nenhuma enquete recente encontrada
    }

    // Verificar se a mensagem corresponde a uma opção de enquete
    for (const poll of recentPolls) {
      try {
        const pollData = JSON.parse(poll.pollData || poll.content);
        if (pollData.options && Array.isArray(pollData.options)) {
          // Verificar se a mensagem é um número correspondente a uma opção
          const optionIndex = parseInt(messageBody.trim()) - 1; // Converter para 0-based
          if (!isNaN(optionIndex) && optionIndex >= 0 && optionIndex < pollData.options.length) {
            return {
              pollMessageId: poll.messageId,
              selectedOption: optionIndex,
              pollData: pollData
            };
          }

          // Verificar se a mensagem contém exatamente o texto de uma opção
          const exactMatchIndex = pollData.options.findIndex(option =>
            option.toLowerCase().trim() === messageBody.toLowerCase().trim()
          );
          if (exactMatchIndex !== -1) {
            return {
              pollMessageId: poll.messageId,
              selectedOption: exactMatchIndex,
              pollData: pollData
            };
          }
        }
      } catch (error) {
        console.log(`⚠️ Erro ao processar enquete ${poll.id}:`, error.message);
      }
    }

    return null; // Não é resposta de enquete
  } catch (error) {
    console.error('❌ Erro ao detectar resposta de enquete:', error);
    return null;
  }
};

// Função para auto-atribuir ticket para fila baseado na configuração da sessão
const autoAssignTicketToQueue = async (ticket, sessionId) => {
  try {
    // Buscar a sessão
    const session = await Session.findByPk(sessionId);
    if (!session) return false;

    // Verificar se a sessão tem autoReceiveMessages habilitado
    if (!session.autoReceiveMessages) {
      console.log(`📭 Auto-recebimento desabilitado para sessão ${sessionId}`);
      return false;
    }

    // Buscar fila ativa associada à sessão
    const queue = await Queue.findOne({
      where: {
        sessionId: sessionId,
        isActive: true
      }
    });

    if (!queue) {
      console.log(`❌ Nenhuma fila ativa encontrada para sessão ${sessionId}`);
      return false;
    }

    // Atribuir ticket à fila
    await ticket.update({
      queueId: queue.id,
      status: 'open'
    });

    console.log(`✅ Ticket #${ticket.id} atribuído automaticamente à fila "${queue.name}"`);

    // Processar regras da fila
    await processQueueRules(ticket, sessionId, true);

    return true;
  } catch (error) {
    console.error(`❌ Erro na auto-atribuição de fila:`, error);
    return false;
  }
};

// Função para processar regras da fila após direcionamento
const processQueueRules = async (ticket, sessionId, isNewTicket = false) => {
  try {
    if (!ticket.queueId) {
      console.log(`ℹ️ Ticket #${ticket.id} não tem fila atribuída, pulando processamento de regras`);
      return;
    }

    // Buscar fila com todas as informações necessárias
    const queue = await Queue.findByPk(ticket.queueId, {
      include: [
        {
          model: User,
          through: { attributes: [] },
          required: false
        }
      ]
    });

    if (!queue || !queue.isActive) {
      console.log(`⚠️ Fila #${ticket.queueId} não encontrada ou inativa`);
      return;
    }

    console.log(`🔧 Processando regras da fila "${queue.name}" para ticket #${ticket.id}`);
    console.log(`📊 Configurações da fila: autoAssignment=${queue.autoAssignment}, assignedUserId=${ticket.assignedUserId}, isNewTicket=${isNewTicket}`);
    console.log(`👥 Usuários na fila: ${queue.Users ? queue.Users.length : 0} usuários`);

    // 1. Atribuição automática (sempre tentar se não houver usuário atribuído)
    if (!ticket.assignedUserId && queue.Users && queue.Users.length > 0) {
      console.log(`🎯 Tentando atribuição automática para ticket #${ticket.id}`);
      // Se autoAssignment estiver habilitado OU se for um ticket sem usuário (fallback)
      if (queue.autoAssignment || !ticket.assignedUserId) {
        await processAutoAssignment(ticket, queue);
      }
    } else {
      console.log(`ℹ️ Pulando atribuição automática: assignedUserId=${ticket.assignedUserId}, usersCount=${queue.Users ? queue.Users.length : 0}`);
    }

    // 2. Mensagem de saudação (apenas para tickets novos)
    if (isNewTicket && queue.greetingMessage) {
      await processGreetingMessage(ticket, queue, sessionId);
    }

    // 3. Resposta automática (para tickets novos quando habilitada)
    if (isNewTicket && queue.autoReply && queue.greetingMessage) {
      await processAutoReply(ticket, queue, sessionId);
    }

    // 4. Coleta de feedback (quando ticket for fechado)
    if (ticket.status === 'closed' && queue.feedbackCollection) {
      await processFeedbackCollection(ticket, queue, sessionId);
    }

    // 5. Fechamento automático (para tickets inativos)
    if (queue.autoClose && ticket.status === 'open') {
      await processAutoClose(ticket, queue);
    }

    console.log(`✅ Regras da fila processadas para ticket #${ticket.id}`);

  } catch (error) {
    console.error(`❌ Erro ao processar regras da fila:`, error);
  }
};

// Algoritmos de rotação para atribuição de usuários
const getNextUserRoundRobin = async (queue) => {
  if (!queue.Users || queue.Users.length === 0) {
    console.log(`❌ Nenhum usuário na fila "${queue.name}" para round-robin`);
    return null;
  }

  console.log(`🔄 Executando round-robin para ${queue.Users.length} usuários`);

  // Implementar round-robin baseado no último usuário que recebeu um ticket
  const lastAssignment = await Ticket.findOne({
    where: {
      queueId: queue.id,
      assignedUserId: { [Op.not]: null }
    },
    order: [['updatedAt', 'DESC']]
  });

  if (!lastAssignment) {
    console.log(`📝 Primeiro ticket da fila, selecionando primeiro usuário: ${queue.Users[0].name}`);
    return queue.Users[0]; // Primeiro usuário se nenhum ticket foi atribuído ainda
  }

  // Encontrar o próximo usuário na sequência
  const lastUserIndex = queue.Users.findIndex(user => user.id === lastAssignment.assignedUserId);
  const nextIndex = (lastUserIndex + 1) % queue.Users.length;
  const nextUser = queue.Users[nextIndex];

  console.log(`🔄 Último usuário: ${queue.Users[lastUserIndex]?.name}, Próximo: ${nextUser.name}`);
  return nextUser;
};

const getRandomUser = async (queue) => {
  if (!queue.Users || queue.Users.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * queue.Users.length);
  return queue.Users[randomIndex];
};

const getFirstAvailableUser = async (queue) => {
  if (!queue.Users || queue.Users.length === 0) {
    console.log(`❌ Nenhum usuário na fila "${queue.name}"`);
    return null;
  }

  console.log(`🔍 Verificando disponibilidade de ${queue.Users.length} usuários na fila "${queue.name}"`);

  // Retornar o primeiro usuário que tem menos tickets ativos
  for (const user of queue.Users) {
    const activeTickets = await Ticket.count({
      where: {
        assignedUserId: user.id,
        status: 'open'
      }
    });

    console.log(`👤 Usuário ${user.name}: ${activeTickets} tickets ativos`);

    // Se o usuário tem menos de 5 tickets ativos, considerá-lo disponível
    if (activeTickets < 5) {
      console.log(`✅ Usuário ${user.name} selecionado (disponível)`);
      return user;
    }
  }

  // Se todos estão "ocupados" (>= 5 tickets), retornar o primeiro mesmo assim
  console.log(`⚠️ Todos os usuários têm >= 5 tickets, selecionando o primeiro: ${queue.Users[0].name}`);
  return queue.Users[0];
};

const getLeastLoadedUser = async (queue) => {
  if (!queue.Users || queue.Users.length === 0) return null;
  
  let leastLoadedUser = null;
  let minTickets = Infinity;

  for (const user of queue.Users) {
    const activeTickets = await Ticket.count({
      where: {
        assignedUserId: user.id,
        status: 'open'
      }
    });

    if (activeTickets < minTickets) {
      minTickets = activeTickets;
      leastLoadedUser = user;
    }
  }

  return leastLoadedUser;
};

// Função para atribuição automática
const processAutoAssignment = async (ticket, queue) => {
  try {
    console.log(`🎯 Iniciando atribuição automática para ticket #${ticket.id}`);
    console.log(`📊 Fila: ${queue.name}, Rotação: ${queue.rotation}`);

    // Verificar se já tem usuário atribuído
    if (ticket.assignedUserId) {
      console.log(`ℹ️ Ticket #${ticket.id} já tem usuário atribuído (${ticket.assignedUserId}), pulando atribuição automática`);
      return;
    }

    // Verificar se há usuários na fila
    if (!queue.Users || queue.Users.length === 0) {
      console.log(`⚠️ Nenhum usuário encontrado na fila "${queue.name}"`);
      return;
    }

    console.log(`👥 Usuários disponíveis: ${queue.Users.map(u => u.name).join(', ')}`);

    // Implementar lógica de rotação baseada no tipo configurado
    let assignedUser = null;

    switch (queue.rotation) {
      case 'round-robin':
        console.log(`🔄 Usando rotação round-robin`);
        assignedUser = await getNextUserRoundRobin(queue);
        break;
      case 'random':
        console.log(`🎲 Usando rotação aleatória`);
        assignedUser = await getRandomUser(queue);
        break;
      case 'fifo':
        console.log(`📋 Usando rotação FIFO`);
        assignedUser = await getFirstAvailableUser(queue);
        break;
      case 'load-based':
        console.log(`⚖️ Usando rotação baseada em carga`);
        assignedUser = await getLeastLoadedUser(queue);
        break;
      default:
        console.log(`🔄 Usando rotação padrão (FIFO)`);
        assignedUser = await getFirstAvailableUser(queue);
    }

    if (assignedUser) {
      console.log(`✅ Usuário selecionado: ${assignedUser.name} (ID: ${assignedUser.id})`);

      await ticket.update({
        assignedUserId: assignedUser.id
      });

      console.log(`✅ Ticket #${ticket.id} atribuído automaticamente para ${assignedUser.name}`);

      // Emitir evento
      emitToAll('ticket-assigned', {
        ticketId: ticket.id,
        userId: assignedUser.id,
        userName: assignedUser.name,
        autoAssigned: true
      });
    } else {
      console.log(`❌ Nenhum usuário disponível para atribuição na fila "${queue.name}"`);
    }
  } catch (error) {
    console.error(`❌ Erro na atribuição automática:`, error);
  }
};

// Função para resposta automática
const processAutoReply = async (ticket, queue, sessionId) => {
  try {
    if (!queue.greetingMessage || !queue.autoReply) return;

    const session = await Session.findByPk(sessionId);
    if (!session) return;

    console.log(`💬 Enviando resposta automática para ticket #${ticket.id}`);

    let messageText = queue.greetingMessage;

    // Personalizar mensagem com dados do contato
    if (ticket.contact) {
      messageText = messageText.replace('{nome}', ticket.contact.split('@')[0]);
    }

    if (session.library === 'whatsappjs' || session.library === 'whatsapp-web.js') {
      const wbot = getWhatsappJsSession(session.whatsappId);
      if (wbot) {
        await sendTextWhatsappJs(session.whatsappId, ticket.contact, messageText);

        // Salvar mensagem no sistema
        await TicketMessage.create({
          ticketId: ticket.id,
          sender: 'system',
          content: messageText,
          timestamp: new Date(),
          isFromGroup: false,
          messageType: 'text'
        });

        console.log(`✅ Resposta automática enviada para ticket #${ticket.id}`);

        // Emitir evento
        emitToAll('auto-reply-sent', {
          ticketId: ticket.id,
          message: messageText,
          queueId: queue.id
        });
      }
    } else if (session.library === 'baileys') {
      const baileys = getBaileysSession(session.whatsappId);
      if (baileys) {
        await sendTextBaileys(session.whatsappId, ticket.contact, messageText);

        // Salvar mensagem no sistema
        await TicketMessage.create({
          ticketId: ticket.id,
          sender: 'system',
          content: messageText,
          timestamp: new Date(),
          isFromGroup: false,
          messageType: 'text'
        });

        console.log(`✅ Resposta automática enviada para ticket #${ticket.id}`);

        // Emitir evento
        emitToAll('auto-reply-sent', {
          ticketId: ticket.id,
          message: messageText,
          queueId: queue.id
        });
      }
    }
  } catch (error) {
    console.error(`❌ Erro na resposta automática:`, error);
  }
};

// Função para mensagem de saudação
const processGreetingMessage = async (ticket, queue, sessionId) => {
  try {
    if (!queue.greetingMessage) {
      console.log(`ℹ️ Nenhuma mensagem de saudação configurada para a fila "${queue.name}"`);
      return;
    }

    const session = await Session.findByPk(sessionId);
    if (!session) {
      console.log(`⚠️ Sessão não encontrada para ID ${sessionId}`);
      return;
    }

    // Verificar se a sessão está conectada
    if (session.status !== 'CONNECTED' && session.status !== 'connected') {
      console.log(`⚠️ Sessão "${session.name}" não está conectada (status: ${session.status}), pulando mensagem de saudação`);
      return;
    }

    console.log(`👋 Enviando mensagem de saudação para ticket #${ticket.id}`);
    console.log(`📊 Detalhes da sessão: ID=${sessionId}, Status=${session.status}, Library=${session.library}, WhatsAppId=${session.whatsappId}`);

    let messageText = queue.greetingMessage;

    // Personalizar mensagem com dados do contato
    if (ticket.contact) {
      messageText = messageText.replace('{nome}', ticket.contact.split('@')[0]);
    }

    console.log(`📨 Tentando enviar mensagem: "${messageText}" para contato: ${ticket.contact}`);

    if (session.library === 'whatsappjs' || session.library === 'whatsapp-web.js') {
      console.log(`🔍 Buscando sessão WhatsApp.js para WhatsAppId: ${session.whatsappId}`);
      const wbot = getWhatsappJsSession(session.whatsappId);
      console.log(`📊 Sessão WhatsApp.js encontrada: ${wbot ? 'SIM' : 'NÃO'}`);

      if (wbot) {
        console.log(`📤 Enviando mensagem via WhatsApp.js...`);
        await sendTextWhatsappJs(session.whatsappId, ticket.contact, messageText);

        // Salvar mensagem no sistema
        await TicketMessage.create({
          ticketId: ticket.id,
          sender: 'system',
          content: messageText,
          timestamp: new Date(),
          isFromGroup: false,
          messageType: 'text'
        });

        console.log(`✅ Mensagem de saudação enviada para ticket #${ticket.id}`);

        // Emitir evento
        emitToAll('greeting-sent', {
          ticketId: ticket.id,
          message: messageText,
          queueId: queue.id
        });
      }
    } else if (session.library === 'baileys') {
      console.log(`🔍 Buscando sessão Baileys para WhatsAppId: ${session.whatsappId}`);
      const baileys = getBaileysSession(session.whatsappId);
      console.log(`📊 Sessão Baileys encontrada: ${baileys ? 'SIM' : 'NÃO'}`);

      if (baileys) {
        console.log(`📤 Enviando mensagem via Baileys...`);
        await sendTextBaileys(session.whatsappId, ticket.contact, messageText);

        // Salvar mensagem no sistema
        await TicketMessage.create({
          ticketId: ticket.id,
          sender: 'system',
          content: messageText,
          timestamp: new Date(),
          isFromGroup: false,
          messageType: 'text'
        });

        console.log(`✅ Mensagem de saudação enviada para ticket #${ticket.id}`);

        // Emitir evento
        emitToAll('greeting-sent', {
          ticketId: ticket.id,
          message: messageText,
          queueId: queue.id
        });
      }
    }
  } catch (error) {
    console.error(`❌ Erro na mensagem de saudação:`, error.message);
    console.log(`ℹ️ Sistema continuará funcionando sem a mensagem de saudação para ticket #${ticket.id}`);
    // Não relançar o erro para não interromper o fluxo principal
  }
};

// Função para fechamento automático
const processAutoClose = async (ticket, queue) => {
  try {
    if (!queue.autoClose || !queue.autoCloseTime) return;

    // Agendar fechamento automático
    setTimeout(async () => {
      try {
        const updatedTicket = await Ticket.findByPk(ticket.id);
        if (updatedTicket && updatedTicket.status === 'open') {
          await updatedTicket.update({
            status: 'closed',
            closedAt: new Date()
          });

          console.log(`🔒 Ticket #${ticket.id} fechado automaticamente`);

          // Emitir evento
          emitToAll('ticket-auto-closed', {
            ticketId: ticket.id,
            queueId: queue.id
          });
        }
      } catch (error) {
        console.error(`❌ Erro no fechamento automático:`, error);
      }
    }, queue.autoCloseTime * 60 * 1000); // Converter minutos para milissegundos

  } catch (error) {
    console.error(`❌ Erro no processamento de fechamento automático:`, error);
  }
};

// Função para coleta de feedback
const processFeedbackCollection = async (ticket, queue, sessionId) => {
  try {
    if (!queue.feedbackCollection || !queue.feedbackMessage) return;

    const session = await Session.findByPk(sessionId);
    if (!session) return;

    console.log(`📝 Enviando solicitação de feedback para ticket #${ticket.id}`);

    let messageText = queue.feedbackMessage;

    // Personalizar mensagem com dados do contato
    if (ticket.contact) {
      messageText = messageText.replace('{nome}', ticket.contact.split('@')[0]);
    }

    if (session.library === 'whatsappjs' || session.library === 'whatsapp-web.js') {
      const wbot = getWhatsappJsSession(session.whatsappId);
      if (wbot) {
        await sendTextWhatsappJs(session.whatsappId, ticket.contact, messageText);

        // Salvar mensagem no sistema
        await TicketMessage.create({
          ticketId: ticket.id,
          sender: 'system',
          content: messageText,
          timestamp: new Date(),
          isFromGroup: false,
          messageType: 'text'
        });

        console.log(`✅ Solicitação de feedback enviada para ticket #${ticket.id}`);

        // Emitir evento
        emitToAll('feedback-request-sent', {
          ticketId: ticket.id,
          message: messageText,
          queueId: queue.id
        });
      }
    } else if (session.library === 'baileys') {
      const baileys = getBaileysSession(session.whatsappId);
      if (baileys) {
        await sendTextBaileys(session.whatsappId, ticket.contact, messageText);

        // Salvar mensagem no sistema
        await TicketMessage.create({
          ticketId: ticket.id,
          sender: 'system',
          content: messageText,
          timestamp: new Date(),
          isFromGroup: false,
          messageType: 'text'
        });

        console.log(`✅ Solicitação de feedback enviada para ticket #${ticket.id}`);

        // Emitir evento
        emitToAll('feedback-request-sent', {
          ticketId: ticket.id,
          message: messageText,
          queueId: queue.id
        });
      }
    }
  } catch (error) {
    console.error(`❌ Erro na coleta de feedback:`, error);
  }
};

// Função para normalizar contactId (tratar @lid e @s.whatsapp.net)
const normalizeContactId = (remoteJid) => {
  if (!remoteJid) return null;

  // Se termina com @lid, converter para @s.whatsapp.net
  if (remoteJid.endsWith('@lid')) {
    // Remover @lid e adicionar @s.whatsapp.net
    const number = remoteJid.replace('@lid', '');
    console.log(`🔄 Convertendo @lid para @s.whatsapp.net: ${remoteJid} -> ${number}@s.whatsapp.net`);
    return `${number}@s.whatsapp.net`;
  }

  // Se já termina com @s.whatsapp.net, retornar como está
  if (remoteJid.endsWith('@s.whatsapp.net')) {
    return remoteJid;
  }

  // Se é apenas um número, adicionar @s.whatsapp.net
  if (/^\d+$/.test(remoteJid)) {
    console.log(`🔄 Adicionando @s.whatsapp.net ao número: ${remoteJid} -> ${remoteJid}@s.whatsapp.net`);
    return `${remoteJid}@s.whatsapp.net`;
  }

  // Retornar como está para outros casos
  return remoteJid;
};

// Função para processar mensagens do WhatsApp.js
const handleWhatsappJsMessage = async (message, sessionId) => {
  try {
    console.log(`📨 Processando mensagem WhatsApp.js:`, message);

    const contactId = normalizeContactId(message.from);
    if (!contactId) {
      console.log(`❌ ContactId inválido:`, message.from);
      return;
    }

    console.log(`📞 Contact ID normalizado: ${contactId}`);

    // Buscar ou criar contato
    let contact = await Contact.findOne({ where: { whatsappId: contactId } });
    if (!contact) {
      const contactName = message.notifyName || contactId.split('@')[0];
      contact = await Contact.create({
        whatsappId: contactId,
        sessionId: sessionId,
        name: contactName,
        isGroup: message.from.includes('@g.us')
      });
      console.log(`👤 Novo contato criado: ${contactName} (${contactId})`);
    }

    // Buscar ticket existente ou criar novo
    let ticket = await Ticket.findOne({
      where: {
        contact: contactId,
        status: ['open', 'pending']
      },
      order: [['createdAt', 'DESC']]
    });

    let isNewTicket = false;
    if (!ticket) {
      // Criar novo ticket
      ticket = await Ticket.create({
        contact: contactId,
        contactId: contact.id,
        status: 'pending',
        unreadCount: 1,
        sessionId: sessionId
      });
      isNewTicket = true;
      console.log(`🎫 Novo ticket criado: #${ticket.id}`);

      // Tentar auto-atribuir à fila
      await autoAssignTicketToQueue(ticket, sessionId);
    } else {
      // Atualizar ticket existente
      await ticket.update({
        unreadCount: ticket.unreadCount + 1,
        lastMessage: message.body,
        updatedAt: new Date()
      });
      console.log(`🎫 Ticket existente atualizado: #${ticket.id}`);
    }

    // Verificar se é resposta de enquete
    const pollResponse = await detectPollResponse(message.body, ticket.id);
    
    let messageData = {
      ticketId: ticket.id,
      sender: 'customer',
      content: message.body,
      messageId: message.id,
      timestamp: new Date(message.timestamp * 1000),
      isFromGroup: message.from.includes('@g.us'),
      messageType: message.type || 'text'
    };

    // Se for resposta de enquete, adicionar campos específicos
    if (pollResponse) {
      messageData.messageType = 'poll_response';
      messageData.pollResponse = pollResponse.selectedOption;
      messageData.pollMessageId = pollResponse.pollMessageId;
      console.log(`📊 Resposta de enquete detectada: Opção ${pollResponse.selectedOption + 1} da enquete ${pollResponse.pollMessageId}`);
    }

    // Salvar mensagem
    const savedMessage = await TicketMessage.create(messageData);

    console.log(`💾 Mensagem salva para ticket #${ticket.id}`);

    // Processar regras da fila se não for novo (novo já foi processado no autoAssignTicketToQueue)
    if (!isNewTicket && ticket.queueId) {
      await processQueueRules(ticket, sessionId, false);
    }

    // Emitir evento
    emitToAll('new-message', {
      ticketId: ticket.id,
      message: {
        id: savedMessage.id,
        sender: 'customer',
        content: message.body,
        timestamp: new Date(),
        messageType: savedMessage.messageType,
        pollResponse: savedMessage.pollResponse,
        pollMessageId: savedMessage.pollMessageId
      }
    });

  } catch (error) {
    console.error(`❌ Erro ao processar mensagem WhatsApp.js:`, error);
  }
};

// Função para processar mensagens do Baileys
const handleBaileysMessage = async (message, sessionId) => {
  try {
    console.log(`📨 Processando mensagem Baileys:`, message);

    const contactId = normalizeContactId(message.key.remoteJid);
    if (!contactId) {
      console.log(`❌ ContactId inválido:`, message.key.remoteJid);
      return;
    }

    console.log(`📞 Contact ID normalizado: ${contactId}`);

    // Buscar ou criar contato
    let contact = await Contact.findOne({ where: { whatsappId: contactId } });
    if (!contact) {
      const contactName = message.pushName || contactId.split('@')[0];
      contact = await Contact.create({
        whatsappId: contactId,
        sessionId: sessionId,
        name: contactName,
        isGroup: contactId.includes('@g.us')
      });
      console.log(`👤 Novo contato criado: ${contactName} (${contactId})`);
    }

    // Buscar ticket existente ou criar novo
    let ticket = await Ticket.findOne({
      where: {
        contact: contactId,
        status: ['open', 'pending']
      },
      order: [['createdAt', 'DESC']]
    });

    let isNewTicket = false;
    if (!ticket) {
      // Criar novo ticket
      ticket = await Ticket.create({
        contact: contactId,
        contactId: contact.id,
        status: 'pending',
        unreadCount: 1,
        sessionId: sessionId
      });
      isNewTicket = true;
      console.log(`🎫 Novo ticket criado: #${ticket.id}`);

      // Tentar auto-atribuir à fila
      await autoAssignTicketToQueue(ticket, sessionId);
    } else {
      // Atualizar ticket existente
      const messageText = message.message?.conversation || 
                         message.message?.extendedTextMessage?.text || 
                         'Mensagem de mídia';
      
      await ticket.update({
        unreadCount: ticket.unreadCount + 1,
        lastMessage: messageText,
        updatedAt: new Date()
      });
      console.log(`🎫 Ticket existente atualizado: #${ticket.id}`);
    }

    // Extrair conteúdo da mensagem
    const messageContent = message.message?.conversation || 
                          message.message?.extendedTextMessage?.text || 
                          message.message?.imageMessage?.caption ||
                          'Mensagem de mídia';

    // Verificar se é resposta de enquete
    const pollResponse = await detectPollResponse(messageContent, ticket.id);
    
    let messageData = {
      ticketId: ticket.id,
      sender: 'customer',
      content: messageContent,
      messageId: message.key.id,
      timestamp: new Date(),
      isFromGroup: contactId.includes('@g.us'),
      messageType: Object.keys(message.message || {})[0] || 'text'
    };

    // Se for resposta de enquete, adicionar campos específicos
    if (pollResponse) {
      messageData.messageType = 'poll_response';
      messageData.pollResponse = pollResponse.selectedOption;
      messageData.pollMessageId = pollResponse.pollMessageId;
      console.log(`📊 Resposta de enquete detectada: Opção ${pollResponse.selectedOption + 1} da enquete ${pollResponse.pollMessageId}`);
    }

    // Salvar mensagem
    const savedMessage = await TicketMessage.create(messageData);

    console.log(`💾 Mensagem salva para ticket #${ticket.id}`);

    // Processar regras da fila se não for novo (novo já foi processado no autoAssignTicketToQueue)
    if (!isNewTicket && ticket.queueId) {
      await processQueueRules(ticket, sessionId, false);
    }

    // Emitir evento
    emitToAll('new-message', {
      ticketId: ticket.id,
      message: {
        id: savedMessage.id,
        sender: 'customer',
        content: messageContent,
        timestamp: new Date(),
        messageType: savedMessage.messageType,
        pollResponse: savedMessage.pollResponse,
        pollMessageId: savedMessage.pollMessageId
      }
    });

  } catch (error) {
    console.error(`❌ Erro ao processar mensagem Baileys:`, error);
  }
};

export {
  autoAssignTicketToQueue,
  processQueueRules,
  processAutoAssignment,
  processAutoReply,
  processGreetingMessage,
  processAutoClose,
  processFeedbackCollection,
  handleWhatsappJsMessage,
  handleBaileysMessage,
  normalizeContactId
};
