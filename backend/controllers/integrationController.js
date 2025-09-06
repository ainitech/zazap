import { Integration, IntegrationTicket, IntegrationQueue, Ticket, Queue } from '../models/index.js';
import integrationService from '../services/integrationService.js';

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
  try {
    const { integrationId, ticketId } = req.body;
    await integrationService.linkTicketIntegration(integrationId, ticketId);
    
    const link = await IntegrationTicket.findOne({
      where: { integrationId, ticketId },
      include: [Integration, Ticket]
    });
    
    res.json(link);
  } catch (error) {
    console.error('❌ Erro ao vincular integração ao ticket:', error);
    res.status(500).json({ error: error.message });
  }
};

export const unlinkIntegrationTicket = async (req, res) => {
  try {
    const { integrationId, ticketId } = req.body;
    await integrationService.unlinkTicketIntegration(integrationId, ticketId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erro ao desvincular integração do ticket:', error);
    res.status(500).json({ error: error.message });
  }
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

// Executar integração manualmente
export const executeIntegration = async (req, res) => {
  try {
    const { integrationId } = req.params;
    const { event = 'manual_trigger', data = {} } = req.body;
    
    const integration = await Integration.findByPk(integrationId);
    if (!integration) {
      return res.status(404).json({ error: 'Integração não encontrada' });
    }
    
    if (!integration.active) {
      return res.status(400).json({ error: 'Integração não está ativa' });
    }
    
    await integrationService.executeIntegration(integration, event, data);
    
    res.json({ 
      success: true, 
      message: 'Integração executada com sucesso',
      integration: integration.name,
      event
    });
  } catch (error) {
    console.error('❌ Erro ao executar integração:', error);
    res.status(500).json({ error: error.message });
  }
};

// Testar conectividade de uma integração
export const testIntegration = async (req, res) => {
  try {
    const { integrationId } = req.params;
    
    const integration = await Integration.findByPk(integrationId);
    if (!integration) {
      return res.status(404).json({ error: 'Integração não encontrada' });
    }
    
    // Dados de teste
    const testData = {
      ticket: {
        id: 'test',
        contact: 'test@example.com',
        status: 'open',
        chatStatus: 'waiting'
      }
    };
    
    await integrationService.executeIntegration(integration, 'test_connection', testData);
    
    res.json({ 
      success: true, 
      message: 'Teste de integração executado com sucesso',
      integration: integration.name
    });
  } catch (error) {
    console.error('❌ Erro ao testar integração:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'Falha no teste de conectividade'
    });
  }
};
