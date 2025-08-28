import { createWhatsappJsSession, sendText, sendMedia } from '../services/whatsappjsService.js';
import { Ticket, Session, TicketMessage } from '../models/index.js';
const { handleWhatsappJsMessage } = await import('../services/messageCallbacks.js');

// Inicializar sessão (gera QRCode)
export const initSession = async (req, res) => {
  const { sessionId } = req.body;
  
  try {
    // Buscar ou criar sessão no banco de dados
    let session = await Session.findOne({ where: { whatsappId: sessionId } });
    if (!session) {
      session = await Session.create({
        userId: req.user.id,
        whatsappId: sessionId,
        library: 'whatsappjs',
        status: 'disconnected'
      });
    }

    let qrCodeSent = false;
    
    // Criar callback para processamento de mensagens
    const onMessage = async (message) => {
      await handleWhatsappJsMessage(message, session.id);
    };
    
    createWhatsappJsSession(sessionId, 
      async (client) => {
        // Atualiza status da sessão no banco usando o ID correto
        await Session.update({ status: 'connected' }, { where: { id: session.id } });
        if (!qrCodeSent) {
          res.json({ message: 'Sessão whatsapp-web.js conectada!', status: 'connected' });
        }
      }, 
      onMessage, // Usar callback centralizado para processamento de mensagens
      async (qrCodeDataURL) => {
        // Callback do QR Code - retorna o QR Code como base64
        if (!qrCodeSent) {
          qrCodeSent = true;
          res.json({ 
            message: 'QR Code gerado!', 
            qr: qrCodeDataURL,
            status: 'waiting_for_qr'
          });
        }
      }
    );
  } catch (error) {
    console.error('Erro ao iniciar sessão:', error);
    res.status(500).json({ error: 'Erro ao iniciar sessão whatsapp-web.js' });
  }
};

// Enviar mensagem de texto
export const sendTextMessage = async (req, res) => {
  const { sessionId, to, text } = req.body;
  try {
    // Buscar sessão no banco
    const session = await Session.findOne({ where: { whatsappId: sessionId } });
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    await sendText(sessionId, to, text);
    
    // Identifica ou cria ticket usando o ID numérico da sessão
    let ticket = await Ticket.findOne({ 
      where: { 
        sessionId: session.id, // Usar o ID numérico da sessão
        contact: to 
      } 
    });
    
    if (!ticket) {
      ticket = await Ticket.create({ 
        sessionId: session.id, // Usar o ID numérico da sessão
        contact: to, 
        lastMessage: text, 
        unreadCount: 0 
      });
    } else {
      ticket.lastMessage = text;
      await ticket.save();
    }
    
    // Salva mensagem enviada
    await TicketMessage.create({
      ticketId: ticket.id,
      sender: 'user',
      content: text,
      timestamp: new Date(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Enviar mídia (imagem, vídeo, etc)
export const sendMediaMessage = async (req, res) => {
  const { sessionId, to, base64, filename, mimetype } = req.body;
  try {
    // Buscar sessão no banco
    const session = await Session.findOne({ where: { whatsappId: sessionId } });
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    await sendMedia(sessionId, to, base64, filename, mimetype);
    
    // Buscar ou criar ticket usando o ID numérico da sessão
    let ticket = await Ticket.findOne({ 
      where: { 
        sessionId: session.id, // Usar o ID numérico da sessão
        contact: to 
      } 
    });
    
    if (!ticket) {
      ticket = await Ticket.create({ 
        sessionId: session.id,
        contact: to, 
        lastMessage: `📎 ${filename}`, 
        unreadCount: 0,
        status: 'open'
      });
    } else {
      ticket.lastMessage = `📎 ${filename}`;
      await ticket.save();
    }
    
    // Salvar mensagem de mídia no ticket
    await TicketMessage.create({
      ticketId: ticket.id,
      sender: 'user',
      content: `📎 Arquivo enviado: ${filename}`,
      timestamp: new Date(),
      fileUrl: base64, // Pode ser melhorado para salvar em arquivo
      fileName: filename,
      fileType: mimetype
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
