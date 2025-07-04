import { Integration, IntegrationTicket, IntegrationQueue, Ticket, Queue } from '../models/index.js';

export const listIntegrations = async (req, res) => {
  const list = await Integration.findAll({
    include: [
      { model: Queue, through: { attributes: [] } },
      { model: Ticket, through: { attributes: [] } }
    ]
  });
  res.json(list);
};

export const createIntegration = async (req, res) => {
  const { name, type, config } = req.body;
  const integration = await Integration.create({ name, type, config });
  res.json(integration);
};

export const updateIntegration = async (req, res) => {
  const { id } = req.params;
  const { name, type, config, active } = req.body;
  const integration = await Integration.findByPk(id);
  if (!integration) return res.status(404).json({ error: 'Não encontrada' });
  integration.name = name ?? integration.name;
  integration.type = type ?? integration.type;
  integration.config = config ?? integration.config;
  if (active !== undefined) integration.active = active;
  await integration.save();
  res.json(integration);
};

export const deleteIntegration = async (req, res) => {
  const { id } = req.params;
  await Integration.destroy({ where: { id } });
  res.json({ success: true });
};

// Associação com ticket
export const linkIntegrationTicket = async (req, res) => {
  const { integrationId, ticketId } = req.body;
  const link = await IntegrationTicket.create({ integrationId, ticketId });
  res.json(link);
};

export const unlinkIntegrationTicket = async (req, res) => {
  const { integrationId, ticketId } = req.body;
  await IntegrationTicket.destroy({ where: { integrationId, ticketId } });
  res.json({ success: true });
};

export const getIntegrationsByTicket = async (req, res) => {
  const { ticketId } = req.params;
  const links = await IntegrationTicket.findAll({ where: { ticketId }, include: [Integration] });
  res.json(links.map(l => l.Integration));
};

// Associação com fila
export const linkIntegrationQueue = async (req, res) => {
  const { integrationId, queueId } = req.body;
  const link = await IntegrationQueue.create({ integrationId, queueId });
  res.json(link);
};

export const unlinkIntegrationQueue = async (req, res) => {
  const { integrationId, queueId } = req.body;
  await IntegrationQueue.destroy({ where: { integrationId, queueId } });
  res.json({ success: true });
};

export const getIntegrationsByQueue = async (req, res) => {
  const { queueId } = req.params;
  const links = await IntegrationQueue.findAll({ where: { queueId }, include: [Integration] });
  res.json(links.map(l => l.Integration));
};
