import { User, Session, Ticket, Queue, TicketMessage } from '../models/index.js';
import { Op } from 'sequelize';

export async function getDashboardStats(req, res) {
  try {
    // Buscar estatísticas básicas
    const [
      totalTickets,
      openTickets,
      closedTickets,
      totalSessions,
      activeSessions,
      totalQueues,
      totalUsers
    ] = await Promise.all([
      Ticket.count(),
      Ticket.count({ where: { status: 'open' } }),
      Ticket.count({ where: { status: 'closed' } }),
      Session.count(),
      Session.count({ where: { status: 'connected' } }),
      Queue.count(),
      User.count()
    ]);

    // Mensagens de hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMessages = await TicketMessage.count({
      where: {
        createdAt: {
          [Op.gte]: today
        }
      }
    });

    const stats = {
      totalTickets,
      openTickets,
      closedTickets,
      totalSessions,
      activeSessions,
      totalQueues,
      totalUsers,
      todayMessages
    };

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
