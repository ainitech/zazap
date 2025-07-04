import { TicketComment, Ticket, User } from '../models/index.js';

export const addComment = async (req, res) => {
  const { ticketId, message } = req.body;
  try {
    const comment = await TicketComment.create({
      ticketId,
      userId: req.user.id,
      message
    });
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getComments = async (req, res) => {
  const { ticketId } = req.params;
  try {
    const comments = await TicketComment.findAll({
      where: { ticketId },
      include: [{ model: User, attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'ASC']]
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
