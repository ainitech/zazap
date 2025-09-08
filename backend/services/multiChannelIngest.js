// Serviço de ingestão genérica para canais não-whatsapp (instagram, facebook)
import { Op } from 'sequelize';
import { Session, Contact, Ticket, TicketMessage } from '../models/index.js';
import { emitToAll } from './socket.js';
import emitTicketsUpdate from './ticketBroadcast.js';

// Prefixos para IDs de contato por canal para evitar colisão com números do WhatsApp
const CHANNEL_PREFIX = {
  instagram: 'ig:',
  facebook: 'fb:'
};

const buildContactKey = (channel, rawId) => {
  const prefix = CHANNEL_PREFIX[channel] || `${channel}:`;
  return `${prefix}${rawId}`;
};

/**
 * Ingestão de mensagem inbound genérica
 * @param {Object} data
 * @param {string} data.channel - instagram | facebook
 * @param {string} data.sessionKey - valor usado em Session.whatsappId
 * @param {string} data.fromId - identificador bruto do remetente
 * @param {string} [data.fromName]
 * @param {string} [data.text]
 * @param {string} [data.messageType] - text, image, video, audio
 * @param {string} [data.mediaUrl] - URL da mídia se presente
 * @param {any} [data.raw]
 * @param {string} [data.threadId]
 */
export const ingestInboundMessage = async (data = {}) => {
  try {
    const { channel, sessionKey, fromId, fromName, text, messageType = 'text', mediaUrl, raw, threadId } = data;
    console.log('[MultiChannelIngest] 🎯 Iniciando ingestão de mensagem:', {
      channel,
      sessionKey,
      fromId,
      fromName,
      text: text?.substring(0, 100),
      messageType,
      threadId
    });
    console.log('[MultiChannelIngest] Dados completos recebidos:', JSON.stringify(data, null, 2));
    
    if (!channel || !sessionKey || !fromId) {
      console.error('[MultiChannelIngest] ❌ Dados insuficientes:', { channel, sessionKey, fromId });
      return;
    }
    
    // Localizar sessão
    const session = await Session.findOne({ where: { whatsappId: sessionKey } });
    if (!session) {
      console.error('[MultiChannelIngest] ❌ Sessão não encontrada:', sessionKey);
      return;
    }
    console.log('[MultiChannelIngest] ✅ Sessão encontrada:', {
      id: session.id,
      sessionKey: session.whatsappId,
      channel: session.channel
    });

    const contactKey = buildContactKey(channel, fromId);
    console.log('[MultiChannelIngest] 🔑 Chave do contato gerada:', contactKey);
    
    // Buscar ou criar contato
    let contact = await Contact.findOne({ where: { whatsappId: contactKey } });
    if (!contact) {
      console.log('[MultiChannelIngest] 📝 Criando novo contato...');
      contact = await Contact.create({
        whatsappId: contactKey,
        sessionId: session.id,
        name: fromName || contactKey,
        pushname: fromName || null,
        isGroup: false,
        formattedNumber: fromId
      });
      console.log('[MultiChannelIngest] ✅ Contato criado:', {
        id: contact.id,
        whatsappId: contact.whatsappId,
        name: contact.name
      });
      emitToAll('contact-updated', contact);
    } else {
      console.log('[MultiChannelIngest] ✅ Contato existente encontrado:', {
        id: contact.id,
        whatsappId: contact.whatsappId,
        name: contact.name
      });
    }

    // Buscar ticket existente aberto
    let ticket = await Ticket.findOne({
      where: {
        contact: contactKey,
        status: { [Op.in]: ['open', 'pending'] }
      },
      order: [['createdAt', 'DESC']]
    });

    if (!ticket) {
      console.log('[MultiChannelIngest] 📝 Criando novo ticket...');
      ticket = await Ticket.create({
        contact: contactKey,
        contactId: contact.id,
        sessionId: session.id,
        status: 'pending',
        chatStatus: 'waiting',
        unreadCount: 1,
        channel
      });
      console.log('[MultiChannelIngest] ✅ Ticket criado:', {
        id: ticket.id,
        contact: ticket.contact,
        status: ticket.status,
        chatStatus: ticket.chatStatus,
        channel: ticket.channel
      });
    } else {
      console.log('[MultiChannelIngest] ✅ Ticket existente encontrado:', {
        id: ticket.id,
        contact: ticket.contact,
        status: ticket.status,
        chatStatus: ticket.chatStatus,
        unreadCount: ticket.unreadCount
      });
      await ticket.update({
        unreadCount: ticket.unreadCount + 1
      });
      console.log('[MultiChannelIngest] ✅ Ticket atualizado com nova mensagem não lida');
    }

    const content = text || '[mensagem sem texto]';
    await ticket.update({ lastMessage: content });
    console.log('[MultiChannelIngest] ✅ Ticket atualizado com lastMessage:', content.substring(0, 50));

    const saved = await TicketMessage.create({
      ticketId: ticket.id,
      sender: 'contact',
      content: content,
      timestamp: new Date(),
      channel,
      participantId: threadId || null,
      messageType: messageType,
      fileUrl: mediaUrl || null
    });
    console.log('[MultiChannelIngest] ✅ TicketMessage criada:', {
      id: saved.id,
      ticketId: saved.ticketId,
      sender: saved.sender,
      content: saved.content.substring(0, 50),
      channel: saved.channel
    });

    const eventData = {
      id: saved.id,
      ticketId: ticket.id,
      sender: 'contact',
      content,
      timestamp: saved.timestamp,
      messageType: messageType,
      fileUrl: mediaUrl || null,
      channel,
      lastMessage: content,
      ticketUpdatedAt: ticket.updatedAt
    };
    console.log('[MultiChannelIngest] 🚀 Emitindo evento new-message:', JSON.stringify(eventData, null, 2));
    emitToAll('new-message', eventData);
    console.log('[MultiChannelIngest] ✅ Evento new-message emitido com sucesso');
    
    try { 
      await emitTicketsUpdate(); 
      console.log('[MultiChannelIngest] ✅ Tickets update emitido com sucesso');
    } catch (e) {
      console.error('[MultiChannelIngest] ❌ Erro ao emitir tickets update:', e);
    }
  } catch (e) {
    console.error('[MultiChannelIngest] ❌ Erro na ingestão de mensagem:', e);
    console.error('[MultiChannelIngest] ❌ Stack trace:', e.stack);
    console.error('[MultiChannelIngest] ❌ Dados que causaram erro:', JSON.stringify(data, null, 2));
  }
};

export default ingestInboundMessage;