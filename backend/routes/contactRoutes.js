import express from 'express';
import { Op } from 'sequelize';
import authMiddleware from '../middleware/authMiddleware.js';
import { Session, Ticket, TicketMessage, Contact } from '../models/index.js';
import { getContactInfoBaileys, getChatMediaBaileys } from '../services/baileysService.js';
import { emitToAll } from '../services/socket.js';

const router = express.Router();

// GET /api/contacts - Listar contatos (com busca e filtros opcionais)
router.get('/', authMiddleware, async (req, res) => {
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
router.get('/:ticketId/info', authMiddleware, async (req, res) => {
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

  const contactInfo = await getContactInfoBaileys(session.whatsappId, ticket.contact);

    res.json(contactInfo);
  } catch (error) {
    console.error('Erro ao buscar informações do contato:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/contacts/:ticketId/media - Buscar mídias do chat
router.get('/:ticketId/media', authMiddleware, async (req, res) => {
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

  const mediaInfo = await getChatMediaBaileys(session.whatsappId, ticket.contact, parseInt(limit));

    res.json(mediaInfo);
  } catch (error) {
    console.error('Erro ao buscar mídias do chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/contacts/:ticketId/attachments - Buscar anexos/documentos do ticket
router.get('/:ticketId/attachments', authMiddleware, async (req, res) => {
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
router.delete('/contact/:contactId', authMiddleware, async (req, res) => {
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

// POST /api/contacts/contact - Criar um novo contato
router.post('/contact', authMiddleware, async (req, res) => {
  try {
    const { name, pushname, number, whatsappId, sessionId, isGroup, formattedNumber, profilePicUrl } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId é obrigatório' });
    }

    let jid = whatsappId || number;
    if (!jid) {
      return res.status(400).json({ error: 'Informe whatsappId ou number' });
    }

    // Normalização: tolera números puros, @lid, @c.us/@s.whatsapp.net e grupos
    const normalizeJid = (val) => {
      if (!val) return null;
      if (val.endsWith('@g.us')) return val; // grupo
      let clean = String(val).trim();
      clean = clean.replace(/@lid$/, ''); // remover @lid
      // Se já vier com domínio aceito, mantém
      if (/@(c\.us|s\.whatsapp\.net)$/i.test(clean)) return clean;
      if (/^\d+$/.test(clean)) return `${clean}@s.whatsapp.net`;
      // fallback: manter como veio
      return clean;
    };

    jid = normalizeJid(jid);

    // Verificar duplicidade
    const existing = await Contact.findOne({ where: { whatsappId: jid, sessionId } });
    if (existing) {
      return res.status(409).json({ error: 'Contato já existe para esta sessão', contact: existing });
    }

    const created = await Contact.create({
      whatsappId: jid,
      sessionId,
      name: name || null,
      pushname: pushname || null,
      formattedNumber: formattedNumber || (jid.includes('@') ? jid.split('@')[0] : jid),
      profilePicUrl: profilePicUrl || null,
      isGroup: Boolean(isGroup)
    });

    emitToAll('contact-updated', created);
    res.status(201).json({ success: true, contact: created });
  } catch (error) {
    console.error('Erro ao criar contato:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/contacts/contact/:contactId - Atualizar dados do contato (ex.: nome)
router.put('/contact/:contactId', authMiddleware, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { name, pushname, formattedNumber, profilePicUrl } = req.body || {};

    const contact = await Contact.findByPk(contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    const allowed = {};
    if (typeof name === 'string') allowed.name = name;
    if (typeof pushname === 'string') allowed.pushname = pushname;
    if (typeof formattedNumber === 'string') allowed.formattedNumber = formattedNumber;
    if (typeof profilePicUrl === 'string') allowed.profilePicUrl = profilePicUrl;

    await contact.update(allowed);

    // Emitir atualização para todos os clientes conectados
    emitToAll('contact-updated', contact);

    res.json({ success: true, contact });
  } catch (error) {
    console.error('Erro ao atualizar contato:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alias: PUT /api/contacts/:contactId (mesma funcionalidade de atualizar contato)
router.put('/:contactId', authMiddleware, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { name, pushname, formattedNumber, profilePicUrl } = req.body || {};
    const contact = await Contact.findByPk(contactId);
    if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });
    const allowed = {};
    if (typeof name === 'string') allowed.name = name;
    if (typeof pushname === 'string') allowed.pushname = pushname;
    if (typeof formattedNumber === 'string') allowed.formattedNumber = formattedNumber;
    if (typeof profilePicUrl === 'string') allowed.profilePicUrl = profilePicUrl;
    await contact.update(allowed);
    emitToAll('contact-updated', contact);
    res.json({ success: true, contact });
  } catch (error) {
    console.error('Erro ao atualizar contato (alias):', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/contacts/ticket/:ticketId - Deletar ticket e dados relacionados
router.delete('/ticket/:ticketId', authMiddleware, async (req, res) => {
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
router.get('/:contactId', authMiddleware, async (req, res) => {
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
router.get('/contact/:contactId/media', authMiddleware, async (req, res) => {
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

// POST /api/contacts/contact/:contactId/message - Salvar uma nota/mensagem vinculada ao contato
router.post('/contact/:contactId/message', authMiddleware, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { content, sessionId } = req.body || {};
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'content é obrigatório' });
    }

    const contact = await Contact.findByPk(contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    // Encontrar ticket aberto mais recente para o contato, senão criar um rascunho
    let ticket = await Ticket.findOne({
      where: { contactId: contact.id, status: ['open', 'pending'] },
      order: [['updatedAt', 'DESC']]
    });

    if (!ticket) {
      // Criar um ticket rascunho para armazenar a mensagem vinculada ao contato
      ticket = await Ticket.create({
        contact: contact.whatsappId,
        contactId: contact.id,
        sessionId: sessionId || contact.sessionId,
        status: 'open',
        chatStatus: 'waiting',
        unreadCount: 0
      });
    }

    const message = await TicketMessage.create({
      ticketId: ticket.id,
      sender: 'user',
      content: content.trim(),
      timestamp: new Date(),
      isFromGroup: false,
      messageType: 'text'
    });

    emitToAll('message-update', { ticketId: ticket.id, message });
    res.status(201).json({ success: true, ticketId: ticket.id, message });
  } catch (error) {
    console.error('Erro ao salvar mensagem do contato:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alias: POST /api/contacts/:contactId/message
router.post('/:contactId/message', authMiddleware, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { content, sessionId } = req.body || {};
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'content é obrigatório' });
    }
    const contact = await Contact.findByPk(contactId);
    if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });

    let ticket = await Ticket.findOne({
      where: { contactId: contact.id, status: ['open', 'pending'] },
      order: [['updatedAt', 'DESC']]
    });
    if (!ticket) {
      ticket = await Ticket.create({
        contact: contact.whatsappId,
        contactId: contact.id,
        sessionId: sessionId || contact.sessionId,
        status: 'open',
        chatStatus: 'waiting',
        unreadCount: 0
      });
    }
    const message = await TicketMessage.create({
      ticketId: ticket.id,
      sender: 'user',
      content: content.trim(),
      timestamp: new Date(),
      isFromGroup: false,
      messageType: 'text'
    });
    emitToAll('message-update', { ticketId: ticket.id, message });
    res.status(201).json({ success: true, ticketId: ticket.id, message });
  } catch (error) {
    console.error('Erro ao salvar mensagem do contato (alias):', error);
    res.status(500).json({ error: error.message });
  }
});

// Alias: DELETE /api/contacts/:contactId
router.delete('/:contactId', authMiddleware, async (req, res) => {
  try {
    const { contactId } = req.params;
    const contact = await Contact.findByPk(contactId);
    if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });

    const tickets = await Ticket.findAll({ where: { contactId } });
    await TicketMessage.destroy({ where: { ticketId: tickets.map(t => t.id) } });
    await Ticket.destroy({ where: { contactId } });
    await contact.destroy();

    const remainingTickets = await Ticket.findAll({
      include: [{ model: Contact, required: false }],
      order: [['updatedAt', 'DESC']]
    });
    emitToAll('tickets-update', remainingTickets);
    emitToAll('contact-deleted', { contactId });
    res.json({ success: true });
  } catch (error) {
    console.error('Erro no delete de contato (alias):', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
