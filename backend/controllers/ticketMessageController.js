import { TicketMessage, Ticket, Session, Contact, MessageReaction, User, Queue } from '../models/index.js';
import { Op } from 'sequelize';
import { sendText as sendTextBaileys, getBaileysSession, sendMedia as sendMediaBaileys } from '../services/baileysService.js';
import wwebjsService from '../services/wwebjsService.js';
import intelligentLibraryManager from '../services/intelligentLibraryManager.js';
import { sendInstagramText, sendInstagramMedia } from '../services/instagramService.js';
import { sendFacebookText, sendFacebookMedia } from '../services/facebookService.js';
import { emitToAll, emitToTicket } from '../services/socket.js';
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

  if (session.library === 'baileys') {
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

// Listar apenas mídias/anexos de um ticket
export const listTicketMedia = async (req, res) => {
  const { ticketId } = req.params;
  try {
    const mediaMessages = await TicketMessage.findAll({
      where: {
        ticketId,
        fileUrl: { [Op.ne]: null }
      },
      order: [['timestamp', 'ASC']]
    });
    return res.json(mediaMessages);
  } catch (error) {
    console.error(`❌ Erro ao listar mídias do ticket ${ticketId}:`, error);
    return res.status(500).json({ error: 'Erro ao listar mídias do ticket' });
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
      
      // Emitir tanto para a sala específica quanto globalmente
      const ticketRoomName = `ticket-${ticketId}`;
      const { getConnectedClients, getRoomInfo } = await import('../services/socket.js');
      const clientsInRoom = getConnectedClients(ticketRoomName);
      const roomInfo = getRoomInfo(ticketRoomName);
      
      console.log(`📊 Emitindo 'new-message' para sala ${ticketRoomName} (${clientsInRoom} clientes conectados)`);
      if (roomInfo) {
        console.log(`👥 Clientes na sala do ticket:`, roomInfo.clients);
      } else {
        console.log(`⚠️ Nenhum cliente conectado na sala ${ticketRoomName}`);
      }
      
      emitToTicket(ticketId, 'new-message', message);
      console.log(`✅ Evento 'new-message' emitido para sala ${ticketRoomName}`);
      
      const totalClients = getConnectedClients();
      emitToAll('message-update', { ticketId, message });
      console.log(`✅ Evento 'message-update' emitido para todos os clientes (${totalClients} conectados)`);
      
      console.log(`✅ Eventos WebSocket emitidos com sucesso para ${ticketId}`);
    } catch (socketError) {
      console.error(`❌ Erro ao emitir evento WebSocket:`, socketError);
    }
    
    // Enviar mensagem via canal correspondente se sender for 'user'
    if (sender === 'user') {
      console.log(`📱 Enviando mensagem via ${ticket.channel || 'whatsapp'} para ${ticket.contact}`);
      
      // Atualizar informações do contato ao enviar mensagem
      await updateContactOnSend(ticket, ticket.sessionId);
      
      // Buscar informações da sessão
      const session = await Session.findByPk(ticket.sessionId);
      if (!session) {
        console.error(`❌ Sessão ${ticket.sessionId} não encontrada no banco de dados`);
      } else {
        console.log(`🔍 Tentando enviar mensagem para ${ticket.contact} - Sessão: ${session.whatsappId} - Canal: ${ticket.channel || 'whatsapp'}`);
        
        let messageSent = false;
        // Inferir canal se não estiver definido (backfill para tickets antigos)
        let channel = ticket.channel;
        if (!channel) {
          if (ticket.contact?.startsWith('ig:')) channel = 'instagram';
          else if (ticket.contact?.startsWith('fb:')) channel = 'facebook';
          else channel = 'whatsapp';
          try {
            await ticket.update({ channel });
            console.log(`🛠️ Canal do ticket ${ticket.id} atualizado (backfill) para '${channel}'`);
          } catch (e) {
            console.log(`⚠️ Falha ao backfill canal do ticket ${ticket.id}:`, e.message);
          }
        }
        
        // Enviar conforme o canal
        if (channel === 'instagram') {
          console.log(`🔁 Fluxo Instagram -> sessionKey=${session.whatsappId} contato=${ticket.contact}`);
          // Debug: listar sessões Instagram ativas
          try {
            const { listInstagramSessions } = await import('../services/instagramService.js');
            listInstagramSessions();
          } catch (e) {
            console.log('Erro ao listar sessões Instagram:', e.message);
          }
          
          try {
            console.log(`📤 Tentando envio via Instagram para ${ticket.contact}`);
            await sendInstagramText(session.whatsappId, ticket.contact, content, ticket.id);
            console.log(`✅ Mensagem enviada com sucesso via Instagram`);
            messageSent = true;
          } catch (instagramError) {
            console.error(`❌ Erro no Instagram:`, instagramError.message);
            if (instagramError?.message?.includes('não encontrada em memória')) {
              console.log('💡 Dica: Recrie a sessão Instagram via /api/mc/init ou faça novo login.');
            }
          }
        } else if (channel === 'facebook') {
          try {
            console.log(`📤 Tentando envio via Facebook para ${ticket.contact}`);
            await sendFacebookText(session.whatsappId, ticket.contact, content);
            console.log(`✅ Mensagem enviada com sucesso via Facebook`);
            messageSent = true;
          } catch (facebookError) {
            console.error(`❌ Erro no Facebook:`, facebookError.message);
          }
        } else {
          // Canal WhatsApp (padrão) - usar gerenciador inteligente de bibliotecas
          try {
            console.log(`🧠 Enviando mensagem via Gerenciador Inteligente para ${ticket.contact}`);
            
            // Usar o gerenciador inteligente que seleciona automaticamente a melhor biblioteca
            const result = await intelligentLibraryManager.sendMessage(
              session.whatsappId, 
              ticket.contact, 
              content
            );
            
            console.log(`✅ Mensagem enviada com sucesso via ${result.library} (Gerenciador Inteligente)`);
            messageSent = true;
            
          } catch (intelligentError) {
            console.error(`❌ Erro no Gerenciador Inteligente:`, intelligentError.message);
            
            // Fallback: tentar com bibliotecas individuais
            try {
              console.log(`🔄 Tentando fallback direto com Baileys...`);
              const activeSession = getBaileysSession(session.whatsappId);
              if (activeSession && activeSession.user) {
                await sendTextBaileys(session.whatsappId, ticket.contact, content);
                console.log(`✅ Mensagem enviada via Baileys (fallback)`);
                messageSent = true;
              } else {
                console.log(`🔄 Tentando fallback direto com WWebJS...`);
                const wwebjsSession = wwebjsService.getWwebjsSession(session.whatsappId);
                if (wwebjsSession) {
                  // Verificar se existe método sendText no wwebjsService
                  if (typeof wwebjsService.sendText === 'function') {
                    await wwebjsService.sendText(session.whatsappId, ticket.contact, content);
                  } else {
                    // Usar método direto do cliente
                    await wwebjsSession.sendMessage(ticket.contact, content);
                  }
                  console.log(`✅ Mensagem enviada via WWebJS (fallback)`);
                  messageSent = true;
                }
              }
            } catch (fallbackError) {
              console.error(`❌ Erro no fallback:`, fallbackError.message);
            }
          }
          
          if (!messageSent) {
            console.log(`⚠️ Nenhuma biblioteca disponível ou conectada para sessão ${session.whatsappId}`);
          }
        }
        
        // Se nenhuma biblioteca funcionou
        if (!messageSent) {
          console.error(`❌ Falha ao enviar mensagem via qualquer biblioteca disponível`);
          console.error(`❌ Verifique se a sessão ${session.whatsappId} está realmente conectada`);
          
          // Atualizar status no banco se necessário
          if (session.status === 'connected') {
            await session.update({ status: 'disconnected' });
            console.log(`🔄 Status da sessão ${session.whatsappId} atualizado para 'disconnected'`);
            
            // Emitir atualização via WebSocket
            try {
              emitToAll('session-status-update', { 
                sessionId: session.id, 
                status: 'disconnected' 
              });
            } catch (socketError) {
              console.error('❌ Erro ao emitir status via WebSocket:', socketError);
            }
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
      sender: 'user', // Registrar como 'user' para parecer gravado
      content: req.body.content || '',
      fileUrl,
      fileName: file.originalname,
      fileType: file.mimetype,
      timestamp: new Date(),
      isQuickReply: sender === 'quick-reply'
    });

   
    // Emitir via socket
    emitToTicket(ticketId, 'new-message', message);
    emitToAll('message-update', { ticketId, message });
    
    console.log(`✅ Evento 'message-update' emitido para todos os clientes`);

    // Enviar via canal correspondente quando enviado pelo usuário ou resposta rápida
    if (sender === 'user' || sender === 'quick-reply') {
      try {
        const session = await Session.findByPk(ticket.sessionId);
        if (!session) {
          console.error(`❌ Sessão ${ticket.sessionId} não encontrada no banco de dados`);
        } else {
          const channel = ticket.channel || 'whatsapp';
          console.log(`🔍 Tentando enviar arquivo para ${ticket.contact} - Sessão: ${session.whatsappId} - Canal: ${channel}`);
          
          // Ler o arquivo em buffer para todos os canais
          const filePath = path.isAbsolute(file.path) ? file.path : path.join(process.cwd(), file.path);
          const fileBuffer = fs.readFileSync(filePath);
          
          let fileSent = false;
          
          if (channel === 'instagram') {
            try {
              console.log(`📤 Tentando envio de mídia via Instagram`);
              await sendInstagramMedia(session.whatsappId, ticket.contact, fileBuffer, file.mimetype, ticket.id, file.originalname);
              console.log(`✅ Mídia enviada com sucesso via Instagram`);
              fileSent = true;
            } catch (instagramError) {
              console.error(`❌ Erro no envio Instagram:`, instagramError.message);
            }
          } else if (channel === 'facebook') {
            try {
              console.log(`📤 Tentando envio de mídia via Facebook`);
              await sendFacebookMedia(session.whatsappId, ticket.contact, fileBuffer, file.mimetype);
              console.log(`✅ Mídia enviada com sucesso via Facebook`);
              fileSent = true;
            } catch (facebookError) {
              console.error(`❌ Erro no envio Facebook:`, facebookError.message);
            }
          } else {
            // Canal WhatsApp (padrão) - usar Gerenciador Inteligente
            try {
              console.log(`🧠 Enviando mídia via Gerenciador Inteligente para ${ticket.contact}`);
              
              // Usar o gerenciador inteligente para envio de mídia
              // Diferenciar áudio por biblioteca: para WWebJS precisamos sinalizar voice note
              const isAudio = (file.mimetype || '').startsWith('audio/');
              const result = await intelligentLibraryManager.sendMessage(
                session.whatsappId,
                ticket.contact,
                {
                  type: 'media',
                  buffer: fileBuffer,
                  mimetype: file.mimetype,
                  filename: file.originalname,
                  // Hint opcional usado pelo gerenciador para WWebJS
                  voice: isAudio ? true : undefined
                },
                // Options também suportam voice=true no gerenciador
                isAudio ? { voice: true } : undefined
              );
              
              console.log(`✅ Mídia enviada com sucesso via ${result.library} (Gerenciador Inteligente)`);
              fileSent = true;
              
            } catch (intelligentError) {
              console.error(`❌ Erro no Gerenciador Inteligente para mídia:`, intelligentError.message);
              
              // Fallback para Baileys direto
              try {
                const sock = getBaileysSession(session.whatsappId);
                if (sock && sock.user) {
                  await sendMediaBaileys(session.whatsappId, ticket.contact, fileBuffer, file.mimetype);
                  console.log(`✅ Arquivo enviado via fallback Baileys`);
                  fileSent = true;
                } else {
                  console.log(`⚠️ Baileys não disponível ou não conectado para sessão ${session.whatsappId}`);
                }
              } catch (fallbackError) {
                console.error(`❌ Fallback Baileys para mídia também falhou:`, fallbackError.message);
              }

              // Fallback adicional: tentar via WWebJS, diferenciando áudio
              if (!fileSent) {
                try {
                  const wwebClient = wwebjsService.getWwebjsSession(session.whatsappId);
                  if (wwebClient) {
                    const isAudio2 = (file.mimetype || '').startsWith('audio/');
                    if (isAudio2 && typeof wwebjsService.sendVoiceNote === 'function') {
                      await wwebjsService.sendVoiceNote(session.whatsappId, ticket.contact, fileBuffer, file.mimetype);
                      console.log(`✅ Áudio enviado como nota de voz via WWebJS (fallback)`);
                    } else {
                      const base64 = fileBuffer.toString('base64');
                      await wwebjsService.sendMedia(session.whatsappId, ticket.contact, {
                        base64,
                        mimetype: file.mimetype,
                        filename: file.originalname
                      });
                      console.log(`✅ Mídia enviada via WWebJS (fallback)`);
                    }
                    fileSent = true;
                  } else {
                    console.log(`⚠️ WWebJS não disponível para sessão ${session.whatsappId}`);
                  }
                } catch (wwebFallbackErr) {
                  console.error(`❌ Fallback WWebJS para mídia também falhou:`, wwebFallbackErr.message);
                }
              }
            }
          }
          
          if (!fileSent) {
            console.log(`⚠️ Arquivo não foi enviado via nenhum canal para sessão ${session.whatsappId}`);
          }
        }
      } catch (sendErr) {
        console.error(`❌ Erro ao enviar mídia:`, sendErr);
      }
    }

    return res.json(message);
  } catch (err) {
    console.error('Erro ao enviar mídia:', err);
    return res.status(500).json({ error: err.message });
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
