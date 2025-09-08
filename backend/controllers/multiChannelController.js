import { Session, Ticket, TicketMessage } from '../models/index.js';
import { emitToAll } from '../services/socket.js';
import { ingestInboundMessage } from '../services/multiChannelIngest.js';
import { createBaileysSession, sendText as sendWhatsText, sendMedia as sendWhatsMedia } from '../services/baileysService.js';
import { createInstagramSession, sendInstagramText, sendInstagramMedia } from '../services/instagramService.js';
import { createFacebookSession, sendFacebookText, sendFacebookMedia } from '../services/facebookService.js';

// Mapa de handlers por canal
const channelHandlers = {
  whatsapp: {
    create: async (sessionId, payload, onReady, onMessage, res) => {
      await createBaileysSession(sessionId, (qr) => {
        // QR somente para WhatsApp
        if (!res.headersSent) {
          res.json({ channel: 'whatsapp', status: 'waiting_for_qr', qr });
        }
      }, () => {
        if (!res.headersSent) {
          res.json({ channel: 'whatsapp', status: 'connected' });
        }
      }, onMessage);
    },
    sendText: sendWhatsText,
    sendMedia: sendWhatsMedia
  },
  instagram: {
    create: async (sessionId, payload, onReady, onMessage, res) => {
      await createInstagramSession(sessionId, payload?.credentials, () => {
        if (!res.headersSent) {
          res.json({ channel: 'instagram', status: 'connected' });
        }
        onReady && onReady();
      }, onMessage);
    },
    sendText: sendInstagramText,
    sendMedia: sendInstagramMedia
  },
  facebook: {
    create: async (sessionId, payload, onReady, onMessage, res) => {
      await createFacebookSession(sessionId, payload?.credentials, () => {
        if (!res.headersSent) {
          res.json({ channel: 'facebook', status: 'connected' });
        }
        onReady && onReady();
      }, onMessage);
    },
    sendText: sendFacebookText,
    sendMedia: sendFacebookMedia
  }
};

export const initMultiChannelSession = async (req, res) => {
  const { sessionId, channel = 'whatsapp', credentials } = req.body;
  try {
    if (!channelHandlers[channel]) {
      return res.status(400).json({ error: 'Canal inválido' });
    }

    // Criar ou localizar session
    let session = await Session.findOne({ where: { whatsappId: sessionId } });
    if (!session) {
      session = await Session.create({
        userId: req.user.id,
        whatsappId: sessionId,
        library: channel === 'whatsapp' ? 'baileys' : 'custom',
        channel,
        status: 'connecting'
      });
    } else {
      await session.update({ channel });
    }

    const onMessage = async (message) => {
      if (!message) return;
      // Normaliza diferente por canal
      if (channel === 'facebook') {
        await ingestInboundMessage({
          channel,
          sessionKey: sessionId,
            fromId: message.from || message.senderID || message.threadID,
          text: message.body,
          threadId: message.threadID,
          raw: message
        });
      } else if (channel === 'instagram') {
        // Quando implementarmos realtime, adaptar aqui
        console.log('[instagram] onMessage recebido (placeholder)', message.id || '');
      }
    };

    await channelHandlers[channel].create(sessionId, { credentials }, async () => {
      try {
        await session.update({ status: 'connected' });
        emitToAll('session-status-update', { sessionId: session.id, status: 'connected' });
      } catch (e) {
        console.log('Falha ao atualizar status sessão multi canal:', e.message);
      }
    }, onMessage, res);
  } catch (e) {
    console.error('Erro ao iniciar sessão multi canal:', e);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao iniciar sessão multi canal' });
    }
  }
};

export const sendMultiChannelText = async (req, res) => {
  const { sessionId, to, text } = req.body;
  try {
    const session = await Session.findOne({ where: { whatsappId: sessionId } });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    const handler = channelHandlers[session.channel];
    if (!handler) return res.status(400).json({ error: 'Canal não suportado' });

    await handler.sendText(sessionId, to, text);

    // Salvar ticket e mensagem (básico)
    let ticket = await Ticket.findOne({ where: { contact: to, sessionId: session.id } });
    if (!ticket) {
      ticket = await Ticket.create({ contact: to, sessionId: session.id, lastMessage: text, channel: session.channel });
    } else {
      await ticket.update({ lastMessage: text });
    }
    await TicketMessage.create({ ticketId: ticket.id, sender: 'user', content: text, channel: session.channel });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
};

export const sendMultiChannelMedia = async (req, res) => {
  const { sessionId, to } = req.body;
  const file = req.file; // usar multer
  try {
    const session = await Session.findOne({ where: { whatsappId: sessionId } });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    const handler = channelHandlers[session.channel];
    if (!handler) return res.status(400).json({ error: 'Canal não suportado' });

    await handler.sendMedia(sessionId, to, file?.buffer, file?.mimetype);

    let ticket = await Ticket.findOne({ where: { contact: to, sessionId: session.id } });
    if (!ticket) {
      ticket = await Ticket.create({ contact: to, sessionId: session.id, lastMessage: file?.originalname, channel: session.channel });
    } else {
      await ticket.update({ lastMessage: file?.originalname });
    }
    await TicketMessage.create({ ticketId: ticket.id, sender: 'user', content: file?.originalname, channel: session.channel, fileUrl: null, fileName: file?.originalname, fileType: file?.mimetype });

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao enviar mídia' });
  }
};
