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

    // Dados para gráficos - últimos 7 dias
    const last7Days = [];
    const ticketsLast7Days = [];
    const messagesLast7Days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
      last7Days.push(dayName);
      
      const [dayTickets, dayMessages] = await Promise.all([
        Ticket.count({
          where: {
            createdAt: {
              [Op.gte]: date,
              [Op.lt]: nextDate
            }
          }
        }),
        TicketMessage.count({
          where: {
            createdAt: {
              [Op.gte]: date,
              [Op.lt]: nextDate
            }
          }
        })
      ]);
      
      ticketsLast7Days.push(dayTickets);
      messagesLast7Days.push(dayMessages);
    }

    // Tickets por status
    const ticketsByStatus = await Ticket.findAll({
      attributes: [
        'status',
        [Ticket.sequelize.fn('COUNT', Ticket.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Mensagens por horário (últimas 24h)
    const messagesByHour = [];
    for (let hour = 0; hour < 24; hour++) {
      const startHour = new Date();
      startHour.setHours(hour, 0, 0, 0);
      const endHour = new Date();
      endHour.setHours(hour + 1, 0, 0, 0);
      
      const count = await TicketMessage.count({
        where: {
          createdAt: {
            [Op.gte]: startHour,
            [Op.lt]: endHour
          }
        }
      });
      
      messagesByHour.push({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        messages: count
      });
    }

    // Tickets por fila
    const ticketsByQueue = await Ticket.findAll({
      include: [{
        model: Queue,
        attributes: ['name']
      }],
      attributes: [
        [Ticket.sequelize.fn('COUNT', Ticket.sequelize.col('Ticket.id')), 'count']
      ],
      group: ['Queue.id', 'Queue.name'],
      raw: true
    });

    const stats = {
      totalTickets,
      openTickets,
      closedTickets,
      totalSessions,
      activeSessions,
      totalQueues,
      totalUsers,
      todayMessages,
      charts: {
        ticketsTimeline: {
          labels: last7Days,
          data: ticketsLast7Days
        },
        messagesTimeline: {
          labels: last7Days,
          data: messagesLast7Days
        },
        ticketsByStatus: ticketsByStatus.map(item => ({
          status: item.status,
          count: parseInt(item.count)
        })),
        messagesByHour: messagesByHour,
        ticketsByQueue: ticketsByQueue.map(item => ({
          queue: item['Queue.name'] || 'Sem Fila',
          count: parseInt(item.count)
        }))
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
