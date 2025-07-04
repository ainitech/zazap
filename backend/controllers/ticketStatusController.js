import { Ticket } from '../models/index.js';

export const updateTicketStatus = async (req, res) => {
  const { ticketId, status } = req.body;
  try {
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });
    ticket.status = status;
    await ticket.save();
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
