import { Campaign, CampaignMessage, Contact, Tag, Ticket } from '../models/index.js';
import { Op } from 'sequelize';

class CampaignService {
  
  // Processar contatos da campanha com base na segmentação
  async processCampaignContacts(campaignId) {
    const campaign = await Campaign.findByPk(campaignId);
    
    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }

    let contacts = [];

    switch (campaign.segmentationType) {
      case 'all':
        contacts = await Contact.findAll({
          where: { isActive: true },
          attributes: ['id', 'name', 'phoneNumber']
        });
        break;

      case 'tags':
        if (!campaign.tagIds || campaign.tagIds.length === 0) {
          throw new Error('Nenhuma tag selecionada para segmentação');
        }

        // Buscar contatos através dos tickets que têm as tags especificadas
        const taggedTickets = await Ticket.findAll({
          include: [{
            model: Tag,
            as: 'tags',
            where: { id: { [Op.in]: campaign.tagIds } },
            through: { attributes: [] }
          }, {
            model: Contact,
            as: 'contact',
            where: { isActive: true },
            attributes: ['id', 'name', 'phoneNumber']
          }],
          attributes: ['id']
        });

        // Remover duplicatas de contatos
        const contactMap = new Map();
        taggedTickets.forEach(ticket => {
          if (ticket.contact) {
            contactMap.set(ticket.contact.id, ticket.contact);
          }
        });
        contacts = Array.from(contactMap.values());
        break;

      case 'manual':
        if (!campaign.contactIds || campaign.contactIds.length === 0) {
          throw new Error('Nenhum contato selecionado manualmente');
        }

        contacts = await Contact.findAll({
          where: { 
            id: { [Op.in]: campaign.contactIds },
            isActive: true 
          },
          attributes: ['id', 'name', 'phoneNumber']
        });
        break;
    }

    // Atualizar total de contatos na campanha
    await campaign.update({ totalContacts: contacts.length });

    return contacts;
  }

  // Criar mensagens da campanha na fila
  async createCampaignMessages(campaignId, contacts) {
    const campaign = await Campaign.findByPk(campaignId);
    
    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }

    const messages = [];
    let scheduledFor = new Date();

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      // Calcular horário agendado com intervalo
      if (i > 0) {
        scheduledFor = new Date(scheduledFor.getTime() + (campaign.intervalSeconds * 1000));
      }

      const message = await CampaignMessage.create({
        campaignId: campaign.id,
        contactId: contact.id,
        phoneNumber: contact.phoneNumber,
        status: 'pending',
        scheduledFor: scheduledFor
      });

      messages.push(message);
    }

    return messages;
  }

  // Iniciar campanha
  async startCampaign(campaignId) {
    const campaign = await Campaign.findByPk(campaignId);
    
    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error('Apenas campanhas em rascunho ou agendadas podem ser iniciadas');
    }

    // Processar contatos
    const contacts = await this.processCampaignContacts(campaignId);
    
    if (contacts.length === 0) {
      throw new Error('Nenhum contato encontrado para esta campanha');
    }

    // Criar mensagens na fila
    await this.createCampaignMessages(campaignId, contacts);

    // Atualizar status da campanha
    await campaign.update({
      status: 'sending',
      sentAt: new Date()
    });

    // Iniciar processamento das mensagens
    this.processCampaignQueue(campaignId);

    return campaign;
  }

  // Processar fila de mensagens da campanha
  async processCampaignQueue(campaignId) {
    const campaign = await Campaign.findByPk(campaignId);
    
    if (!campaign || campaign.status !== 'sending') {
      return;
    }

    // Buscar mensagens pendentes ordenadas por horário agendado
    const pendingMessages = await CampaignMessage.findAll({
      where: {
        campaignId: campaignId,
        status: 'pending',
        scheduledFor: { [Op.lte]: new Date() }
      },
      order: [['scheduledFor', 'ASC']],
      limit: 1 // Processar uma por vez
    });

    if (pendingMessages.length === 0) {
      // Verificar se todas as mensagens foram processadas
      const totalMessages = await CampaignMessage.count({
        where: { campaignId: campaignId }
      });

      const processedMessages = await CampaignMessage.count({
        where: {
          campaignId: campaignId,
          status: { [Op.in]: ['sent', 'delivered', 'read', 'failed'] }
        }
      });

      if (totalMessages === processedMessages) {
        // Campanha concluída
        await campaign.update({
          status: 'completed',
          completedAt: new Date()
        });
        
        // Atualizar estatísticas finais
        await this.updateCampaignStats(campaignId);
      } else {
        // Agendar próxima verificação
        setTimeout(() => this.processCampaignQueue(campaignId), 5000);
      }
      return;
    }

    const message = pendingMessages[0];

    try {
      // Atualizar status para enviando
      await message.update({ status: 'sending' });

      // Enviar mensagem (aqui você integraria com o WhatsApp)
      const success = await this.sendWhatsAppMessage(campaign, message);

      if (success) {
        await message.update({
          status: 'sent',
          sentAt: new Date()
        });

        // Atualizar contador da campanha
        await campaign.increment('sentCount');
      } else {
        throw new Error('Falha no envio da mensagem');
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem da campanha:', error);
      
      await message.update({
        status: 'failed',
        failedAt: new Date(),
        errorMessage: error.message,
        retryCount: message.retryCount + 1
      });

      // Atualizar contador de falhas da campanha
      await campaign.increment('failedCount');
    }

    // Agendar próximo processamento
    setTimeout(() => this.processCampaignQueue(campaignId), campaign.intervalSeconds * 1000);
  }

  // Enviar mensagem via WhatsApp (implementar integração específica)
  async sendWhatsAppMessage(campaign, message) {
    try {
      // Aqui você implementaria a integração com o WhatsApp
      // Exemplo usando o sistema de sessões existente
      
      // Buscar sessão ativa
      const { Session } = await import('../models/index.js');
      const session = await Session.findByPk(campaign.sessionId);
      
      if (!session || session.status !== 'connected') {
        throw new Error('Sessão WhatsApp não conectada');
      }

      // Preparar dados da mensagem
      const messageData = {
        sessionId: session.id,
        to: message.phoneNumber,
        message: campaign.message,
        type: 'text'
      };

      // Se há mídia anexada
      if (campaign.mediaUrl && campaign.mediaType) {
        messageData.mediaUrl = campaign.mediaUrl;
        messageData.mediaType = campaign.mediaType;
        messageData.type = campaign.mediaType;
      }

      // Simular envio - aqui você chamaria a API real do WhatsApp
      console.log('Enviando mensagem da campanha:', messageData);
      
      // Por enquanto, simular sucesso
      await message.update({ messageId: `campaign_${Date.now()}_${message.id}` });
      
      return true;

    } catch (error) {
      console.error('Erro no envio WhatsApp:', error);
      return false;
    }
  }

  // Pausar campanha
  async pauseCampaign(campaignId) {
    const campaign = await Campaign.findByPk(campaignId);
    
    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }

    if (campaign.status !== 'sending') {
      throw new Error('Apenas campanhas em envio podem ser pausadas');
    }

    await campaign.update({ status: 'paused' });
    return campaign;
  }

  // Retomar campanha
  async resumeCampaign(campaignId) {
    const campaign = await Campaign.findByPk(campaignId);
    
    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }

    if (campaign.status !== 'paused') {
      throw new Error('Apenas campanhas pausadas podem ser retomadas');
    }

    await campaign.update({ status: 'sending' });
    
    // Retomar processamento
    this.processCampaignQueue(campaignId);
    
    return campaign;
  }

  // Atualizar estatísticas da campanha
  async updateCampaignStats(campaignId) {
    const campaign = await Campaign.findByPk(campaignId);
    
    if (!campaign) {
      return;
    }

    const stats = await CampaignMessage.findAll({
      where: { campaignId },
      attributes: [
        'status',
        [CampaignMessage.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, {});

    await campaign.update({
      sentCount: (statsMap.sent || 0) + (statsMap.delivered || 0) + (statsMap.read || 0),
      deliveredCount: (statsMap.delivered || 0) + (statsMap.read || 0),
      failedCount: statsMap.failed || 0,
      readCount: statsMap.read || 0
    });

    return campaign;
  }

  // Cancelar campanha
  async cancelCampaign(campaignId) {
    const campaign = await Campaign.findByPk(campaignId);
    
    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }

    if (campaign.status === 'completed') {
      throw new Error('Não é possível cancelar uma campanha já concluída');
    }

    // Cancelar mensagens pendentes
    await CampaignMessage.update(
      { 
        status: 'failed',
        failedAt: new Date(),
        errorMessage: 'Campanha cancelada pelo usuário'
      },
      {
        where: {
          campaignId,
          status: { [Op.in]: ['pending', 'sending'] }
        }
      }
    );

    await campaign.update({
      status: 'failed',
      completedAt: new Date()
    });

    return campaign;
  }

  // Duplicar campanha
  async duplicateCampaign(campaignId, userId) {
    const originalCampaign = await Campaign.findByPk(campaignId);
    
    if (!originalCampaign) {
      throw new Error('Campanha não encontrada');
    }

    const duplicatedCampaign = await Campaign.create({
      name: `${originalCampaign.name} (Cópia)`,
      description: originalCampaign.description,
      message: originalCampaign.message,
      mediaUrl: originalCampaign.mediaUrl,
      mediaType: originalCampaign.mediaType,
      segmentationType: originalCampaign.segmentationType,
      tagIds: originalCampaign.tagIds,
      contactIds: originalCampaign.contactIds,
      intervalSeconds: originalCampaign.intervalSeconds,
      sessionId: originalCampaign.sessionId,
      createdBy: userId,
      status: 'draft'
    });

    return duplicatedCampaign;
  }
}

export default new CampaignService();
