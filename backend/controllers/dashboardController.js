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

    // NPS stats + por usuário
    let nps = null;
    let npsByUser = [];
    try {
      const npsTickets = await Ticket.findAll({
        where: { npsScore: { [Op.ne]: null } },
        attributes: ['npsScore','npsUserId'],
        raw: true
      });
      if (npsTickets.length > 0) {
        const scores = npsTickets.map(t => t.npsScore);
        const total = scores.length;
  // Classificação personalizada: 0-5 ruim, 6-8 neutro, 9-10 ótimo
  const detractors = scores.filter(s => s >= 0 && s <= 5).length; // ruim
  const passives = scores.filter(s => s >= 6 && s <= 8).length;   // neutro
  const promoters = scores.filter(s => s >= 9 && s <= 10).length; // ótimo
        const npsValue = Math.round(((promoters / total) - (detractors / total)) * 100);
        const avg = (scores.reduce((a,b)=>a+b,0) / total).toFixed(2);
        const distribution = Array.from({ length: 11 }, (_, i) => ({ score: i, count: scores.filter(s => s === i).length }));
        nps = {
          totalResponses: total,
          average: parseFloat(avg),
            detractors,
            passives,
            promoters,
            nps: npsValue,
            distribution
        };

        // Agrupar por usuário
        const byUserMap = new Map();
  for (const row of npsTickets) {
          const uid = row.npsUserId || 0; // 0 = sem usuário
          if (!byUserMap.has(uid)) {
            byUserMap.set(uid, []);
          }
          byUserMap.get(uid).push(row.npsScore);
        }
        const userIds = Array.from(byUserMap.keys()).filter(id => id !== 0);
        let usersData = [];
        if (userIds.length) {
          const users = await User.findAll({ where: { id: userIds }, attributes: ['id','name'], raw: true });
          usersData = users;
        }
        npsByUser = Array.from(byUserMap.entries()).map(([uid, arr]) => {
          const u = usersData.find(x => x.id === uid);
          const detr = arr.filter(s => s >=0 && s <=5).length;      // ruim
          const pass = arr.filter(s => s >=6 && s <=8).length;      // neutro
          const prom = arr.filter(s => s >=9 && s <=10).length;     // ótimo
          const val = Math.round(((prom/arr.length)-(detr/arr.length))*100);
          return {
            userId: uid || null,
            userName: u ? u.name : 'Sem usuário',
            totalResponses: arr.length,
            average: parseFloat((arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2)),
            detractors: detr,
            passives: pass,
            promoters: prom,
            nps: val
          };
        }).sort((a,b)=> (b.totalResponses - a.totalResponses));
        if (scores.length && !npsByUser.length) {
          console.log('[NPS][DASH] Aviso: existem notas mas npsByUser ficou vazio. Verifique se npsUserId está sendo populado.');
        }
      } else {
        nps = { totalResponses: 0, average: null, detractors: 0, passives: 0, promoters: 0, nps: null, distribution: [] };
        npsByUser = [];
      }
    } catch (npsErr) {
      console.warn('⚠️ Falha ao calcular NPS para dashboard:', npsErr.message);
      nps = { totalResponses: 0, average: null, detractors: 0, passives: 0, promoters: 0, nps: null, distribution: [] };
      npsByUser = [];
    }

    const stats = {
      totalTickets,
      openTickets,
      closedTickets,
      totalSessions,
      activeSessions,
      totalQueues,
      totalUsers,
      todayMessages,
  nps,
  npsByUser,
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
