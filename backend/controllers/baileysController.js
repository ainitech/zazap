import { createBaileysSession, sendText, sendMedia } from '../services/baileysService.js';
import { Ticket, Session, TicketMessage } from '../models/index.js';

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
        library: 'baileys',
        status: 'disconnected'
      });
    }

    let qrCodeSent = false;
    
    await createBaileysSession(sessionId, 
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
      },
      async (sock) => {
        await Session.update({ status: 'connected' }, { where: { id: session.id } });
        if (!qrCodeSent) {
          res.json({ message: 'Sessão Baileys conectada!', status: 'connected' });
        }
      }, 
      async (msg, sock) => {
        try {
          const messageContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
          const contactId = msg.key.remoteJid;
          
          console.log(`📨 Nova mensagem Baileys de ${contactId}: ${messageContent}`);
          
          // Buscar ticket usando o ID numérico da sessão
          let ticket = await Ticket.findOne({ 
            where: { 
              sessionId: session.id, // Usar o ID numérico da sessão
              contact: contactId 
            } 
          });
          
          if (!ticket) {
            // Criar novo ticket para novo contato
            ticket = await Ticket.create({
              sessionId: session.id,
              contact: contactId,
              lastMessage: messageContent,
              unreadCount: 1,
              status: 'open' // Garantir que o ticket seja criado como aberto
            });
            console.log(`🎫 Novo ticket criado: #${ticket.id} para ${contactId}`);
          } else {
            // Atualizar ticket existente
            ticket.lastMessage = messageContent;
            ticket.unreadCount += 1;
            ticket.updatedAt = new Date();
            // Se o ticket estava fechado, reabrir
            if (ticket.status === 'closed') {
              ticket.status = 'open';
              console.log(`🔄 Ticket #${ticket.id} reaberto por nova mensagem`);
            }
            await ticket.save();
            console.log(`📝 Ticket #${ticket.id} atualizado`);
          }
          
          // Salvar mensagem no ticket
          const ticketMessage = await TicketMessage.create({
            ticketId: ticket.id,
            sender: 'contact',
            content: messageContent,
            timestamp: new Date()
          });
          
          console.log(`💾 Mensagem salva no ticket #${ticket.id}`);
          
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      }
    );
  } catch (error) {
    console.error('Erro ao iniciar sessão:', error);
    res.status(500).json({ error: 'Erro ao iniciar sessão Baileys' });
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
  const { sessionId, to, buffer, mimetype } = req.body;
  try {
    await sendMedia(sessionId, to, buffer, mimetype);
    await Ticket.create({ sessionId, contact: to, lastMessage: mimetype, unreadCount: 0 });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
