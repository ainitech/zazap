import { Integration, IntegrationTicket, IntegrationQueue, Queue, Ticket } from '../models/index.js';
import axios from 'axios';

class IntegrationService {
  /**
   * Processar integrações quando um ticket é criado
   * @param {Object} ticket - Objeto do ticket
   */
  async processTicketCreated(ticket) {
    try {
      console.log(`🔄 Processando integrações para ticket criado: ${ticket.id}`);
      
      // Buscar integrações da fila do ticket
      if (ticket.queueId) {
        const queueIntegrations = await IntegrationQueue.findAll({
          where: { queueId: ticket.queueId, active: true },
          include: [Integration]
        });

        for (const link of queueIntegrations) {
          const integration = link.Integration;
          if (integration && integration.active) {
            await this.executeIntegration(integration, 'ticket_created', { ticket });
          }
        }
      }

      // Buscar integrações diretas do ticket (se houver)
      const ticketIntegrations = await IntegrationTicket.findAll({
        where: { ticketId: ticket.id, active: true },
        include: [Integration]
      });

      for (const link of ticketIntegrations) {
        const integration = link.Integration;
        if (integration && integration.active) {
          await this.executeIntegration(integration, 'ticket_created', { ticket });
        }
      }

    } catch (error) {
      console.error('❌ Erro ao processar integrações do ticket:', error);
    }
  }

  /**
   * Processar integrações quando um ticket é atualizado
   * @param {Object} ticket - Objeto do ticket
   * @param {Object} changes - Campos que foram alterados
   */
  async processTicketUpdated(ticket, changes) {
    try {
      console.log(`🔄 Processando integrações para ticket atualizado: ${ticket.id}`);
      
      // Buscar integrações ativas
      const integrations = await this.getTicketIntegrations(ticket.id, ticket.queueId);
      
      for (const integration of integrations) {
        await this.executeIntegration(integration, 'ticket_updated', { ticket, changes });
      }

    } catch (error) {
      console.error('❌ Erro ao processar integrações do ticket atualizado:', error);
    }
  }

  /**
   * Processar integrações quando um ticket muda de status
   * @param {Object} ticket - Objeto do ticket
   * @param {String} oldStatus - Status anterior
   * @param {String} newStatus - Novo status
   */
  async processTicketStatusChanged(ticket, oldStatus, newStatus) {
    try {
      console.log(`🔄 Processando integrações para mudança de status: ${oldStatus} → ${newStatus}`);
      
      const integrations = await this.getTicketIntegrations(ticket.id, ticket.queueId);
      
      for (const integration of integrations) {
        await this.executeIntegration(integration, 'ticket_status_changed', { 
          ticket, 
          oldStatus, 
          newStatus 
        });
      }

    } catch (error) {
      console.error('❌ Erro ao processar integrações de mudança de status:', error);
    }
  }

  /**
   * Obter todas as integrações ativas para um ticket
   * @param {Number} ticketId - ID do ticket
   * @param {Number} queueId - ID da fila
   * @returns {Array} Array de integrações
   */
  async getTicketIntegrations(ticketId, queueId) {
    const integrations = [];

    // Integrações da fila
    if (queueId) {
      const queueIntegrations = await IntegrationQueue.findAll({
        where: { queueId, active: true },
        include: [{ model: Integration, as: 'Integration', where: { active: true } }]
      });

      integrations.push(...queueIntegrations.map(link => link.Integration));
    }

    // Integrações diretas do ticket
    const ticketIntegrations = await IntegrationTicket.findAll({
      where: { ticketId, active: true },
      include: [{ model: Integration, as: 'Integration', where: { active: true } }]
    });

    integrations.push(...ticketIntegrations.map(link => link.Integration));

    // Remover duplicatas
    const uniqueIntegrations = integrations.filter((integration, index, self) => 
      index === self.findIndex(i => i.id === integration.id)
    );

    return uniqueIntegrations;
  }

  /**
   * Executar uma integração específica
   * @param {Object} integration - Objeto da integração
   * @param {String} event - Evento que disparou a integração
   * @param {Object} data - Dados do evento
   */
  async executeIntegration(integration, event, data) {
    try {
      console.log(`🚀 Executando integração: ${integration.name} (${integration.type}) para evento: ${event}`);

      switch (integration.type) {
        case 'webhook':
          await this.executeWebhook(integration, event, data);
          break;
        case 'n8n':
          await this.executeN8n(integration, event, data);
          break;
        case 'typebot':
          await this.executeTypebot(integration, event, data);
          break;
        default:
          console.warn(`⚠️ Tipo de integração não suportado: ${integration.type}`);
      }

    } catch (error) {
      console.error(`❌ Erro ao executar integração ${integration.name}:`, error);
    }
  }

  /**
   * Executar webhook
   * @param {Object} integration - Configuração da integração
   * @param {String} event - Evento
   * @param {Object} data - Dados
   */
  async executeWebhook(integration, event, data) {
    const config = integration.config || {};
    const webhookUrl = config.url;

    if (!webhookUrl) {
      console.error('❌ URL do webhook não configurada');
      return;
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      integration: {
        id: integration.id,
        name: integration.name,
        type: integration.type
      },
      data
    };

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'ZaZap-Integration/1.0',
      ...config.headers
    };

    await axios.post(webhookUrl, payload, { 
      headers,
      timeout: config.timeout || 10000
    });

    console.log(`✅ Webhook executado com sucesso: ${webhookUrl}`);
  }

  /**
   * Executar integração N8N
   * @param {Object} integration - Configuração da integração
   * @param {String} event - Evento
   * @param {Object} data - Dados
   */
  async executeN8n(integration, event, data) {
    const config = integration.config || {};
    const n8nUrl = config.webhookUrl;

    if (!n8nUrl) {
      console.error('❌ URL do N8N não configurada');
      return;
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      ...data
    };

    await axios.post(n8nUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': config.authToken ? `Bearer ${config.authToken}` : undefined
      },
      timeout: config.timeout || 15000
    });

    console.log(`✅ N8N executado com sucesso: ${n8nUrl}`);
  }

  /**
   * Executar integração Typebot
   * @param {Object} integration - Configuração da integração
   * @param {String} event - Evento
   * @param {Object} data - Dados
   */
  async executeTypebot(integration, event, data) {
    const config = integration.config || {};
    const typebotUrl = config.apiUrl;

    if (!typebotUrl) {
      console.error('❌ URL do Typebot não configurada');
      return;
    }

    const payload = {
      event,
      sessionId: data.ticket?.sessionId,
      contact: data.ticket?.contact,
      message: data.message || '',
      variables: config.variables || {}
    };

    await axios.post(typebotUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : undefined
      },
      timeout: config.timeout || 10000
    });

    console.log(`✅ Typebot executado com sucesso: ${typebotUrl}`);
  }

  /**
   * Vincular integração a um ticket
   * @param {Number} integrationId - ID da integração
   * @param {Number} ticketId - ID do ticket
   */
  async linkTicketIntegration(integrationId, ticketId) {
    try {
      const existing = await IntegrationTicket.findOne({
        where: { integrationId, ticketId }
      });

      if (!existing) {
        await IntegrationTicket.create({ integrationId, ticketId, active: true });
        console.log(`✅ Integração ${integrationId} vinculada ao ticket ${ticketId}`);
      }
    } catch (error) {
      console.error('❌ Erro ao vincular integração ao ticket:', error);
    }
  }

  /**
   * Desvincular integração de um ticket
   * @param {Number} integrationId - ID da integração
   * @param {Number} ticketId - ID do ticket
   */
  async unlinkTicketIntegration(integrationId, ticketId) {
    try {
      await IntegrationTicket.destroy({
        where: { integrationId, ticketId }
      });
      console.log(`✅ Integração ${integrationId} desvinculada do ticket ${ticketId}`);
    } catch (error) {
      console.error('❌ Erro ao desvincular integração do ticket:', error);
    }
  }
}

// Instância singleton
const integrationService = new IntegrationService();

export default integrationService;
