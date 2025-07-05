import express from 'express';
import { Op } from 'sequelize';
import { authenticateToken } from '../middleware/auth.js';
import { Session, Ticket, TicketMessage } from '../models/index.js';
import { getContactInfo, getChatMedia } from '../services/whatsappjsService.js';
import { getContactInfoBaileys, getChatMediaBaileys } from '../services/baileysService.js';

const router = express.Router();

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

export default router;
