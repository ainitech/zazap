import { TicketMessage, Ticket, Session, Contact, User, Queue } from '../models/index.js';
import { emitToTicket, emitToAll } from './socket.js';
import fs from 'fs';
import path from 'path';

// ===============================
// CALLBACK PARA WHATSAPP.JS
// ===============================
export const createWhatsappJsMessageCallback = (session) => {
  return async (msg, client) => {
    console.log(`📨 === NOVA MENSAGEM WHATSAPP.JS RECEBIDA ===`);
    console.log(`📱 De: ${msg.from}`);
    console.log(`📝 Conteúdo: ${msg.body}`);
    console.log(`🎥 Tem mídia: ${msg.hasMedia}`);
    console.log(`📊 Tipo: ${msg.type}`);
    console.log(`🔢 SessionId (string): ${session.whatsappId}`);
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
      
      // Atualizar/criar contato
      await updateContactOnMessage(msg.from, session.id, client);
      
      // Determinar conteúdo da mensagem
      let messageContent = msg.body || '';
      let lastMessage = messageContent;
      
      // Se é mídia, definir um texto descritivo
      if (msg.hasMedia) {
        switch (msg.type) {
          case 'image':
            lastMessage = '📷 Imagem';
            break;
          case 'audio':
          case 'ptt': // Push-to-talk (áudio do WhatsApp)
            lastMessage = '🎵 Áudio';
            break;
          case 'video':
            lastMessage = '🎥 Vídeo';
            break;
          case 'document':
            lastMessage = '📄 Documento';
            break;
          default:
            lastMessage = '📎 Mídia';
        }
      }
      
      if (!ticket) {
        // Criar novo ticket para novo contato
        console.log(`🎫 Criando novo ticket...`);
        ticket = await Ticket.create({
          sessionId: session.id,
          contact: msg.from,
          lastMessage: lastMessage,
          unreadCount: 1,
          status: 'open' // Garantir que o ticket seja criado como aberto
        });
        console.log(`✅ Novo ticket criado: #${ticket.id} para ${msg.from}`);
      } else {
        // Atualizar ticket existente
        console.log(`📝 Atualizando ticket existente #${ticket.id}`);
        const oldUnreadCount = ticket.unreadCount;
        ticket.lastMessage = lastMessage;
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
      
      // Preparar dados da mensagem
      let ticketMessageData = {
        ticketId: ticket.id,
        sender: 'contact',
        content: messageContent,
        timestamp: new Date(),
        fileUrl: null,
        fileName: null,
        fileType: null
      };
      
      // Processar mídia se presente
      if (msg.hasMedia) {
        try {
          console.log(`📥 Baixando mídia de ${msg.type}...`);
          const media = await msg.downloadMedia();
          
          if (media && media.data) {
            // Determinar pasta baseada no tipo
            let folder = 'outros';
            if (msg.type === 'image') folder = 'imagens';
            else if (msg.type === 'audio' || msg.type === 'ptt') folder = 'audios';
            else if (msg.type === 'video') folder = 'videos';
            else if (msg.type === 'document') folder = 'documentos';
            
            // Criar nome único para o arquivo
            const timestamp = Date.now();
            const extension = media.mimetype ? media.mimetype.split('/')[1] : 'bin';
            const fileName = `${timestamp}-${msg.type}.${extension}`;
            
            // Salvar arquivo
            const uploadDir = path.join(process.cwd(), 'uploads', folder);
            
            // Criar diretório se não existir
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            const filePath = path.join(uploadDir, fileName);
            const buffer = Buffer.from(media.data, 'base64');
            fs.writeFileSync(filePath, buffer);
            
            // Atualizar dados da mensagem
            ticketMessageData.fileUrl = `/uploads/${folder}/${fileName}`;
            ticketMessageData.fileName = media.filename || fileName;
            ticketMessageData.fileType = media.mimetype || 'application/octet-stream';
            
            console.log(`✅ Mídia salva: ${ticketMessageData.fileUrl}`);
          }
        } catch (mediaError) {
          console.error(`❌ Erro ao processar mídia:`, mediaError);
        }
      }
      
      // Salvar mensagem no ticket
      console.log(`💾 Salvando mensagem no ticket #${ticket.id}...`);
      const ticketMessage = await TicketMessage.create(ticketMessageData);
      
      console.log(`✅ Mensagem salva: ID ${ticketMessage.id} no ticket #${ticket.id}`);
      
      // Emitir eventos WebSocket para atualizar frontend em tempo real
      console.log(`🔄 Emitindo nova mensagem via WebSocket para ticket ${ticket.id}`);
      emitToTicket(ticket.id, 'new-message', ticketMessage);
      emitToAll('message-update', { ticketId: ticket.id, message: ticketMessage });
      
      // Buscar tickets atualizados para emitir
      const updatedTickets = await Ticket.findAll({
        include: [
          { model: Contact, as: 'Contact' },
          { model: Queue, as: 'Queue' },
          { model: User, as: 'AssignedUser' }
        ],
        order: [['updatedAt', 'DESC']]
      });
      
      console.log(`📡 Emitindo evento 'tickets-update' para todos os clientes: ${updatedTickets.length} tickets`);
      emitToAll('tickets-update', updatedTickets);
      console.log(`✅ Eventos WebSocket emitidos com sucesso`);
      
      console.log(`🏁 === PROCESSAMENTO CONCLUÍDO ===\n`);
      
    } catch (error) {
      console.error('❌ === ERRO AO PROCESSAR MENSAGEM ===');
      console.error('❌ Erro:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('❌ ================================\n');
    }
  };
};

// ===============================
// CALLBACK PARA BAILEYS
// ===============================
export const createBaileysMessageCallback = (session) => {
  return async (msg, sock) => {
    try {
      const messageContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      const contactId = msg.key.remoteJid;
      
      console.log(`📨 === NOVA MENSAGEM BAILEYS RECEBIDA ===`);
      console.log(`📱 De: ${contactId}`);
      console.log(`📝 Conteúdo: ${messageContent}`);
      console.log(`📊 Tipo de mensagem:`, Object.keys(msg.message || {}));
      
      // Verificar se tem mídia
      const hasAudio = msg.message?.audioMessage;
      const hasImage = msg.message?.imageMessage;
      const hasVideo = msg.message?.videoMessage;
      const hasDocument = msg.message?.documentMessage;
      const hasSticker = msg.message?.stickerMessage;
      
      const hasMedia = hasAudio || hasImage || hasVideo || hasDocument || hasSticker;
      
      console.log(`🎥 Tem mídia: ${hasMedia}`);
      if (hasMedia) {
        console.log(`🎵 Áudio: ${!!hasAudio}`);
        console.log(`📷 Imagem: ${!!hasImage}`);
        console.log(`🎥 Vídeo: ${!!hasVideo}`);
        console.log(`📄 Documento: ${!!hasDocument}`);
        console.log(`😀 Sticker: ${!!hasSticker}`);
      }
      
      // Buscar ticket usando o ID numérico da sessão
      let ticket = await Ticket.findOne({ 
        where: { 
          sessionId: session.id, // Usar o ID numérico da sessão
          contact: contactId 
        } 
      });
      
      // Atualizar/criar contato
      await updateContactOnMessage(contactId, session.id, sock);
      
      // Determinar conteúdo da mensagem
      let lastMessage = messageContent;
      
      // Se é mídia, definir um texto descritivo
      if (hasMedia) {
        if (hasAudio) lastMessage = '🎵 Áudio';
        else if (hasImage) lastMessage = '📷 Imagem';
        else if (hasVideo) lastMessage = '🎥 Vídeo';
        else if (hasDocument) lastMessage = '📄 Documento';
        else if (hasSticker) lastMessage = '😀 Sticker';
        else lastMessage = '📎 Mídia';
      }
      
      if (!ticket) {
        // Criar novo ticket para novo contato
        ticket = await Ticket.create({
          sessionId: session.id,
          contact: contactId,
          lastMessage: lastMessage,
          unreadCount: 1,
          status: 'open' // Garantir que o ticket seja criado como aberto
        });
        console.log(`🎫 Novo ticket criado: #${ticket.id} para ${contactId}`);
      } else {
        // Atualizar ticket existente
        ticket.lastMessage = lastMessage;
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
      
      // Preparar dados da mensagem
      let ticketMessageData = {
        ticketId: ticket.id,
        sender: 'contact',
        content: messageContent,
        timestamp: new Date(),
        fileUrl: null,
        fileName: null,
        fileType: null
      };
      
      // Processar mídia se presente
      if (hasMedia) {
        try {
          console.log(`📥 Processando mídia Baileys...`);
          
          let mediaMessage = null;
          let mediaType = '';
          
          if (hasAudio) {
            mediaMessage = msg.message.audioMessage;
            mediaType = 'audio';
          } else if (hasImage) {
            mediaMessage = msg.message.imageMessage;
            mediaType = 'image';
          } else if (hasVideo) {
            mediaMessage = msg.message.videoMessage;
            mediaType = 'video';
          } else if (hasDocument) {
            mediaMessage = msg.message.documentMessage;
            mediaType = 'document';
          } else if (hasSticker) {
            mediaMessage = msg.message.stickerMessage;
            mediaType = 'sticker';
          }
          
          if (mediaMessage) {
            // Baixar mídia usando Baileys
            const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            
            if (buffer) {
              // Determinar pasta baseada no tipo
              let folder = 'outros';
              if (mediaType === 'image' || mediaType === 'sticker') folder = 'imagens';
              else if (mediaType === 'audio') folder = 'audios';
              else if (mediaType === 'video') folder = 'videos';
              else if (mediaType === 'document') folder = 'documentos';
              
              // Criar nome único para o arquivo
              const timestamp = Date.now();
              const mimetype = mediaMessage.mimetype || 'application/octet-stream';
              const extension = mimetype.split('/')[1] || 'bin';
              const fileName = `${timestamp}-${mediaType}.${extension}`;
              
              // Salvar arquivo
              const uploadDir = path.join(process.cwd(), 'uploads', folder);
              
              // Criar diretório se não existir
              if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
              }
              
              const filePath = path.join(uploadDir, fileName);
              fs.writeFileSync(filePath, buffer);
              
              // Atualizar dados da mensagem
              ticketMessageData.fileUrl = `/uploads/${folder}/${fileName}`;
              ticketMessageData.fileName = mediaMessage.fileName || fileName;
              ticketMessageData.fileType = mimetype;
              
              console.log(`✅ Mídia Baileys salva: ${ticketMessageData.fileUrl}`);
            }
          }
        } catch (mediaError) {
          console.error(`❌ Erro ao processar mídia Baileys:`, mediaError);
        }
      }
      
      // Salvar mensagem no ticket
      const ticketMessage = await TicketMessage.create(ticketMessageData);
      
      console.log(`💾 Mensagem salva no ticket #${ticket.id}`);
      
      // Emitir eventos WebSocket para atualizar frontend em tempo real
      console.log(`🔄 Emitindo nova mensagem via WebSocket para ticket ${ticket.id}`);
      emitToTicket(ticket.id, 'new-message', ticketMessage);
      emitToAll('message-update', { ticketId: ticket.id, message: ticketMessage });
      
      // Buscar tickets atualizados para emitir
      const updatedTickets = await Ticket.findAll({
        include: [
          { model: Contact, as: 'Contact' },
          { model: Queue, as: 'Queue' },
          { model: User, as: 'AssignedUser' }
        ],
        order: [['updatedAt', 'DESC']]
      });
      
      console.log(`📡 Emitindo evento 'tickets-update' para todos os clientes: ${updatedTickets.length} tickets`);
      emitToAll('tickets-update', updatedTickets);
      console.log(`✅ Eventos WebSocket emitidos com sucesso`);
      
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  };
};

// Função auxiliar para atualizar contato
async function updateContactOnMessage(contactWhatsappId, sessionId, client) {
  try {
    console.log(`👤 Criando/atualizando contato: ${contactWhatsappId} na sessão: ${sessionId}`);
    
    // Buscar ou criar contato
    let contact = await Contact.findOne({
      where: { 
        whatsappId: contactWhatsappId,
        sessionId: sessionId 
      }
    });
    
    if (!contact) {
      // Criar novo contato
      const phoneNumber = contactWhatsappId.replace('@c.us', '');
      contact = await Contact.create({
        whatsappId: contactWhatsappId,
        sessionId: sessionId,
        name: phoneNumber,
        formattedNumber: phoneNumber,
        isWAContact: true,
        lastSeen: new Date()
      });
      console.log(`✅ Novo contato criado: ${contact.name}`);
    } else {
      // Atualizar lastSeen
      contact.lastSeen = new Date();
      await contact.save();
      console.log(`✅ Contato atualizado: ${contact.name}`);
    }
    
    // Emitir evento de contato atualizado
    emitToAll('contact-updated', contact);
    console.log(`📡 Emitindo evento 'contact-updated' para todos os clientes: ${contact.name || contact.whatsappId}`);
    
  } catch (error) {
    console.error(`❌ Erro ao atualizar contato: ${contactWhatsappId}`, error);
  }
}
