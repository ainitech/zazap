import { createWhatsappJsSession, sendText, sendMedia } from '../services/whatsappjsService.js';
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
        library: 'whatsappjs',
        status: 'disconnected'
      });
    }

    let qrCodeSent = false;
    
    createWhatsappJsSession(sessionId, 
      async (client) => {
        // Atualiza status da sessão no banco usando o ID correto
        await Session.update({ status: 'connected' }, { where: { id: session.id } });
        if (!qrCodeSent) {
          res.json({ message: 'Sessão whatsapp-web.js conectada!', status: 'connected' });
        }
      }, 
      async (msg, client) => {
        console.log(`📨 === NOVA MENSAGEM RECEBIDA ===`);
        console.log(`📱 De: ${msg.from}`);
        console.log(`� Conteúdo: ${msg.body}`);
        console.log(`🔢 SessionId (string): ${sessionId}`);
        console.log(`🔢 Session ID (numérico): ${session.id}`);
        
        try {
          // Buscar ticket usando o ID numérico da sessão
          let ticket = await Ticket.findOne({ 
            where: { 
              sessionId: session.id, // Usar o ID numérico da sessão
              contact: msg.from 
            } 
          });
          
          console.log(`🔍 Ticket encontrado:`, ticket ? `#${ticket.id}` : 'Nenhum');
          
          if (!ticket) {
            // Criar novo ticket para novo contato
            console.log(`🎫 Criando novo ticket...`);
            ticket = await Ticket.create({
              sessionId: session.id,
              contact: msg.from,
              lastMessage: msg.body || '',
              unreadCount: 1,
              status: 'open' // Garantir que o ticket seja criado como aberto
            });
            console.log(`✅ Novo ticket criado: #${ticket.id} para ${msg.from}`);
            console.log(`📊 Dados do ticket:`, {
              id: ticket.id,
              sessionId: ticket.sessionId,
              contact: ticket.contact,
              status: ticket.status,
              unreadCount: ticket.unreadCount
            });
          } else {
            // Atualizar ticket existente
            console.log(`📝 Atualizando ticket existente #${ticket.id}`);
            const oldUnreadCount = ticket.unreadCount;
            ticket.lastMessage = msg.body || '';
            ticket.unreadCount += 1;
            ticket.updatedAt = new Date();
            // Se o ticket estava fechado, reabrir
            if (ticket.status === 'closed') {
              ticket.status = 'open';
              console.log(`🔄 Ticket #${ticket.id} reaberto por nova mensagem`);
            }
            await ticket.save();
            console.log(`✅ Ticket #${ticket.id} atualizado - Não lidas: ${oldUnreadCount} → ${ticket.unreadCount}`);
          }
          
          // Salvar mensagem no ticket
          console.log(`💾 Salvando mensagem no ticket #${ticket.id}...`);
          const ticketMessage = await TicketMessage.create({
            ticketId: ticket.id,
            sender: 'contact',
            content: msg.body || '',
            timestamp: new Date()
          });
          
          console.log(`✅ Mensagem salva: ID ${ticketMessage.id} no ticket #${ticket.id}`);
          console.log(`🏁 === PROCESSAMENTO CONCLUÍDO ===\n`);
          
        } catch (error) {
          console.error('❌ === ERRO AO PROCESSAR MENSAGEM ===');
          console.error('❌ Erro:', error.message);
          console.error('❌ Stack:', error.stack);
          console.error('❌ ================================\n');
        }
      },
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
