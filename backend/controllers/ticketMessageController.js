import { TicketMessage, Ticket, Session, Contact, MessageReaction, User } from '../models/index.js';
import { sendText as sendTextWhatsappJs, getWhatsappJsSession } from '../services/whatsappjsService.js';
import { sendText as sendTextBaileys, getBaileysSession } from '../services/baileysService.js';
import { emitToTicket, emitToAll } from '../services/socket.js';
import path from 'path';
import fs from 'fs';

// Função para atualizar informações do contato ao enviar mensagem
const updateContactOnSend = async (ticket, sessionId) => {
  try {
    if (!ticket.contactId) {
      console.log(`⚠️ Ticket ${ticket.id} não tem contactId vinculado, pulando atualização`);
      return;
    }

    console.log(`👤 Atualizando contato ${ticket.contactId} ao enviar mensagem`);
    
    const session = await Session.findByPk(sessionId);
    if (!session) {
      console.error(`❌ Sessão ${sessionId} não encontrada`);
      return;
    }

    let contact = await Contact.findByPk(ticket.contactId);
    if (!contact) {
      console.error(`❌ Contato ${ticket.contactId} não encontrado`);
      return;
    }

    // Obter informações atualizadas do WhatsApp
    let profilePicUrl = null;
    let contactInfo = null;

    if (session.library === 'whatsapp-web.js' || session.library === 'whatsappjs') {
      try {
        const wbot = getWhatsappJsSession(session.whatsappId);
        if (wbot && wbot.info) {
          contactInfo = await wbot.getContactById(ticket.contact);
          
          try {
            profilePicUrl = await contactInfo.getProfilePicUrl();
          } catch (picError) {
            console.log(`⚠️ Não foi possível obter foto do perfil: ${picError.message}`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Erro ao obter informações do contato WhatsApp.js: ${error.message}`);
      }
    } else if (session.library === 'baileys') {
      try {
        const sock = getBaileysSession(session.whatsappId);
        if (sock && sock.user) {
          try {
            profilePicUrl = await sock.profilePictureUrl(ticket.contact, 'image');
          } catch (picError) {
            console.log(`⚠️ Não foi possível obter foto do perfil: ${picError.message}`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Erro ao obter informações do contato Baileys: ${error.message}`);
      }
    }

    // Atualizar apenas se obtivemos novas informações
    const updateData = {};
    
    if (contactInfo?.name && contactInfo.name !== contact.name) {
      updateData.name = contactInfo.name;
    }
    
    if (contactInfo?.pushname && contactInfo.pushname !== contact.pushname) {
      updateData.pushname = contactInfo.pushname;
    }
    
    if (profilePicUrl && profilePicUrl !== contact.profilePicUrl) {
      updateData.profilePicUrl = profilePicUrl;
    }

    updateData.lastSeen = new Date();

    if (Object.keys(updateData).length > 0) {
      await contact.update(updateData);
      console.log(`✅ Contato ${contact.id} atualizado com novas informações`);
      
      // Emitir evento de contato atualizado
      emitToAll('contact-updated', contact);
    } else {
      console.log(`ℹ️ Nenhuma atualização necessária para o contato ${contact.id}`);
    }

  } catch (error) {
    console.error(`❌ Erro ao atualizar contato ao enviar mensagem:`, error);
  }
};

// Lista mensagens de um ticket
export const listMessages = async (req, res) => {
  const { ticketId } = req.params;
  try {
    console.log(`🔍 Buscando mensagens do ticket ${ticketId}`);
    
    const messages = await TicketMessage.findAll({
      where: { ticketId },
      include: [{
        model: MessageReaction,
        as: 'reactions',
        include: [{
          model: User,
          as: 'User',
          attributes: ['id', 'name']
        }]
      }],
      order: [['timestamp', 'ASC']],
    });
    
    console.log(`📨 ${messages.length} mensagens encontradas para ticket ${ticketId}`);
    res.json(messages);
  } catch (err) {
    console.error(`❌ Erro ao listar mensagens do ticket ${ticketId}:`, err);
    res.status(500).json({ error: err.message });
  }
};

// Envia mensagem em um ticket
export const sendMessage = async (req, res) => {
  const { ticketId } = req.params;
  const { content, sender } = req.body;
  try {
    console.log(`📤 Criando mensagem para ticket ${ticketId} - sender: ${sender}`);
    
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      console.log(`❌ Ticket ${ticketId} não encontrado`);
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }
    
    const message = await TicketMessage.create({
      ticketId,
      content,
      sender,
      timestamp: new Date(),
    });
    
    console.log(`✅ Mensagem criada com sucesso - ID: ${message.id}`);
    
    // Emitir nova mensagem via WebSocket
    try {
      console.log(`🔄 Emitindo nova mensagem via WebSocket para ticket ${ticketId}`);
      console.log(`📨 Dados da mensagem sendo emitida:`, {
        id: message.id,
        ticketId: message.ticketId,
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp
      });
      
      emitToTicket(ticketId, 'new-message', message);
      emitToAll('message-update', { ticketId, message });
      
      console.log(`✅ Eventos WebSocket emitidos com sucesso para ${ticketId}`);
    } catch (socketError) {
      console.error(`❌ Erro ao emitir evento WebSocket:`, socketError);
    }
    
    // Enviar mensagem via WhatsApp se sender for 'user'
    if (sender === 'user') {
      console.log(`📱 Enviando mensagem via WhatsApp para ${ticket.contact} na sessão ${ticket.sessionId}`);
      
      // Atualizar informações do contato ao enviar mensagem
      await updateContactOnSend(ticket, ticket.sessionId);
      
      // Buscar informações da sessão para saber qual biblioteca usar
      const session = await Session.findByPk(ticket.sessionId);
      if (!session) {
        console.error(`❌ Sessão ${ticket.sessionId} não encontrada no banco de dados`);
      } else {
        console.log(`🔍 Sessão encontrada: ${session.library} (${session.whatsappId}) - Status: ${session.status}`);
        console.log(`🔑 Usando whatsappId "${session.whatsappId}" para buscar sessão ativa`);
        
        // Verificar se a sessão está realmente ativa
        let isSessionActive = false;
        
        if (session.library === 'whatsapp-web.js' || session.library === 'whatsappjs') {
          const activeSession = getWhatsappJsSession(session.whatsappId);
          isSessionActive = activeSession && activeSession.info && activeSession.info.wid;
          console.log(`🔍 Sessão WhatsApp.js ativa: ${isSessionActive ? 'Sim' : 'Não'}`);
        } else if (session.library === 'baileys') {
          const activeSession = getBaileysSession(session.whatsappId);
          isSessionActive = activeSession && activeSession.user;
          console.log(`🔍 Sessão Baileys ativa: ${isSessionActive ? 'Sim' : 'Não'}`);
        }
        
        if (!isSessionActive) {
          console.error(`❌ Sessão ${session.whatsappId} não está realmente ativa. Atualizando status no banco...`);
          
          // Atualizar status no banco
          await session.update({ status: 'disconnected' });
          
          console.log(`⚠️ Para reconectar, vá até a página de sessões e clique em "Iniciar" na sessão ${session.whatsappId}`);
          
          // Emitir atualização via WebSocket para o frontend
          try {
            emitToAll('session-status-update', { 
              sessionId: session.id, 
              status: 'disconnected' 
            });
          } catch (socketError) {
            console.error('❌ Erro ao emitir status via WebSocket:', socketError);
          }
          
          return; // Não tentar enviar mensagem
        }
        
        // Verificar apenas o status do banco de dados
        if (session.status !== 'connected') {
          console.error(`❌ Sessão ${ticket.sessionId} não está conectada no banco (status: ${session.status})`);
        } else {
          console.log(`✅ Sessão está conectada e ativa, enviando mensagem...`);
          
          let messageSent = false;
          
          if (session.library === 'whatsapp-web.js' || session.library === 'whatsappjs') {
            try {
              console.log(`📤 Enviando mensagem via WhatsApp-Web.js para ${ticket.contact}`);
              // Usar session.whatsappId em vez de ticket.sessionId
              await sendTextWhatsappJs(session.whatsappId, ticket.contact, content);
              console.log(`✅ Mensagem enviada via WhatsApp-Web.js`);
              messageSent = true;
            } catch (whatsappJsError) {
              console.error(`❌ Erro no WhatsApp-Web.js:`, whatsappJsError.message);
            }
          } else if (session.library === 'baileys') {
            try {
              console.log(`📤 Enviando mensagem via Baileys para ${ticket.contact}`);
              // Usar session.whatsappId em vez de ticket.sessionId
              await sendTextBaileys(session.whatsappId, ticket.contact, content);
              console.log(`✅ Mensagem enviada via Baileys`);
              messageSent = true;
            } catch (baileysError) {
              console.error(`❌ Erro no Baileys:`, baileysError.message);
            }
          } else {
            console.error(`❌ Biblioteca desconhecida: ${session.library}`);
          }
          
          if (!messageSent) {
            console.error(`❌ Falha ao enviar mensagem via ${session.library}`);
          }
        }
      }
    }
    
    // Sempre emitir atualização dos tickets com dados completos
    try {
      const updatedTickets = await Ticket.findAll({
        include: [
          {
            model: Contact,
            required: false
          },
          {
            model: Queue,
            required: false
          },
          {
            model: User,
            as: 'AssignedUser',
            required: false
          }
        ],
        order: [['updatedAt', 'DESC']]
      });
      emitToAll('tickets-update', updatedTickets);
      console.log(`✅ Tickets atualizados emitidos via WebSocket com dados completos dos contatos`);
    } catch (socketError) {
      console.error(`❌ Erro ao emitir tickets atualizados:`, socketError);
    }
    
    res.json(message);
  } catch (err) {
    console.error(`❌ Erro ao enviar mensagem para ticket ${ticketId}:`, err);
    res.status(500).json({ error: err.message });
  }
};

// Enviar mensagem com mídia
export const sendMediaMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { sender } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Arquivo não enviado' });

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    // Gerar URL correta do arquivo
    // Extrair apenas o nome do arquivo e determinar a pasta correta
    const fileName = file.filename;
    const mimeType = file.mimetype;
    
    // Determinar a pasta baseada no tipo de arquivo
    let folder = 'outros';
    const ext = path.extname(fileName).toLowerCase();
    
    if (mimeType.startsWith('image/')) folder = 'imagens';
    else if (mimeType.startsWith('video/')) folder = 'videos';
    else if (mimeType.startsWith('audio/')) folder = 'audios';
    else if (
      mimeType === 'application/pdf' ||
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) folder = 'documentos';
    else if (ext === '.exe') folder = 'executaveis';
    else if (ext === '.zip' || ext === '.rar' || ext === '.7z') folder = 'arquivos_compactados';
    else if (ext === '.apk') folder = 'apks';
    else if (ext === '.csv' || ext === '.json' || ext === '.xml') folder = 'dados';
    else if (ext === '.html' || ext === '.js' || ext === '.ts' || ext === '.css') folder = 'codigo';
    else if (ext === '.dll' || ext === '.sys') folder = 'sistema';
    
    // Gerar URL limpa
    const fileUrl = `/uploads/${folder}/${fileName}`;
    
    console.log(`📁 Arquivo salvo: ${fileName} -> URL: ${fileUrl}`);
    
    const message = await TicketMessage.create({
      ticketId,
      sender: sender || 'user',
      content: '',
      fileUrl,
      fileName: file.originalname,
      fileType: file.mimetype,
      timestamp: new Date()
    });

    console.log(`📡 Emitindo evento 'message-update' para todos os clientes:`, { ticketId, message });

    // Emitir via socket
    emitToTicket(ticketId, 'new-message', message);
    emitToAll('message-update', { ticketId, message });
    
    console.log(`✅ Evento 'message-update' emitido para todos os clientes`);

    res.json(message);
  } catch (err) {
    console.error('Erro ao enviar mídia:', err);
    res.status(500).json({ error: err.message });
  }
};

// Listar mídias/anexos de um ticket
export const listTicketMedia = async (req, res) => {
  const { ticketId } = req.params;
  try {
    // Busca todas as mensagens do ticket que possuem arquivo (mídia ou documento)
    const mediaMessages = await TicketMessage.findAll({
      where: {
        ticketId,
        fileUrl: { [TicketMessage.sequelize.Op.ne]: null },
      },
      order: [['timestamp', 'ASC']],
    });
    res.json(mediaMessages);
  } catch (err) {
    console.error(`❌ Erro ao listar mídias do ticket ${ticketId}:`, err);
    res.status(500).json({ error: err.message });
  }
};

// Deletar mensagem
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone = false } = req.body;
    const userId = req.user.id;

    console.log(`🗑️ Tentativa de deletar mensagem ${messageId} por usuário ${userId}, deleteForEveryone: ${deleteForEveryone}`);

    // Buscar a mensagem
    const message = await TicketMessage.findByPk(messageId, {
      include: [
        {
          model: Ticket,
          as: 'Ticket'
        }
      ]
    });

    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    // Se for deletar para todos, remover arquivo do disco se existir
    if (deleteForEveryone && message.fileUrl) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', message.fileUrl.replace('/uploads/', ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`📁 Arquivo removido: ${filePath}`);
        }
      } catch (fileError) {
        console.error('Erro ao remover arquivo:', fileError);
      }
    }

    if (deleteForEveryone) {
      // Deletar para todos - remover do banco
      await message.destroy();
      console.log(`🗑️ Mensagem ${messageId} deletada para todos`);
      
      // Emitir evento de mensagem deletada
      emitToTicket(message.ticketId, 'message-deleted', { messageId });
      emitToAll('message-deleted', { messageId, ticketId: message.ticketId });
    } else {
      // Deletar apenas para o usuário atual - marcar como deletada
      // Para simplificar, vamos usar o mesmo comportamento (deletar do banco)
      // Em uma implementação mais complexa, você poderia adicionar um campo "deletedFor" 
      await message.destroy();
      console.log(`🗑️ Mensagem ${messageId} deletada para usuário ${userId}`);
      
      emitToTicket(message.ticketId, 'message-deleted', { messageId });
    }

    res.json({ success: true, message: 'Mensagem deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Reagir a mensagem
export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;
    const userId = req.user.id;

    console.log(`😀 Usuário ${userId} reagindo à mensagem ${messageId} com ${reaction}`);

    // Verificar se a mensagem existe
    const message = await TicketMessage.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    // Verificar se o usuário já reagiu com esta reação
    const existingReaction = await MessageReaction.findOne({
      where: {
        messageId,
        userId,
        reaction
      }
    });

    if (existingReaction) {
      // Se já existe, remover a reação (toggle)
      await existingReaction.destroy();
      console.log(`😀 Reação ${reaction} removida da mensagem ${messageId} pelo usuário ${userId}`);
      
      // Buscar todas as reações da mensagem para retornar
      const allReactions = await MessageReaction.findAll({
        where: { messageId },
        include: [{
          model: User,
          as: 'User',
          attributes: ['id', 'name']
        }]
      });

      // Emitir evento de reação removida
      emitToTicket(message.ticketId, 'reaction-removed', { 
        messageId, 
        userId, 
        reaction,
        allReactions 
      });
      emitToAll('reaction-removed', { 
        messageId, 
        userId, 
        reaction, 
        ticketId: message.ticketId,
        allReactions 
      });

      return res.json({ 
        success: true, 
        message: 'Reação removida', 
        reactions: allReactions 
      });
    }

    // Criar nova reação
    const newReaction = await MessageReaction.create({
      messageId,
      userId,
      reaction
    });

    // Buscar a reação com o usuário
    const reactionWithUser = await MessageReaction.findByPk(newReaction.id, {
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'name']
      }]
    });

    // Buscar todas as reações da mensagem
    const allReactions = await MessageReaction.findAll({
      where: { messageId },
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'name']
      }]
    });

    console.log(`😀 Nova reação ${reaction} adicionada à mensagem ${messageId} pelo usuário ${userId}`);

    // Emitir evento de nova reação
    emitToTicket(message.ticketId, 'reaction-added', { 
      messageId, 
      reaction: reactionWithUser,
      allReactions 
    });
    emitToAll('reaction-added', { 
      messageId, 
      reaction: reactionWithUser, 
      ticketId: message.ticketId,
      allReactions 
    });

    res.json({ 
      success: true, 
      message: 'Reação adicionada', 
      reaction: reactionWithUser,
      reactions: allReactions 
    });
  } catch (error) {
    console.error('Erro ao reagir à mensagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
