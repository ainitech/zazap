import { Ticket, Queue, Contact, User, TicketMessage, Tag } from '../models/index.js';
import { emitToAll } from './socket.js';

// Emite a lista completa de tickets com relacionamentos e última mensagem
// Único ponto central para manter o frontend sincronizado ("tickets-update")
export const emitTicketsUpdate = async () => {
  try {
    const tickets = await Ticket.findAll({
      include: [
        { model: Contact, required: false },
        { model: Queue, required: false },
        { model: User, as: 'AssignedUser', required: false },
        { model: Tag, as: 'tags', through: { attributes: ['addedAt'] }, required: false }
      ],
      order: [['updatedAt', 'DESC']]
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

    emitToAll('tickets-update', tickets);
  } catch (error) {
    // Log essencial apenas
    console.error('Erro ao emitir tickets-update:', error.message);
  }
};

export default emitTicketsUpdate;
