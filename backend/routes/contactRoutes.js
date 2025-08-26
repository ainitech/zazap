import express from 'express';
import { Op } from 'sequelize';
import { authenticateToken } from '../middleware/auth.js';
import { Session, Ticket, TicketMessage, Contact } from '../models/index.js';
import { getContactInfo, getChatMedia } from '../services/whatsappjsService.js';
import { getContactInfoBaileys, getChatMediaBaileys } from '../services/baileysService.js';
import { emitToAll } from '../services/socket.js';

const router = express.Router();

// GET /api/contacts - Listar contatos (com busca e filtros opcionais)
router.get('/', authenticateToken, async (req, res) => {
  try {
  const { search = '', sessionId, limit = 50 } = req.query;
    const includeGroups = (req.query.includeGroups === 'true' || req.query.includeGroups === true);

    const andConds = [];

    // Garantir que sessionId seja número, quando fornecido
    if (sessionId) {
      const sid = parseInt(sessionId, 10);
      if (!Number.isNaN(sid)) {
        andConds.push({ sessionId: sid });
      }
    }

    // Por padrão NÃO incluir grupos; considerar isGroup null como contato (não grupo)
    if (!includeGroups) {
      andConds.push({ [Op.or]: [{ isGroup: false }, { isGroup: null }] });
    }

    if (search) {
      const like = `%${search}%`;
      andConds.push({
        [Op.or]: [
          { name: { [Op.iLike]: like } },
          { pushname: { [Op.iLike]: like } },
          { whatsappId: { [Op.iLike]: like } },
          { formattedNumber: { [Op.iLike]: like } }
        ]
      });
    }

    const where = andConds.length ? { [Op.and]: andConds } : undefined;

    // Compute limit: support limit=all to return all rows
    let finalLimit = undefined;
    if (!(String(limit).toLowerCase() === 'all')) {
      const n = parseInt(limit) || 50;
      finalLimit = Math.min(n, 500);
    }

    const contacts = await Contact.findAll({
      where,
      order: [
        ['updatedAt', 'DESC'],
        ['name', 'ASC']
      ],
      ...(finalLimit ? { limit: finalLimit } : {})
    });

    res.json(contacts);
  } catch (error) {
    console.error('Erro ao listar contatos:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/contacts/:ticketId/info - Buscar informações do contato
router.get('/:ticketId/info', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    const session = await Session.findByPk(ticket.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    let contactInfo;
    
    if (session.library === 'whatsappjs') {
      contactInfo = await getContactInfo(session.whatsappId, ticket.contact);
    } else if (session.library === 'baileys') {
      contactInfo = await getContactInfoBaileys(session.whatsappId, ticket.contact);
    } else {
      return res.status(400).json({ error: 'Biblioteca não suportada' });
    }

    res.json(contactInfo);
  } catch (error) {
    console.error('Erro ao buscar informações do contato:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/contacts/:ticketId/media - Buscar mídias do chat
router.get('/:ticketId/media', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { limit = 50 } = req.query;
    
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    const session = await Session.findByPk(ticket.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    let mediaInfo = [];
    
    if (session.library === 'whatsappjs') {
      mediaInfo = await getChatMedia(session.whatsappId, ticket.contact, parseInt(limit));
    } else if (session.library === 'baileys') {
      mediaInfo = await getChatMediaBaileys(session.whatsappId, ticket.contact, parseInt(limit));
    } else {
      return res.status(400).json({ error: 'Biblioteca não suportada' });
    }

    res.json(mediaInfo);
  } catch (error) {
    console.error('Erro ao buscar mídias do chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/contacts/:ticketId/attachments - Buscar anexos/documentos do ticket
router.get('/:ticketId/attachments', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    // Buscar mensagens com arquivos
    const messages = await TicketMessage.findAll({
      where: { 
        ticketId,
        fileName: { [Op.ne]: null }
      },
      order: [['timestamp', 'DESC']]
    });

    const attachments = messages.map(message => ({
      id: message.id,
      filename: message.fileName,
      mimetype: message.fileMimeType,
      size: message.fileSize,
      url: message.fileUrl,
      timestamp: message.timestamp,
      sender: message.sender,
      caption: message.content
    }));

    res.json(attachments);
  } catch (error) {
    console.error('Erro ao buscar anexos:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/contacts/contact/:contactId - Deletar contato e todos os dados relacionados
router.delete('/contact/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    
    console.log(`🗑️ Iniciando exclusão do contato ${contactId}...`);
    
    // Buscar o contato
    const contact = await Contact.findByPk(contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }
    
    // Buscar todos os tickets relacionados ao contato
    const tickets = await Ticket.findAll({
      where: { contactId: contactId }
    });
    
    console.log(`📋 Encontrados ${tickets.length} tickets para exclusão`);
    
    // Para cada ticket, deletar mensagens relacionadas
    for (const ticket of tickets) {
      console.log(`🗑️ Deletando mensagens do ticket ${ticket.id}...`);
      await TicketMessage.destroy({
        where: { ticketId: ticket.id }
      });
    }
    
    // Deletar todos os tickets
    await Ticket.destroy({
      where: { contactId: contactId }
    });
    
    // Deletar o contato
    await contact.destroy();
    
    console.log(`✅ Contato ${contactId} e todos os dados relacionados foram excluídos`);
    
    // Emitir atualização para todos os clientes conectados
    const remainingTickets = await Ticket.findAll({
      include: [
        {
          model: Contact,
          required: false
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    
    emitToAll('tickets-update', remainingTickets);
    emitToAll('contact-deleted', { contactId });
    
    res.json({ 
      success: true, 
      message: 'Contato e todos os dados relacionados foram excluídos com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao deletar contato:', error);
    res.status(500).json({ error: error.message });
  }

});

// DELETE /api/contacts/ticket/:ticketId - Deletar ticket e dados relacionados
router.delete('/ticket/:ticketId', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    const session = await Session.findByPk(ticket.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    // Deletar mensagens do ticket
    await TicketMessage.destroy({ where: { ticketId } });

    // Deletar o ticket
    await Ticket.destroy({ where: { id: ticketId } });

    // Emitir evento para todos os sockets conectados
    emitToAll('ticketDeleted', { ticketId });

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar contato:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/contacts/:contactId - Buscar dados do contato por ID
router.get('/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const contact = await Contact.findByPk(contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }
    res.json(contact);
  } catch (error) {
    console.error('Erro ao buscar contato por ID:', error);
    res.status(500).json({ error: error.message });
  }
});


// GET /api/contacts/:contactId/media - Buscar todas as mídias de todos os tickets do contato
router.get('/contact/:contactId/media', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    // Busca todos os tickets desse contato
    const tickets = await Ticket.findAll({ where: { contactId } });
    if (!tickets || tickets.length === 0) {
      return res.json([]);
    }
    const ticketIds = tickets.map(t => t.id);
    // Busca todas as mensagens com mídia desses tickets
    const messages = await TicketMessage.findAll({
      where: {
        ticketId: { [Op.in]: ticketIds },
        fileUrl: { [Op.ne]: null }
      },
      order: [['timestamp', 'DESC']]
    });
    const medias = messages.map(message => ({
      id: message.id,
      ticketId: message.ticketId,
      filename: message.fileName,
      mimetype: message.fileType || message.fileMimeType,
      size: message.fileSize,
      url: message.fileUrl,
      timestamp: message.timestamp,
      sender: message.sender,
      caption: message.content
    }));
    res.json(medias);
  } catch (error) {
    console.error('Erro ao buscar mídias de todos os tickets do contato:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
