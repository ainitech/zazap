import { createBaileysSession, sendText, sendMedia } from '../services/baileysService.js';
import { Ticket, Session, TicketMessage } from '../models/index.js';
const { handleBaileysMessage } = await import('../services/messageCallbacks.js');

// Função para normalizar sessionId (remover device ID)
const normalizeSessionId = (sessionId) => {
  return sessionId.split(':')[0];
};

// Inicializar sessão (gera QRCode)
export const initSession = async (req, res) => {
  const { sessionId } = req.body;

  try {
    // Sempre usar o número base para evitar problemas com device IDs
    const baseNumber = normalizeSessionId(sessionId);

    // Buscar ou criar sessão no banco de dados usando apenas o número base
    let session = await Session.findOne({ where: { whatsappId: baseNumber } });
    if (!session) {
      session = await Session.create({
        userId: req.user.id,
        whatsappId: baseNumber, // Sempre salvar apenas o número base
        library: 'baileys',
        status: 'disconnected'
      });
    }

    let qrCodeSent = false;

    // Criar callback para processamento de mensagens
    const onMessage = async (message) => {
      await handleBaileysMessage(message, session.id);
    };

    await createBaileysSession(baseNumber, // Usar apenas o número base
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
        // Sempre manter o número base, independente do device ID atual
        await Session.update({
          status: 'connected',
          whatsappId: baseNumber // Sempre manter apenas o número base
        }, { where: { id: session.id } });

        if (!qrCodeSent) {
          res.json({ message: 'Sessão Baileys conectada!', status: 'connected' });
        }
      },
      onMessage // Usar callback centralizado para processamento de mensagens
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
    // Sempre usar o número base para evitar problemas com device IDs
    const baseNumber = normalizeSessionId(sessionId);

    // Buscar sessão no banco usando apenas o número base
    const session = await Session.findOne({ where: { whatsappId: baseNumber } });
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    await sendText(baseNumber, to, text); // Usar apenas o número base

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
    // Sempre usar o número base para evitar problemas com device IDs
    const baseNumber = normalizeSessionId(sessionId);

    await sendMedia(baseNumber, to, buffer, mimetype); // Usar apenas o número base

    // Buscar sessão para obter o ID numérico
    const session = await Session.findOne({ where: { whatsappId: baseNumber } });
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    await Ticket.create({
      sessionId: session.id, // Usar o ID numérico da sessão
      contact: to,
      lastMessage: mimetype,
      unreadCount: 0
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
