// Sistema completo de funcionalidades de fila para o ZaZap
import { Op } from 'sequelize';
import { emitToAll } from './socket.js';
import { sendText as sendTextBaileys, getBaileysSession } from './baileysService.js';
import { Session, Ticket, Queue, User, TicketMessage, Contact } from '../models/index.js';
import emitTicketsUpdate from './ticketBroadcast.js';

// ===== Utilitário de log de fila =====
// Ative/desative logs definindo a variável de ambiente QUEUE_DEBUG=1
const QUEUE_DEBUG = process.env.QUEUE_DEBUG === '1' || true; // deixar true temporariamente para diagnóstico
const qlog = (...args) => { if (QUEUE_DEBUG) console.log('🧪[QUEUE]', ...args); };

// ===== 1. FILA ATIVA - Habilita funcionamento da fila =====
export const checkQueueActive = async (sessionId) => {
  try {
    const activeQueues = await Queue.findAll({
      where: {
        sessionId: sessionId,
        isActive: true
      },
      include: [{
        model: User,
        as: 'Users',
        through: { attributes: [] }
      }]
    });
    qlog(`Filas ativas encontradas para sessão ${sessionId}: ${activeQueues.length}`);
    if (activeQueues.length) {
      activeQueues.forEach(q => qlog(`Fila: ${q.name} (id=${q.id}) flags => autoReceive:${q.autoReceiveMessages} autoAssign:${q.autoAssignment} greeting:${!!q.greetingMessage}`));
    }
    
    return activeQueues;
  } catch (error) {
    console.error('❌ Erro ao verificar filas ativas:', error);
    return [];
  }
};

// ===== 2. RECEBER AUTO - Mensagens diretas para fila =====
export const autoReceiveTicketToQueue = async (ticket, sessionId) => {
  try {
  qlog(`Auto-recebimento -> ticket #${ticket.id} (session ${sessionId}) queueIdAtual=${ticket.queueId}`);
    
    // Buscar fila ativa com autoReceiveMessages habilitado
    const queue = await Queue.findOne({
      where: {
        sessionId: sessionId,
        isActive: true,
        autoReceiveMessages: true
      },
      include: [{
        model: User,
        as: 'Users',
        through: { attributes: [] }
      }]
    });
    if (!queue) {
      qlog(`Nenhuma fila com autoReceiveMessages=TRUE encontrada. Listando motivos possíveis...`);
      const active = await Queue.findAll({ where: { sessionId, isActive: true } });
      if (!active.length) qlog('Não há filas ativas.');
      active.forEach(q => qlog(`Fila ${q.name} (id=${q.id}) autoReceive=${q.autoReceiveMessages}`));
      return false;
    }
    qlog(`Fila escolhida para autoReceive: ${queue.name} (id=${queue.id})`);

    // Atribuir ticket à fila
    await ticket.update({
      queueId: queue.id,
      status: 'pending',
      chatStatus: 'accepted'  // Importante: quando auto-recebido, o chatStatus deve ser 'accepted'
    });

  qlog(`Ticket #${ticket.id} associado à fila ${queue.name} status=pending chatStatus=accepted`);

    // Emissão imediata para reduzir janela onde frontend não vê o ticket atualizado
    try {
      const { emitTicketsUpdate } = await import('./ticketBroadcast.js');
      await emitTicketsUpdate();
    } catch (err) {
      console.warn('⚠️ Falha ao emitir tickets-update imediatamente após autoReceive:', err.message);
    }

    // Emitir evento
    emitToAll('ticket-auto-received', {
      ticketId: ticket.id,
      queueId: queue.id,
      queueName: queue.name
    });

    return queue;
  } catch (error) {
    console.error('❌ Erro no auto-recebimento:', error);
    return false;
  }
};

// ===== 3. ATRIBUIÇÃO AUTO - Tickets atribuídos automaticamente =====
export const processAutoAssignment = async (ticket, queue) => {
  try {
  qlog(`AutoAssignment -> ticket #${ticket.id} queue=${queue.name}`);
    
    // Verificar se auto-atribuição está habilitada
    if (!queue.autoAssignment) {
  qlog(`Skip autoAssignment: flag desligada`);
      return false;
    }

    // Verificar se já tem usuário atribuído
    if (ticket.assignedUserId) {
  qlog(`Skip autoAssignment: já possui assignedUserId=${ticket.assignedUserId}`);
      return false;
    }

    // Verificar se há usuários na fila
    if (!queue.Users || queue.Users.length === 0) {
  qlog(`Skip autoAssignment: fila sem usuários vinculados`);
      return false;
    }

  qlog(`${queue.Users.length} usuários candidatos`);

    // Algoritmos de rotação
    let assignedUser = null;

    switch (queue.rotation) {
      case 'round-robin':
        assignedUser = await getNextUserRoundRobin(queue);
        break;
      case 'random':
        assignedUser = await getRandomUser(queue);
        break;
      case 'fifo':
      case 'sequential':
        assignedUser = await getFirstAvailableUser(queue);
        break;
      case 'load-based':
        assignedUser = await getLeastLoadedUser(queue);
        break;
      default:
        assignedUser = await getFirstAvailableUser(queue);
    }

    if (assignedUser) {
      await ticket.update({
        assignedUserId: assignedUser.id,
        status: 'open'
      });

  qlog(`Ticket #${ticket.id} atribuído a ${assignedUser.name} (id=${assignedUser.id})`);

      // Emitir evento
      emitToAll('ticket-auto-assigned', {
        ticketId: ticket.id,
        userId: assignedUser.id,
        userName: assignedUser.name,
        queueId: queue.id
      });

      return assignedUser;
    }

    return false;
  } catch (error) {
    console.error('❌ Erro na atribuição automática:', error);
    return false;
  }
};

// Algoritmos de rotação para atribuição
const getNextUserRoundRobin = async (queue) => {
  try {
    if (!queue.Users || queue.Users.length === 0) return null;

  qlog(`Algoritmo round-robin usuários=${queue.Users.length}`);

    // Buscar último ticket atribuído na fila
    const lastAssignment = await Ticket.findOne({
      where: {
        queueId: queue.id,
        assignedUserId: { [Op.not]: null }
      },
      order: [['updatedAt', 'DESC']]
    });

    if (!lastAssignment) {
  qlog(`RoundRobin: sem histórico, escolhendo primeiro usuário`);
      return queue.Users[0];
    }

    // Encontrar próximo usuário na sequência
    const lastUserIndex = queue.Users.findIndex(user => user.id === lastAssignment.assignedUserId);
    const nextIndex = (lastUserIndex + 1) % queue.Users.length;
    const nextUser = queue.Users[nextIndex];

  qlog(`RoundRobin: próximo usuário => ${nextUser.name}`);
    return nextUser;
  } catch (error) {
    console.error('❌ Erro no round-robin:', error);
    return queue.Users[0];
  }
};

const getRandomUser = async (queue) => {
  if (!queue.Users || queue.Users.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * queue.Users.length);
  qlog(`Random: escolhido ${queue.Users[randomIndex].name}`);
  return queue.Users[randomIndex];
};

const getFirstAvailableUser = async (queue) => {
  try {
    if (!queue.Users || queue.Users.length === 0) return null;

  qlog(`Verificando disponibilidade (FIFO)`);

    // Encontrar usuário com menos tickets ativos
    for (const user of queue.Users) {
      const activeTickets = await Ticket.count({
        where: {
          assignedUserId: user.id,
          status: ['open', 'pending']
        }
      });

  qlog(`Carga ${user.name}: ${activeTickets} tickets`);

      // Limite de 10 tickets por usuário
      if (activeTickets < 10) {
  qlog(`Selecionado ${user.name} (abaixo limite)`);
        return user;
      }
    }

    // Se todos estão ocupados, retornar o primeiro
  qlog(`Todos acima do limite -> usando primeiro usuário`);
    return queue.Users[0];
  } catch (error) {
    console.error('❌ Erro ao buscar usuário disponível:', error);
    return queue.Users[0];
  }
};

const getLeastLoadedUser = async (queue) => {
  try {
    if (!queue.Users || queue.Users.length === 0) return null;
    
    let leastLoadedUser = null;
    let minTickets = Infinity;

    for (const user of queue.Users) {
      const activeTickets = await Ticket.count({
        where: {
          assignedUserId: user.id,
          status: ['open', 'pending']
        }
      });

      if (activeTickets < minTickets) {
        minTickets = activeTickets;
        leastLoadedUser = user;
      }
    }

  qlog(`LeastLoad => ${leastLoadedUser?.name} (${minTickets})`);
    return leastLoadedUser;
  } catch (error) {
    console.error('❌ Erro na seleção por carga:', error);
    return queue.Users[0];
  }
};

// ===== 4. RESPOSTA AUTO - Mensagem de saudação automática =====
export const processGreetingMessage = async (ticket, queue, sessionId) => {
  try {
    if (!queue.greetingMessage) {
      console.log(`ℹ️ Nenhuma mensagem de saudação configurada para fila "${queue.name}"`);
      return false;
    }

    const session = await Session.findByPk(sessionId);
    if (!session) {
      console.log(`⚠️ Sessão ${sessionId} não encontrada`);
      return false;
    }

    // Verificar se sessão está conectada
    if (!['CONNECTED', 'connected'].includes(session.status)) {
      console.log(`⚠️ Sessão não conectada (${session.status}), pulando saudação`);
      return false;
    }

  qlog(`Saudação -> ticket #${ticket.id}`);

    let messageText = queue.greetingMessage;

    // Personalizar mensagem
    if (ticket.contact) {
      const contactName = ticket.contact.split('@')[0];
      messageText = messageText
        .replace(/{nome}/g, contactName)
        .replace(/{contato}/g, contactName)
        .replace(/{fila}/g, queue.name);
    }

    // Enviar via Baileys
    if (session.library === 'baileys') {
      const baileys = getBaileysSession(session.whatsappId);
      if (baileys && baileys.user) {
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

  qlog(`Saudação enviada`);

        // Emitir evento
        emitToAll('greeting-sent', {
          ticketId: ticket.id,
          message: messageText,
          queueId: queue.id
        });

        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('❌ Erro na mensagem de saudação:', error);
    return false;
  }
};

// ===== 5. FECHAR AUTO - Fecha por inatividade =====
export const processAutoClose = async (ticket, queue) => {
  try {
    if (!queue.autoClose || !queue.autoCloseTime) {
      return false;
    }

  qlog(`Agendando autoClose em ${queue.autoCloseTime} min -> ticket #${ticket.id}`);

    // Agendar fechamento
    setTimeout(async () => {
      try {
        // Verificar se ticket ainda existe e está aberto
        const currentTicket = await Ticket.findByPk(ticket.id);
        if (!currentTicket || currentTicket.status !== 'open') {
          qlog(`AutoClose cancelado: ticket não aberto mais`);
          return;
        }

        // Verificar se houve atividade recente
        const recentActivity = await TicketMessage.findOne({
          where: {
            ticketId: ticket.id,
            createdAt: {
              [Op.gte]: new Date(Date.now() - queue.autoCloseTime * 60 * 1000)
            }
          },
          order: [['createdAt', 'DESC']]
        });

        if (recentActivity) {
          qlog(`AutoClose abortado: atividade recente detectada`);
          return;
        }

        // Fechar ticket
        await currentTicket.update({
          status: 'closed',
          closedAt: new Date()
        });

  qlog(`Ticket fechado por inatividade`);

        // Emitir evento
        emitToAll('ticket-auto-closed', {
          ticketId: ticket.id,
          queueId: queue.id,
          reason: 'inactivity'
        });

      } catch (error) {
        console.error('❌ Erro no fechamento automático:', error);
      }
    }, queue.autoCloseTime * 60 * 1000);

    return true;
  } catch (error) {
    console.error('❌ Erro ao agendar fechamento automático:', error);
    return false;
  }
};

// ===== 6. FEEDBACK - Coleta avaliação do cliente =====
export const processFeedbackCollection = async (ticket, queue, sessionId) => {
  try {
    if (!queue.feedbackCollection || !queue.feedbackMessage) {
      return false;
    }

    const session = await Session.findByPk(sessionId);
    if (!session || !['CONNECTED', 'connected'].includes(session.status)) {
      return false;
    }

  qlog(`Feedback -> enviando mensagem para ticket #${ticket.id}`);

    let messageText = queue.feedbackMessage;

    // Personalizar mensagem
    if (ticket.contact) {
      const contactName = ticket.contact.split('@')[0];
      messageText = messageText
        .replace(/{nome}/g, contactName)
        .replace(/{contato}/g, contactName)
        .replace(/{fila}/g, queue.name);
    }

    // Enviar via Baileys
    if (session.library === 'baileys') {
      const baileys = getBaileysSession(session.whatsappId);
      if (baileys && baileys.user) {
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

  qlog(`Feedback enviado`);

        // Emitir evento
        emitToAll('feedback-request-sent', {
          ticketId: ticket.id,
          message: messageText,
          queueId: queue.id
        });

        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('❌ Erro na coleta de feedback:', error);
    return false;
  }
};

// ===== 7. FECHAR TICKET - Permite fechamento automático =====
export const processTicketAutoClose = async (ticket, queue) => {
  try {
    if (!queue.closeTicket) {
      return false;
    }

  qlog(`CloseTicket imediato -> ticket #${ticket.id}`);

    // Fechar ticket imediatamente
    await ticket.update({
      status: 'closed',
      closedAt: new Date()
    });

  qlog(`Ticket fechado (closeTicket flag)`);

    // Emitir evento
    emitToAll('ticket-auto-closed', {
      ticketId: ticket.id,
      queueId: queue.id,
      reason: 'auto-close-enabled'
    });

    return true;
  } catch (error) {
    console.error('❌ Erro no fechamento automático:', error);
    return false;
  }
};

// ===== 8. TRANSFER HUMANO - Permite transferir para humano =====
export const processHumanTransfer = async (ticket, queue, messageContent) => {
  try {
    // Verificar se a mensagem contém palavras-chave para transfer humano
    const humanKeywords = ['humano', 'atendente', 'pessoa', 'help', 'ajuda', 'suporte'];
    const messageWords = messageContent.toLowerCase().split(' ');
    
    const needsHuman = humanKeywords.some(keyword => 
      messageWords.some(word => word.includes(keyword))
    );

    if (!needsHuman) {
      return false;
    }

  qlog(`Transferência humana solicitada`);

    // Marcar ticket para atendimento humano
    await ticket.update({
      needsHumanAttention: true,
      priority: 'high'
    });

    // Se auto-atribuição estiver habilitada, atribuir a um usuário
    if (queue.autoAssignment && queue.Users && queue.Users.length > 0) {
      const availableUser = await getFirstAvailableUser(queue);
      if (availableUser) {
        await ticket.update({
          assignedUserId: availableUser.id,
          status: 'open'
        });

  qlog(`Transferência humana atribuída a ${availableUser.name}`);
      }
    }

    // Emitir evento
    emitToAll('human-transfer-requested', {
      ticketId: ticket.id,
      queueId: queue.id,
      urgency: 'high'
    });

    return true;
  } catch (error) {
    console.error('❌ Erro na transferência humana:', error);
    return false;
  }
};

// ===== PROCESSADOR PRINCIPAL DE REGRAS DA FILA =====
export const processQueueRules = async (ticket, sessionId, isNewTicket = false) => {
  const result = {
    queueId: null,
    queueName: null,
    assignedUserId: null,
    assigned: false,
    greeted: false
  };
  try {
  qlog(`processQueueRules start ticket=${ticket.id} isNew=${isNewTicket} queueId=${ticket.queueId}`);

    // Buscar fila do ticket
    let queue = null;

    if (ticket.queueId) {
      qlog(`Ticket já possui queueId=${ticket.queueId}, carregando fila existente`);
      queue = await Queue.findByPk(ticket.queueId, {
        include: [{
          model: User,
          as: 'Users',
          through: { attributes: [] }
        }]
      });
    } else if (isNewTicket) {
      // Para tickets novos, tentar auto-recebimento
      queue = await autoReceiveTicketToQueue(ticket, sessionId);
    }

    if (!queue) {
  qlog(`Sem fila para processar (ticket #${ticket.id})`);
      return result;
    }

    result.queueId = queue.id;
    result.queueName = queue.name;

  qlog(`Aplicando regras fila=${queue.name} (id=${queue.id}) autoAssign=${queue.autoAssignment} greet=${!!queue.greetingMessage} autoClose=${queue.autoClose} closeTicket=${queue.closeTicket}`);

    // 1. Atribuição automática (se habilitada e ticket não tem usuário)
    if (queue.autoAssignment && !ticket.assignedUserId) {
      const user = await processAutoAssignment(ticket, queue);
      if (user) {
        result.assignedUserId = user.id;
        result.assigned = true;
      }
    }

    // 2. Mensagem de saudação (apenas para tickets novos)
    if (isNewTicket && queue.greetingMessage) {
      const greeted = await processGreetingMessage(ticket, queue, sessionId);
      result.greeted = !!greeted;
    }

    // 3. Fechamento automático por inatividade (agendar)
    if (queue.autoClose && queue.autoCloseTime && ticket.status === 'open') {
      await processAutoClose(ticket, queue);
    }

    // 4. Fechamento automático imediato (se habilitado)
    if (queue.closeTicket && ticket.status === 'open') {
      await processTicketAutoClose(ticket, queue);
    }

    // 5. Coleta de feedback (quando ticket for fechado)
    if (ticket.status === 'closed' && queue.feedbackCollection) {
      await processFeedbackCollection(ticket, queue, sessionId);
    }

  qlog(`Regras concluídas ticket=${ticket.id}`);
    return result;
  } catch (error) {
    console.error('❌ Erro ao processar regras da fila:', error);
    return result;
  }
};

export default {
  checkQueueActive,
  autoReceiveTicketToQueue,
  processAutoAssignment,
  processGreetingMessage,
  processAutoClose,
  processFeedbackCollection,
  processTicketAutoClose,
  processHumanTransfer,
  processQueueRules
};
