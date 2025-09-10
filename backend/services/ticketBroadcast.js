import { Ticket, Queue, Contact, User, TicketMessage, Tag } from '../models/index.js';
import { emitToAll } from './socket.js';

// Emite a lista completa de tickets com relacionamentos e última mensagem
// Único ponto central para manter o frontend sincronizado ("tickets-update")
export const emitTicketsUpdate = async () => {
  try {
    console.log('📡 [TICKETS-BROADCAST] Iniciando emitTicketsUpdate...');
    const tickets = await Ticket.findAll({
      include: [
        { model: Contact, required: false },
        { model: Queue, required: false },
        { model: User, as: 'AssignedUser', required: false },
        { model: Tag, as: 'tags', through: { attributes: ['addedAt'] }, required: false }
      ],
      order: [['updatedAt', 'DESC']]
    });

    console.log(`📊 [TICKETS-BROADCAST] ${tickets.length} tickets encontrados`);
    
    // Log dos tickets "waiting" para debug
    const waitingTickets = tickets.filter(t => t.chatStatus === 'waiting');
    console.log(`⏳ [TICKETS-BROADCAST] ${waitingTickets.length} tickets em status 'waiting':`);
    waitingTickets.forEach(t => {
      console.log(`  - Ticket #${t.id}: contact=${t.contact}, chatStatus=${t.chatStatus}, assignedUserId=${t.assignedUserId}, queueId=${t.queueId}`);
    });

    // Anexar última mensagem de cada ticket
    for (const ticket of tickets) {
      const lastMessage = await TicketMessage.findOne({
        where: { ticketId: ticket.id },
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'content', 'sender', 'isFromGroup', 'participantName', 'groupName', 'createdAt']
      });
      ticket.dataValues.LastMessage = lastMessage;
    }

    console.log('✅ [TICKETS-BROADCAST] Emitindo evento tickets-update para todos os clientes...');
    emitToAll('tickets-update', tickets);
    console.log('✅ [TICKETS-BROADCAST] Evento tickets-update emitido com sucesso');
  } catch (error) {
    // Log essencial apenas
    console.error('❌ [TICKETS-BROADCAST] Erro ao emitir tickets-update:', error.message);
  }
};

export default emitTicketsUpdate;
