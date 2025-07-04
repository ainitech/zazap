import { Ticket, Queue } from '../models/index.js';
import { Op } from 'sequelize';

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
        ];
      }
    }
    
    const tickets = await Ticket.findAll({
      where,
      order: [['updatedAt', 'DESC']], // Ordenar por updatedAt para mostrar mais recentes primeiro
      // Removido o include com Queue por enquanto até configurarmos a associação correta
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
    
    res.json({ success: true, ticket, message: 'Funcionalidade será implementada quando necessário' });
  } catch (err) {
    console.error('❌ Erro ao mover ticket:', err);
    res.status(500).json({ error: err.message });
  }
};
