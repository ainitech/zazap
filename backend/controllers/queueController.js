import { Queue, UserQueue, Session, Ticket } from '../models/index.js';

export const createQueue = async (req, res) => {
  const { name, sessionId } = req.body;
  try {
    const queue = await Queue.create({ name, sessionId });
    res.status(201).json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const listQueues = async (req, res) => {
  try {
    const queues = await Queue.findAll();
    res.json(queues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const assignUserToQueue = async (req, res) => {
  const { userId, queueId } = req.body;
  try {
    const userQueue = await UserQueue.create({ userId, queueId });
    res.status(201).json(userQueue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserQueues = async (req, res) => {
  const userId = req.user.id;
  try {
    const queues = await Queue.findAll({
      include: [{ model: UserQueue, where: { userId } }]
    });
    res.json(queues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getQueueTickets = async (req, res) => {
  const { queueId } = req.params;
  try {
    const tickets = await Ticket.findAll({ where: { queueId } });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
