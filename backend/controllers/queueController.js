
import { Queue, User, UserQueue, Ticket, Contact } from '../models/index.js';
import { emitToAll } from '../services/socket.js';

// Criar nova fila
export const createQueue = async (req, res) => {
  try {
    const { name, description, color, sessionId } = req.body;

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
      description: description || '',
      color: color || '#6B7280',
      sessionId
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

// Aceitar ticket (atribuir a um usuário)
export const acceptTicket = async (req, res) => {
  try {
    const { ticketId, userId } = req.body;
    
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    await ticket.update({
      assignedUserId: userId,
      chatStatus: 'accepted'
    });
    
    console.log(`✅ Ticket #${ticketId} aceito pelo usuário ${user.name}`);
    
    // Buscar ticket atualizado com associações
    const updatedTicket = await Ticket.findByPk(ticketId, {
      include: [
        { model: Queue, required: false },
        { model: User, as: 'AssignedUser', required: false },
        { model: Contact, required: false }
      ]
    });
    
    // Emitir atualização via WebSocket
    emitToAll('ticket-accepted', updatedTicket);
    
    res.json({ message: 'Ticket aceito com sucesso', ticket: updatedTicket });
  } catch (error) {
    console.error('❌ Erro ao aceitar ticket:', error);
    res.status(500).json({ error: error.message });
  }
};

// Resolver ticket
export const resolveTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }
    
    await ticket.update({
      chatStatus: 'resolved'
    });
    
    console.log(`✅ Ticket #${ticketId} resolvido`);
    
    // Buscar ticket atualizado com associações
    const updatedTicket = await Ticket.findByPk(ticketId, {
      include: [
        { model: Queue, required: false },
        { model: User, as: 'AssignedUser', required: false },
        { model: Contact, required: false }
      ]
    });
    
    // Emitir atualização via WebSocket
    emitToAll('ticket-resolved', updatedTicket);
    
    res.json({ message: 'Ticket resolvido com sucesso', ticket: updatedTicket });
  } catch (error) {
    console.error('❌ Erro ao resolver ticket:', error);
    res.status(500).json({ error: error.message });
  }
};
// Transferir ticket para outra fila
export const transferTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { queueId } = req.body;

    if (!queueId) {
      return res.status(400).json({ error: 'queueId é obrigatório para transferência.' });
    }

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    const queue = await Queue.findByPk(queueId);
    if (!queue) {
      return res.status(404).json({ error: 'Fila de destino não encontrada' });
    }

    await ticket.update({ queueId });

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

    res.json({ message: 'Ticket transferido com sucesso', ticket: updatedTicket });
  } catch (error) {
    console.error('❌ Erro ao transferir ticket:', error);
    res.status(500).json({ error: error.message });
  }
};
