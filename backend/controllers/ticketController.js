import { Ticket, Queue, Contact, User } from '../models/index.js';
import { Op } from 'sequelize';
import { emitToAll } from '../services/socket.js';

// Função utilitária para emitir atualizações de tickets
const emitTicketsUpdate = async () => {
  try {
    const tickets = await Ticket.findAll({
      include: [
        {
          model: Contact,
          required: false // LEFT JOIN para incluir tickets sem contato vinculado
        },
        {
          model: Queue,
          required: false // LEFT JOIN para incluir tickets sem fila vinculada
        },
        {
          model: User,
          as: 'AssignedUser',
          required: false // LEFT JOIN para incluir tickets sem usuário atribuído
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    console.log(`🔄 Emitindo atualização de tickets via WebSocket: ${tickets.length} tickets`);
    emitToAll('tickets-update', tickets);
  } catch (error) {
    console.error('❌ Erro ao emitir atualização de tickets:', error);
  }
};

// Listar tickets com filtros e busca avançada
export const listTickets = async (req, res) => {
  try {
    const { contact, status, queueId, sessionId, fromDate, toDate, search, ticketId } = req.query;
    const where = {};
    
    // Se ticketId for especificado, buscar apenas esse ticket
    if (ticketId) {
      where.id = ticketId;
    } else {
      // Aplicar outros filtros apenas se não for busca específica por ID
      if (contact) where.contact = { [Op.iLike]: `%${contact}%` };
      if (status) where.status = status;
      if (queueId) where.queueId = queueId;
      if (sessionId) where.sessionId = sessionId;
      if (fromDate || toDate) {
        where.createdAt = {};
        if (fromDate) where.createdAt[Op.gte] = new Date(fromDate);
        if (toDate) where.createdAt[Op.lte] = new Date(toDate);
      }
      if (search) {
        where[Op.or] = [
          { contact: { [Op.iLike]: `%${search}%` } },
          { lastMessage: { [Op.iLike]: `%${search}%` } },
          { '$Contact.name$': { [Op.iLike]: `%${search}%` } },
          { '$Contact.pushname$': { [Op.iLike]: `%${search}%` } }
        ];
      }
    }
    
    const tickets = await Ticket.findAll({
      where,
      include: [
        {
          model: Contact,
          required: false // LEFT JOIN para incluir tickets sem contato vinculado
        },
        {
          model: Queue,
          required: false // LEFT JOIN para incluir tickets sem fila vinculada
        },
        {
          model: User,
          as: 'AssignedUser',
          required: false // LEFT JOIN para incluir tickets sem usuário atribuído
        }
      ],
      order: [['updatedAt', 'DESC']], // Ordenar por updatedAt para mostrar mais recentes primeiro
    });
    
    console.log(`📊 Listando tickets: ${tickets.length} encontrados${ticketId ? ` (busca específica ID: ${ticketId})` : ''}`);
    
    res.json(tickets);
  } catch (err) {
    console.error('❌ Erro ao listar tickets:', err);
    res.status(500).json({ error: err.message });
  }
};

export const moveTicket = async (req, res) => {
  const { ticketId, targetQueueId } = req.body;
  try {
    console.log(`🔄 Movendo ticket #${ticketId} para fila #${targetQueueId}`);
    
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });
    
    const queue = await Queue.findByPk(targetQueueId);
    if (!queue) return res.status(404).json({ error: 'Fila de destino não encontrada.' });
    
    // TODO: Implementar lógica de associação ticket-fila quando necessário
    // Por enquanto, apenas retornar sucesso
    console.log(`✅ Ticket #${ticketId} seria movido para fila "${queue.name}"`);
    
    // Emitir atualização de tickets
    await emitTicketsUpdate();
    
    res.json({ success: true, ticket, message: 'Funcionalidade será implementada quando necessário' });
  } catch (err) {
    console.error('❌ Erro ao mover ticket:', err);
    res.status(500).json({ error: err.message });
  }
};

// Aceitar ticket (mover de 'waiting' para 'accepted')
export const acceptTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id; // Obtido do middleware de autenticação
    
    console.log(`🎫 Tentando aceitar ticket #${ticketId} pelo usuário ${userId}`);
    
    // Buscar ticket
    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: Contact,
          required: false
        },
        {
          model: Queue,
          required: false
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }
    
    // Verificar se o ticket está em status de espera
    if (ticket.chatStatus !== 'waiting') {
      return res.status(400).json({ 
        error: 'Ticket não pode ser aceito. Status atual: ' + ticket.chatStatus 
      });
    }
    
    // Atualizar ticket para aceito
    await ticket.update({
      chatStatus: 'accepted',
      assignedUserId: userId,
      unreadCount: 0 // Zerar contador quando aceitar
    });
    
    console.log(`✅ Ticket #${ticketId} aceito pelo usuário ${userId}`);
    
    // Buscar ticket atualizado com associações
    const updatedTicket = await Ticket.findByPk(ticketId, {
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
      ]
    });
    
    // Emitir atualização de tickets
    await emitTicketsUpdate();
    
    res.json({ 
      success: true, 
      ticket: updatedTicket,
      message: 'Ticket aceito com sucesso!' 
    });
  } catch (err) {
    console.error('❌ Erro ao aceitar ticket:', err);
    res.status(500).json({ error: err.message });
  }
};

// Resolver ticket (mover de 'accepted' para 'resolved')
export const resolveTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    
    console.log(`🎫 Tentando resolver ticket #${ticketId} pelo usuário ${userId}`);
    
    // Buscar ticket
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }
    
    // Verificar se o ticket está aceito e atribuído ao usuário
    if (ticket.chatStatus !== 'accepted') {
      return res.status(400).json({ 
        error: 'Ticket não pode ser resolvido. Status atual: ' + ticket.chatStatus 
      });
    }
    
    if (ticket.assignedUserId !== userId) {
      return res.status(403).json({ 
        error: 'Você não tem permissão para resolver este ticket.' 
      });
    }
    
    // Atualizar ticket para resolvido
    await ticket.update({
      chatStatus: 'resolved'
    });
    
    console.log(`✅ Ticket #${ticketId} resolvido pelo usuário ${userId}`);
    
    // Emitir atualização de tickets
    await emitTicketsUpdate();
    
    res.json({ 
      success: true, 
      ticket,
      message: 'Ticket resolvido com sucesso!' 
    });
  } catch (err) {
    console.error('❌ Erro ao resolver ticket:', err);
    res.status(500).json({ error: err.message });
  }
};
// Atualizar prioridade do ticket
export const updateTicketPriority = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { priority, reason } = req.body;
    if (!priority) {
      return res.status(400).json({ error: 'priority é obrigatório' });
    }
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }
    await ticket.update({ priority });
    // Opcional: salvar reason em um histórico, se desejar
    // Emitir atualização via WebSocket
    const updatedTicket = await Ticket.findByPk(ticketId, {
      include: [
        { model: Queue, required: false },
        { model: User, as: 'AssignedUser', required: false },
        { model: Contact, required: false }
      ]
    });
    emitToAll('ticket-priority-updated', updatedTicket);
    res.json({ message: 'Prioridade do ticket atualizada com sucesso', ticket: updatedTicket });
  } catch (error) {
    console.error('❌ Erro ao atualizar prioridade do ticket:', error);
    res.status(500).json({ error: error.message });
  }
};

// Fechar ticket
export const closeTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    
    // Buscar ticket
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }
    
    // Verificar se o ticket pode ser fechado
    if (ticket.chatStatus === 'closed') {
      return res.status(400).json({ 
        error: 'Ticket já está fechado.' 
      });
    }
    
    // Verificar se o usuário tem permissão para fechar
    if (ticket.assignedUserId !== userId) {
      return res.status(403).json({ 
        error: 'Você não tem permissão para fechar este ticket.' 
      });
    }
    
    // Atualizar ticket para fechado
    await ticket.update({
      chatStatus: 'closed',
      closedAt: new Date()
    });
    
    console.log(`🔒 Ticket #${ticketId} fechado pelo usuário ${userId}`);
    
    // Emitir atualização de tickets
    await emitTicketsUpdate();
    
    res.json({ 
      success: true, 
      ticket,
      message: 'Ticket fechado com sucesso!' 
    });
  } catch (err) {
    console.error('❌ Erro ao fechar ticket:', err);
    res.status(500).json({ error: err.message });
  }
};