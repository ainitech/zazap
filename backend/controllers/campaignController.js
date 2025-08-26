import { Campaign, CampaignMessage, Contact, Tag, Ticket, User, Session } from '../models/index.js';
import { Op } from 'sequelize';
import campaignService from '../services/campaignService.js';

// Criar uma nova campanha
export const createCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      message,
      mediaUrl,
      mediaType,
      segmentationType,
      tagIds,
      contactIds,
      scheduledAt,
      intervalSeconds,
      sessionId
    } = req.body;

    // Validações básicas
    if (!name || !message || !sessionId) {
      return res.status(400).json({ 
        error: 'Nome, mensagem e sessão são obrigatórios' 
      });
    }

    if (!['all', 'tags', 'manual'].includes(segmentationType)) {
      return res.status(400).json({ 
        error: 'Tipo de segmentação inválido' 
      });
    }

    // Criar a campanha
    const campaign = await Campaign.create({
      name,
      description,
      message,
      mediaUrl,
      mediaType,
      segmentationType,
      tagIds: tagIds || [],
      contactIds: contactIds || [],
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      intervalSeconds: intervalSeconds || 30,
      sessionId,
      createdBy: req.user.id
    });

    // Buscar a campanha criada com associações
    const createdCampaign = await Campaign.findByPk(campaign.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: Session, as: 'session', attributes: ['id', 'whatsappId', 'status'] }
      ]
    });

    res.status(201).json(createdCampaign);
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Listar campanhas
export const getCampaigns = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sessionId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive: true };

    // Filtros
    if (status) {
      whereClause.status = status;
    }

    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Campaign.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: Session, as: 'session', attributes: ['id', 'whatsappId', 'status'] }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      campaigns: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar campanha por ID
export const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOne({
      where: { id, isActive: true },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: Session, as: 'session', attributes: ['id', 'whatsappId', 'status'] }
      ]
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Erro ao buscar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar campanha
export const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const campaign = await Campaign.findOne({
      where: { id, isActive: true }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    // Não permitir edição de campanhas em andamento ou finalizadas
    if (['sending', 'completed'].includes(campaign.status)) {
      return res.status(400).json({ 
        error: 'Não é possível editar campanhas em andamento ou finalizadas' 
      });
    }

    await campaign.update(updateData);

    const updatedCampaign = await Campaign.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: Session, as: 'session', attributes: ['id', 'whatsappId', 'status'] }
      ]
    });

    res.json(updatedCampaign);
  } catch (error) {
    console.error('Erro ao atualizar campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Excluir campanha (soft delete)
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOne({
      where: { id, isActive: true }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    // Não permitir exclusão de campanhas em andamento
    if (campaign.status === 'sending') {
      return res.status(400).json({ 
        error: 'Não é possível excluir campanhas em andamento' 
      });
    }

    await campaign.update({ isActive: false });

    res.json({ message: 'Campanha excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Processar contatos da campanha
export const processCampaignContacts = async (req, res) => {
  try {
    const { id } = req.params;

    const contacts = await campaignService.processCampaignContacts(id);

    res.json({
      totalContacts: contacts.length,
      contacts: contacts
    });
  } catch (error) {
    console.error('Erro ao processar contatos da campanha:', error);
    res.status(400).json({ error: error.message });
  }
};

// Iniciar campanha
export const startCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await campaignService.startCampaign(id);

    res.json({ 
      message: 'Campanha iniciada com sucesso',
      campaign
    });
  } catch (error) {
    console.error('Erro ao iniciar campanha:', error);
    res.status(400).json({ error: error.message });
  }
};

// Pausar campanha
export const pauseCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await campaignService.pauseCampaign(id);

    res.json({ 
      message: 'Campanha pausada com sucesso',
      campaign
    });
  } catch (error) {
    console.error('Erro ao pausar campanha:', error);
    res.status(400).json({ error: error.message });
  }
};

// Retomar campanha
export const resumeCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await campaignService.resumeCampaign(id);

    res.json({ 
      message: 'Campanha retomada com sucesso',
      campaign
    });
  } catch (error) {
    console.error('Erro ao retomar campanha:', error);
    res.status(400).json({ error: error.message });
  }
};

// Estatísticas da campanha
export const getCampaignStats = async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await Campaign.findOne({
      where: { id, isActive: true }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    const messages = await CampaignMessage.findAll({
      where: { campaignId: id },
      attributes: ['status'],
      raw: true
    });

    const stats = {
      total: messages.length,
      pending: messages.filter(m => m.status === 'pending').length,
      sending: messages.filter(m => m.status === 'sending').length,
      sent: messages.filter(m => m.status === 'sent').length,
      delivered: messages.filter(m => m.status === 'delivered').length,
      read: messages.filter(m => m.status === 'read').length,
      failed: messages.filter(m => m.status === 'failed').length,
      progress: campaign.getProgress(),
      successRate: campaign.getSuccessRate()
    };

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas da campanha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Duplicar campanha
export const duplicateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const duplicatedCampaign = await campaignService.duplicateCampaign(id, req.user.id);

    const createdCampaign = await Campaign.findByPk(duplicatedCampaign.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: Session, as: 'session', attributes: ['id', 'whatsappId', 'status'] }
      ]
    });

    res.status(201).json(createdCampaign);
  } catch (error) {
    console.error('Erro ao duplicar campanha:', error);
    res.status(400).json({ error: error.message });
  }
};
