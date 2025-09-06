
import { Queue, User, UserQueue, Ticket, Contact, Integration } from '../models/index.js';
import { emitToAll } from '../services/socket.js';
import { Sequelize } from 'sequelize';
import sequelize from '../services/sequelize.js';

// Criar nova fila
export const createQueue = async (req, res) => {
  try {
    const { 
      name, 
      sessionId, 
      color, 
      botOrder, 
      closeTicket, 
      rotation, 
      integration, 
      fileList, 
      greetingMessage,
      outOfHoursMessage,
      autoReceiveMessages,
      autoAssignment,
      autoReply,
      autoClose,
      autoCloseTime,
      feedbackCollection,
      feedbackMessage,
      isActive,
      options 
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome da fila é obrigatório' });
    }
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId é obrigatório para criar uma fila' });
    }

    // Verificar se já existe fila com mesmo nome na sessão
    const existingQueue = await Queue.findOne({
      where: { name, sessionId }
    });

    if (existingQueue) {
      return res.status(400).json({ error: 'Já existe uma fila com este nome nesta sessão' });
    }

    const queue = await Queue.create({
      name,
      sessionId,
      color: color || '#0420BF',
      botOrder: botOrder || 0,
      closeTicket: closeTicket || false,
      rotation: rotation || 'round-robin',
      integration: integration || null,
      fileList: fileList || null,
      greetingMessage: greetingMessage || null,
      outOfHoursMessage: outOfHoursMessage || null,
      autoReceiveMessages: autoReceiveMessages || false,
      autoAssignment: autoAssignment || false,
      autoReply: autoReply || false,
      autoClose: autoClose || false,
      autoCloseTime: autoCloseTime || 60,
      feedbackCollection: feedbackCollection || false,
      feedbackMessage: feedbackMessage || null,
      isActive: isActive !== undefined ? isActive : true,
      options: options || null
    });
    
    console.log(`🆕 Nova fila criada: "${name}" (ID: ${queue.id})`);
    
    // Emitir atualização via WebSocket
    emitToAll('queue-created', queue);
    
    res.status(201).json(queue);
  } catch (error) {
    console.error('❌ Erro ao criar fila:', error);
    res.status(500).json({ error: error.message });
  }
};

// Listar todas as filas
export const listQueues = async (req, res) => {
  try {
    const queues = await Queue.findAll({
      include: [
        {
          model: User,
          through: { attributes: [] }, // Não incluir campos da tabela intermediária
          required: false
        },
        {
          model: Integration,
          through: { attributes: [] },
          required: false
        }
      ],
      order: [['name', 'ASC']]
    });
    
    console.log(`📋 Listando filas: ${queues.length} encontradas`);
    res.json(queues);
  } catch (error) {
    console.error('❌ Erro ao listar filas:', error);
    res.status(500).json({ error: error.message });
  }
};

// Vincular usuário à fila
export const assignUserToQueue = async (req, res) => {
  try {
    const { queueId, userId } = req.body;
    
    const queue = await Queue.findByPk(queueId);
    if (!queue) {
      return res.status(404).json({ error: 'Fila não encontrada' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se já existe a associação
    const existingAssociation = await UserQueue.findOne({
      where: { userId, queueId }
    });
    
    if (existingAssociation) {
      return res.status(400).json({ error: 'Usuário já está vinculado a esta fila' });
    }
    
    await UserQueue.create({ userId, queueId });
    
    console.log(`🔗 Usuário ${user.name} vinculado à fila "${queue.name}"`);
    
    // Emitir atualização via WebSocket
    emitToAll('user-queue-assigned', { userId, queueId, userName: user.name, queueName: queue.name });
    
    res.json({ message: 'Usuário vinculado à fila com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao vincular usuário à fila:', error);
    res.status(500).json({ error: error.message });
  }
};

// Remover usuário da fila
export const removeUserFromQueue = async (req, res) => {
  try {
    const { queueId, userId } = req.body;
    
    const queue = await Queue.findByPk(queueId);
    if (!queue) {
      return res.status(404).json({ error: 'Fila não encontrada' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se a associação existe
    const existingAssociation = await UserQueue.findOne({
      where: { userId, queueId }
    });
    
    if (!existingAssociation) {
      return res.status(400).json({ error: 'Usuário não está vinculado a esta fila' });
    }
    
    await UserQueue.destroy({ where: { userId, queueId } });
    
    console.log(`🔗 Usuário ${user.name} removido da fila "${queue.name}"`);
    
    // Emitir atualização via WebSocket
    emitToAll('user-queue-removed', { userId, queueId, userName: user.name, queueName: queue.name });
    
    res.json({ message: 'Usuário removido da fila com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao remover usuário da fila:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getUserQueues = async (req, res) => {
  const userId = req.user.id;
  try {
    const queues = await Queue.findAll({
      include: [
        {
          model: User,
          through: { 
            where: { userId },
            attributes: []
          },
          required: true
        }
      ]
    });
    res.json(queues);
  } catch (err) {
    console.error('❌ Erro ao buscar filas do usuário:', err);
    res.status(500).json({ error: err.message });
  }
};

export const getQueueTickets = async (req, res) => {
  const { queueId } = req.params;
  try {
    const tickets = await Ticket.findAll({ 
      where: { queueId },
      include: [
        { model: Contact, required: false },
        { model: User, as: 'AssignedUser', required: false }
      ],
      order: [['updatedAt', 'DESC']]
    });
    res.json(tickets);
  } catch (err) {
    console.error('❌ Erro ao buscar tickets da fila:', err);
    res.status(500).json({ error: err.message });
  }
};

// Mover ticket para uma fila
export const moveTicketToQueue = async (req, res) => {
  try {
    const { ticketId, queueId } = req.body;
    
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }
    
    let queue = null;
    if (queueId) {
      queue = await Queue.findByPk(queueId);
      if (!queue) {
        return res.status(404).json({ error: 'Fila não encontrada' });
      }
    }
    
    await ticket.update({ queueId: queueId || null });
    
    console.log(`🔄 Ticket #${ticketId} ${queueId ? `movido para fila "${queue.name}"` : 'removido de fila'}`);
    
    // Buscar ticket atualizado com associações
    const updatedTicket = await Ticket.findByPk(ticketId, {
      include: [
        { model: Queue, required: false },
        { model: User, as: 'AssignedUser', required: false },
        { model: Contact, required: false }
      ]
    });
    
    // Emitir atualização via WebSocket
    emitToAll('ticket-queue-updated', updatedTicket);
    
    res.json({ message: 'Ticket movido com sucesso', ticket: updatedTicket });
  } catch (error) {
    console.error('❌ Erro ao mover ticket para fila:', error);
    res.status(500).json({ error: error.message });
  }
};

// Atualizar fila
export const updateQueue = async (req, res) => {
  try {
    const { queueId } = req.params;
    console.log('📝 Atualizando fila ID:', queueId);
    console.log('📝 Dados recebidos:', req.body);
    
    const { 
      name, 
      color, 
      botOrder, 
      closeTicket, 
      rotation, 
      integration, 
      fileList, 
      greetingMessage,
      outOfHoursMessage,
      autoReceiveMessages,
      autoAssignment,
      autoReply,
      autoClose,
      autoCloseTime,
      feedbackCollection,
      feedbackMessage,
      isActive,
      options 
    } = req.body;

    const queue = await Queue.findByPk(queueId);
    if (!queue) {
      return res.status(404).json({ error: 'Fila não encontrada' });
    }

    // Verificar se o novo nome já existe (se foi alterado)
    if (name && name !== queue.name) {
      const existingQueue = await Queue.findOne({
        where: { name, sessionId: queue.sessionId }
      });
      if (existingQueue) {
        return res.status(400).json({ error: 'Já existe uma fila com este nome nesta sessão' });
      }
    }

    const updatedData = {};
    if (name !== undefined) updatedData.name = name;
    if (color !== undefined) updatedData.color = color;
    if (botOrder !== undefined) updatedData.botOrder = botOrder;
    if (closeTicket !== undefined) updatedData.closeTicket = closeTicket;
    if (rotation !== undefined) updatedData.rotation = rotation;
    if (integration !== undefined) updatedData.integration = integration;
    if (fileList !== undefined) updatedData.fileList = fileList;
    if (greetingMessage !== undefined) updatedData.greetingMessage = greetingMessage;
    if (outOfHoursMessage !== undefined) updatedData.outOfHoursMessage = outOfHoursMessage;
    if (autoReceiveMessages !== undefined) updatedData.autoReceiveMessages = autoReceiveMessages;
    if (autoAssignment !== undefined) updatedData.autoAssignment = autoAssignment;
    if (autoReply !== undefined) updatedData.autoReply = autoReply;
    if (autoClose !== undefined) updatedData.autoClose = autoClose;
    if (autoCloseTime !== undefined) updatedData.autoCloseTime = autoCloseTime;
    if (feedbackCollection !== undefined) updatedData.feedbackCollection = feedbackCollection;
    if (feedbackMessage !== undefined) updatedData.feedbackMessage = feedbackMessage;
    if (isActive !== undefined) updatedData.isActive = isActive;
    if (options !== undefined) updatedData.options = options;

    console.log('📝 Dados que serão atualizados:', updatedData);

    await queue.update(updatedData);
    
    console.log(`📝 Fila "${queue.name}" atualizada`);
    
    // Emitir atualização via WebSocket
    emitToAll('queue-updated', queue);
    
    res.json(queue);
  } catch (error) {
    console.error('❌ Erro ao atualizar fila:', error);
    res.status(500).json({ error: error.message });
  }
};

// Buscar fila por nome
export const getQueueByName = async (req, res) => {
  try {
    const { queueName } = req.params;
    const { sessionId } = req.query;

    const whereClause = { name: queueName };
    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    const queue = await Queue.findOne({
      where: whereClause,
      include: [
        {
          model: User,
          through: { attributes: [] },
          required: false
        }
      ]
    });

    if (!queue) {
      return res.status(404).json({ error: 'Fila não encontrada' });
    }

    res.json(queue);
  } catch (error) {
    console.error('❌ Erro ao buscar fila por nome:', error);
    res.status(500).json({ error: error.message });
  }
};

// Deletar fila
export const deleteQueue = async (req, res) => {
  try {
    const { queueId } = req.params;

    const queue = await Queue.findByPk(queueId);
    if (!queue) {
      return res.status(404).json({ error: 'Fila não encontrada' });
    }

    // Verificar se há tickets vinculados à fila
    const ticketsCount = await Ticket.count({ where: { queueId } });
    if (ticketsCount > 0) {
      return res.status(400).json({ 
        error: `Não é possível deletar a fila. Há ${ticketsCount} ticket(s) vinculado(s) a ela.` 
      });
    }

    // Remover associações com usuários
    await UserQueue.destroy({ where: { queueId } });

    await queue.destroy();
    
    console.log(`🗑️ Fila "${queue.name}" deletada`);
    
    // Emitir atualização via WebSocket
    emitToAll('queue-deleted', { queueId, queueName: queue.name });
    
    res.json({ message: 'Fila deletada com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao deletar fila:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obter estatísticas detalhadas da fila
export const getQueueStats = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { period = '7d' } = req.query;

    const queue = await Queue.findByPk(queueId, {
      include: [
        {
          model: User,
          through: { attributes: [] },
          required: false
        }
      ]
    });

    if (!queue) {
      return res.status(404).json({ error: 'Fila não encontrada' });
    }

    // Calcular data de início baseada no período
    const periodMap = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    
    const daysAgo = periodMap[period] || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Estatísticas de tickets
    const ticketStats = await Ticket.findAll({
      where: {
        queueId,
        createdAt: {
          $gte: startDate
        }
      },
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('AVG', Sequelize.literal('EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/60')), 'avgResolutionTimeMinutes']
      ],
      group: ['status'],
      raw: true
    });

    // Tickets por dia
    const dailyTickets = await Ticket.findAll({
      where: {
        queueId,
        createdAt: {
          $gte: startDate
        }
      },
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    // Performance por agente
    const agentPerformance = await Ticket.findAll({
      where: {
        queueId,
        assignedUserId: {
          $ne: null
        },
        createdAt: {
          $gte: startDate
        }
      },
      include: [
        {
          model: User,
          as: 'AssignedUser',
          attributes: ['id', 'name']
        }
      ],
      attributes: [
        'assignedUserId',
        [Sequelize.fn('COUNT', Sequelize.col('Ticket.id')), 'totalTickets'],
        [Sequelize.fn('COUNT', Sequelize.literal("CASE WHEN status = 'resolved' THEN 1 END")), 'resolvedTickets'],
        [Sequelize.fn('AVG', Sequelize.literal('EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/60')), 'avgResolutionTimeMinutes']
      ],
      group: ['assignedUserId', 'AssignedUser.id', 'AssignedUser.name'],
      raw: true
    });

    const stats = {
      queue: {
        id: queue.id,
        name: queue.name,
        color: queue.color,
        isActive: queue.isActive,
        agentCount: queue.Users?.length || 0
      },
      period,
      tickets: {
        total: ticketStats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
        byStatus: ticketStats.reduce((acc, stat) => {
          acc[stat.status] = {
            count: parseInt(stat.count),
            avgResolutionTime: stat.avgResolutionTimeMinutes ? Math.round(stat.avgResolutionTimeMinutes) : null
          };
          return acc;
        }, {}),
        daily: dailyTickets
      },
      agents: agentPerformance.map(agent => ({
        userId: agent.assignedUserId,
        name: agent['AssignedUser.name'],
        totalTickets: parseInt(agent.totalTickets),
        resolvedTickets: parseInt(agent.resolvedTickets || 0),
        resolutionRate: agent.totalTickets > 0 ? 
          Math.round((agent.resolvedTickets / agent.totalTickets) * 100) : 0,
        avgResolutionTime: agent.avgResolutionTimeMinutes ? 
          Math.round(agent.avgResolutionTimeMinutes) : null
      }))
    };

    res.json(stats);
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas da fila:', error);
    res.status(500).json({ error: error.message });
  }
};

// Ações em lote
export const bulkActions = async (req, res) => {
  try {
    const { action, queueIds } = req.body;

    if (!action || !queueIds || !Array.isArray(queueIds)) {
      return res.status(400).json({ error: 'Ação e lista de IDs são obrigatórios' });
    }

    const validActions = ['activate', 'deactivate', 'delete', 'archive'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Ação inválida' });
    }

    const queues = await Queue.findAll({
      where: {
        id: queueIds
      }
    });

    if (queues.length === 0) {
      return res.status(404).json({ error: 'Nenhuma fila encontrada' });
    }

    let updatedCount = 0;
    const results = [];

    for (const queue of queues) {
      try {
        switch (action) {
          case 'activate':
            await queue.update({ isActive: true });
            updatedCount++;
            results.push({ id: queue.id, status: 'success', message: 'Ativada' });
            break;
            
          case 'deactivate':
            await queue.update({ isActive: false });
            updatedCount++;
            results.push({ id: queue.id, status: 'success', message: 'Desativada' });
            break;
            
          case 'archive':
            await queue.update({ isActive: false, archivedAt: new Date() });
            updatedCount++;
            results.push({ id: queue.id, status: 'success', message: 'Arquivada' });
            break;
            
          case 'delete':
            const ticketsCount = await Ticket.count({ where: { queueId: queue.id } });
            if (ticketsCount > 0) {
              results.push({ 
                id: queue.id, 
                status: 'error', 
                message: `Não pode ser deletada - ${ticketsCount} ticket(s) vinculado(s)` 
              });
            } else {
              await UserQueue.destroy({ where: { queueId: queue.id } });
              await queue.destroy();
              updatedCount++;
              results.push({ id: queue.id, status: 'success', message: 'Deletada' });
            }
            break;
        }
      } catch (error) {
        results.push({ 
          id: queue.id, 
          status: 'error', 
          message: error.message 
        });
      }
    }

    console.log(`📦 Ação em lote "${action}" executada em ${updatedCount}/${queues.length} filas`);
    
    // Emitir atualização via WebSocket
    emitToAll('bulk-queue-action', { action, results });

    res.json({
      message: `Ação "${action}" executada em ${updatedCount} de ${queues.length} filas`,
      updatedCount,
      results
    });
  } catch (error) {
    console.error('❌ Erro na ação em lote:', error);
    res.status(500).json({ error: error.message });
  }
};

// Arquivar fila
export const archiveQueue = async (req, res) => {
  try {
    const { queueId } = req.params;

    const queue = await Queue.findByPk(queueId);
    if (!queue) {
      return res.status(404).json({ error: 'Fila não encontrada' });
    }

    await queue.update({ 
      isActive: false, 
      archivedAt: new Date() 
    });

    console.log(`📦 Fila "${queue.name}" arquivada`);
    
    // Emitir atualização via WebSocket
    emitToAll('queue-archived', { queueId, queueName: queue.name });

    res.json({ message: 'Fila arquivada com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao arquivar fila:', error);
    res.status(500).json({ error: error.message });
  }
};

// Duplicar fila
export const duplicateQueue = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { newName } = req.body;

    const originalQueue = await Queue.findByPk(queueId, {
      include: [
        {
          model: User,
          through: { attributes: [] }
        }
      ]
    });

    if (!originalQueue) {
      return res.status(404).json({ error: 'Fila original não encontrada' });
    }

    const duplicateName = newName || `${originalQueue.name} (Cópia)`;

    // Verificar se já existe fila com o novo nome
    const existingQueue = await Queue.findOne({
      where: { 
        name: duplicateName, 
        sessionId: originalQueue.sessionId 
      }
    });

    if (existingQueue) {
      return res.status(400).json({ error: 'Já existe uma fila com este nome' });
    }

    // Criar nova fila com dados da original
    const newQueue = await Queue.create({
      name: duplicateName,
      sessionId: originalQueue.sessionId,
      color: originalQueue.color,
      greetingMessage: originalQueue.greetingMessage,
      outOfHoursMessage: originalQueue.outOfHoursMessage,
      isActive: false, // Criar inativa por segurança
      botOrder: originalQueue.botOrder,
      closeTicket: originalQueue.closeTicket,
      rotation: originalQueue.rotation,
      integration: originalQueue.integration,
      fileList: originalQueue.fileList,
      options: originalQueue.options
    });

    // Duplicar associações com usuários
    if (originalQueue.Users && originalQueue.Users.length > 0) {
      const userAssociations = originalQueue.Users.map(user => ({
        userId: user.id,
        queueId: newQueue.id
      }));
      
      await UserQueue.bulkCreate(userAssociations);
    }

    console.log(`📋 Fila "${originalQueue.name}" duplicada como "${duplicateName}"`);
    
    // Emitir atualização via WebSocket
    emitToAll('queue-duplicated', { 
      originalId: queueId, 
      newQueue: {
        id: newQueue.id,
        name: newQueue.name
      }
    });

    res.json({
      message: 'Fila duplicada com sucesso',
      newQueue
    });
  } catch (error) {
    console.error('❌ Erro ao duplicar fila:', error);
    res.status(500).json({ error: error.message });
  }
};

// Transferir ticket para outra fila
export const transferTicketToQueue = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { ticketId, targetQueueId, reason } = req.body;

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    const targetQueue = await Queue.findByPk(targetQueueId);
    if (!targetQueue) {
      return res.status(404).json({ error: 'Fila de destino não encontrada' });
    }

    const oldQueueId = ticket.queueId;
    
    await ticket.update({
      queueId: targetQueueId,
      assignedUserId: null, // Remove atribuição atual
      transferReason: reason || 'Transferência entre filas'
    });

    console.log(`🔄 Ticket ${ticketId} transferido da fila ${oldQueueId} para ${targetQueueId}`);
    
    // Emitir atualização via WebSocket
    emitToAll('ticket-transferred', {
      ticketId,
      oldQueueId,
      newQueueId: targetQueueId,
      reason
    });

    res.json({ message: 'Ticket transferido com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao transferir ticket:', error);
    res.status(500).json({ error: error.message });
  }
};

// Performance da fila
export const getQueuePerformance = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { startDate, endDate } = req.query;

    const queue = await Queue.findByPk(queueId);
    if (!queue) {
      return res.status(404).json({ error: 'Fila não encontrada' });
    }

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const whereClause = { queueId };
    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter;
    }

    // Métricas de performance
    const totalTickets = await Ticket.count({ where: whereClause });
    
    const resolvedTickets = await Ticket.count({
      where: { ...whereClause, status: 'resolved' }
    });

    const averageResolutionTime = await Ticket.findOne({
      where: { 
        ...whereClause, 
        status: 'resolved',
        resolvedAt: { $ne: null }
      },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.literal('EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/60')), 'avgMinutes']
      ],
      raw: true
    });

    const firstResponseTime = await Ticket.findOne({
      where: whereClause,
      attributes: [
        [Sequelize.fn('AVG', Sequelize.literal('EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt"))/60')), 'avgMinutes']
      ],
      raw: true
    });

    // Distribuição por período (últimos 30 dias por dia)
    const distributionData = await Ticket.findAll({
      where: {
        ...whereClause,
        createdAt: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        'status'
      ],
      group: [
        Sequelize.fn('DATE', Sequelize.col('createdAt')),
        'status'
      ],
      order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    const performance = {
      queueId,
      queueName: queue.name,
      period: {
        start: startDate || 'N/A',
        end: endDate || 'N/A'
      },
      metrics: {
        totalTickets,
        resolvedTickets,
        resolutionRate: totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0,
        averageResolutionTime: averageResolutionTime?.avgMinutes ? 
          Math.round(averageResolutionTime.avgMinutes) : null,
        averageFirstResponseTime: firstResponseTime?.avgMinutes ? 
          Math.round(firstResponseTime.avgMinutes) : null
      },
      distribution: distributionData
    };

    res.json(performance);
  } catch (error) {
    console.error('❌ Erro ao buscar performance da fila:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obter configurações avançadas da fila
export const getAdvancedSettings = async (req, res) => {
  try {
    const { queueId } = req.params;

    const queue = await Queue.findByPk(queueId);
    if (!queue) {
      return res.status(404).json({ error: 'Fila não encontrada' });
    }

    const settings = {
      autoAssignment: queue.autoAssignment || true,
      maxConcurrentTickets: queue.maxConcurrentTickets || 5,
      workingHours: queue.workingHours || {
        enabled: false,
        start: '09:00',
        end: '18:00',
        timezone: 'America/Sao_Paulo'
      },
      escalationRules: queue.escalationRules || {
        enabled: false,
        timeLimit: 30,
        escalateTo: 'supervisor'
      },
      autoResponses: queue.autoResponses || {
        greeting: true,
        awayMessage: true,
        closureMessage: true
      },
      integrationSettings: queue.integrationSettings || {
        webhookUrl: '',
        enableNotifications: true,
        notificationTypes: ['new_ticket', 'ticket_assigned', 'ticket_resolved']
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('❌ Erro ao buscar configurações avançadas:', error);
    res.status(500).json({ error: error.message });
  }
};

// Atualizar configurações avançadas da fila
export const updateAdvancedSettings = async (req, res) => {
  try {
    const { queueId } = req.params;
    const settings = req.body;

    const queue = await Queue.findByPk(queueId);
    if (!queue) {
      return res.status(404).json({ error: 'Fila não encontrada' });
    }

    await queue.update({
      autoAssignment: settings.autoAssignment,
      maxConcurrentTickets: settings.maxConcurrentTickets,
      workingHours: settings.workingHours,
      escalationRules: settings.escalationRules,
      autoResponses: settings.autoResponses,
      integrationSettings: settings.integrationSettings
    });

    console.log(`⚙️ Configurações avançadas da fila "${queue.name}" atualizadas`);
    
    // Emitir atualização via WebSocket
    emitToAll('queue-settings-updated', { 
      queueId, 
      queueName: queue.name,
      settings 
    });

    res.json({ 
      message: 'Configurações avançadas atualizadas com sucesso',
      settings 
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar configurações avançadas:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obter atividades recentes das filas
export const getQueueActivities = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    // Simular atividades recentes (em um ambiente real, isso viria de um log de auditoria)
    const recentActivities = [
      {
        id: 1,
        type: 'queue-created',
        title: 'Nova fila criada',
        description: 'Fila "Vendas Online" foi criada por admin',
        user: 'Administrador',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min atrás
        queueId: null,
        queueName: 'Vendas Online'
      },
      {
        id: 2,
        type: 'agent-assigned',
        title: 'Agente atribuído',
        description: 'João Silva foi atribuído à fila "Suporte Técnico"',
        user: 'Gerente',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min atrás
        queueId: 1,
        queueName: 'Suporte Técnico'
      },
      {
        id: 3,
        type: 'ticket-transferred',
        title: 'Ticket transferido',
        description: 'Ticket #1234 transferido para fila "Vendas"',
        user: 'Maria Santos',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min atrás
        queueId: 2,
        queueName: 'Vendas'
      },
      {
        id: 4,
        type: 'queue-updated',
        title: 'Fila atualizada',
        description: 'Configurações da fila "Atendimento" foram alteradas',
        user: 'Administrador',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 min atrás
        queueId: 3,
        queueName: 'Atendimento'
      },
      {
        id: 5,
        type: 'bulk-action',
        title: 'Ação em lote executada',
        description: '3 filas foram desativadas simultaneamente',
        user: 'Supervisor',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h atrás
        queueId: null,
        queueName: null
      },
      {
        id: 6,
        type: 'queue-duplicated',
        title: 'Fila duplicada',
        description: 'Fila "Suporte" foi duplicada como "Suporte VIP"',
        user: 'Administrador',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h atrás
        queueId: 4,
        queueName: 'Suporte VIP'
      },
      {
        id: 7,
        type: 'settings-updated',
        title: 'Configurações avançadas atualizadas',
        description: 'Horário de funcionamento alterado para fila "Comercial"',
        user: 'Gerente',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3h atrás
        queueId: 5,
        queueName: 'Comercial'
      },
      {
        id: 8,
        type: 'queue-archived',
        title: 'Fila arquivada',
        description: 'Fila "Teste Temporário" foi arquivada',
        user: 'Administrador',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4h atrás
        queueId: 6,
        queueName: 'Teste Temporário'
      }
    ];

    // Aplicar paginação
    const paginatedActivities = recentActivities.slice(offset, offset + parseInt(limit));

    res.json(paginatedActivities);
  } catch (error) {
    console.error('❌ Erro ao buscar atividades:', error);
    res.status(500).json({ error: error.message });
  }
};
