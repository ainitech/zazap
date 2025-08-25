import { Ticket, Queue, Contact, User, TicketMessage, TicketComment, MessageReaction } from '../models/index.js';
import { Op } from 'sequelize';
import { emitToAll } from '../services/socket.js';
import fs from 'fs';
import path from 'path';

// Função utilitária para emitir atualizações de tickets
const emitTicketsUpdate = async () => {
  try {
    const tickets = await Ticket.findAll({
      include: [
        {
          model: Contact,
          required: false // LEFT JOIN para incluir tickets sem contato vinculado
        },
        {
          model: Queue,
          required: false // LEFT JOIN para incluir tickets sem fila vinculada
        },
        {
          model: User,
          as: 'AssignedUser',
          required: false // LEFT JOIN para incluir tickets sem usuário atribuído
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    console.log(`🔄 Emitindo atualização de tickets via WebSocket: ${tickets.length} tickets`);
    emitToAll('tickets-update', tickets);
  } catch (error) {
    console.error('❌ Erro ao emitir atualização de tickets:', error);
  }
};

// Listar tickets com filtros e busca avançada
export const listTickets = async (req, res) => {
  try {
    const { contact, status, queueId, sessionId, fromDate, toDate, search, ticketId } = req.query;
    const where = {};
    
    // Se ticketId for especificado, buscar apenas esse ticket
    if (ticketId) {
      where.id = ticketId;
    } else {
      // Aplicar outros filtros apenas se não for busca específica por ID
      if (contact) where.contact = { [Op.iLike]: `%${contact}%` };
      if (status) where.status = status;
      if (queueId) where.queueId = queueId;
      if (sessionId) where.sessionId = sessionId;
      if (fromDate || toDate) {
        where.createdAt = {};
        if (fromDate) where.createdAt[Op.gte] = new Date(fromDate);
        if (toDate) where.createdAt[Op.lte] = new Date(toDate);
      }
      if (search) {
        where[Op.or] = [
          { contact: { [Op.iLike]: `%${search}%` } },
          { lastMessage: { [Op.iLike]: `%${search}%` } },
          { '$Contact.name$': { [Op.iLike]: `%${search}%` } },
          { '$Contact.pushname$': { [Op.iLike]: `%${search}%` } }
        ];
      }
    }
    
    const tickets = await Ticket.findAll({
      where,
      include: [
        {
          model: Contact,
          required: false // LEFT JOIN para incluir tickets sem contato vinculado
        },
        {
          model: Queue,
          required: false // LEFT JOIN para incluir tickets sem fila vinculada
        },
        {
          model: User,
          as: 'AssignedUser',
          required: false // LEFT JOIN para incluir tickets sem usuário atribuído
        }
      ],
      order: [['updatedAt', 'DESC']], // Ordenar por updatedAt para mostrar mais recentes primeiro
    });
    
    console.log(`📊 Listando tickets: ${tickets.length} encontrados${ticketId ? ` (busca específica ID: ${ticketId})` : ''}`);
    
    res.json(tickets);
  } catch (err) {
    console.error('❌ Erro ao listar tickets:', err);
    res.status(500).json({ error: err.message });
  }
};

export const moveTicket = async (req, res) => {
  const { ticketId, targetQueueId } = req.body;
  try {
    console.log(`🔄 Movendo ticket #${ticketId} para fila #${targetQueueId}`);
    
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });
    
    const queue = await Queue.findByPk(targetQueueId);
    if (!queue) return res.status(404).json({ error: 'Fila de destino não encontrada.' });
    
    // TODO: Implementar lógica de associação ticket-fila quando necessário
    // Por enquanto, apenas retornar sucesso
    console.log(`✅ Ticket #${ticketId} seria movido para fila "${queue.name}"`);
    
    // Emitir atualização de tickets
    await emitTicketsUpdate();
    
    res.json({ success: true, ticket, message: 'Funcionalidade será implementada quando necessário' });
  } catch (err) {
    console.error('❌ Erro ao mover ticket:', err);
    res.status(500).json({ error: err.message });
  }
};

// Aceitar ticket (mover de 'waiting' para 'accepted')
export const acceptTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id; // Obtido do middleware de autenticação
    
    console.log(`🎫 Tentando aceitar ticket #${ticketId} pelo usuário ${userId}`);
    
    // Buscar ticket
    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: Contact,
          required: false
        },
        {
          model: Queue,
          required: false
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }
    
    // Verificar se o ticket está em status de espera
    if (ticket.chatStatus !== 'waiting') {
      return res.status(400).json({ 
        error: 'Ticket não pode ser aceito. Status atual: ' + ticket.chatStatus 
      });
    }
    
    // Atualizar ticket para aceito
    await ticket.update({
      chatStatus: 'accepted',
      assignedUserId: userId,
      unreadCount: 0 // Zerar contador quando aceitar
    });
    
    console.log(`✅ Ticket #${ticketId} aceito pelo usuário ${userId}`);
    
    // Buscar ticket atualizado com associações
    const updatedTicket = await Ticket.findByPk(ticketId, {
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
      ]
    });
    
    // Emitir atualização de tickets
    await emitTicketsUpdate();
    
    res.json({ 
      success: true, 
      ticket: updatedTicket,
      message: 'Ticket aceito com sucesso!' 
    });
  } catch (err) {
    console.error('❌ Erro ao aceitar ticket:', err);
    res.status(500).json({ error: err.message });
  }
};

// Resolver ticket (mover de 'accepted' para 'resolved')
export const resolveTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    
    console.log(`🎫 Tentando resolver ticket #${ticketId} pelo usuário ${userId}`);
    
    // Buscar ticket
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }
    
    // Verificar se o ticket está aceito e atribuído ao usuário
    if (ticket.chatStatus !== 'accepted') {
      return res.status(400).json({ 
        error: 'Ticket não pode ser resolvido. Status atual: ' + ticket.chatStatus 
      });
    }
    
    if (ticket.assignedUserId !== userId) {
      return res.status(403).json({ 
        error: 'Você não tem permissão para resolver este ticket.' 
      });
    }
    
    // Atualizar ticket para resolvido
    await ticket.update({
      chatStatus: 'resolved'
    });
    
    console.log(`✅ Ticket #${ticketId} resolvido pelo usuário ${userId}`);
    
    // Emitir atualização de tickets
    await emitTicketsUpdate();
    
    res.json({ 
      success: true, 
      ticket,
      message: 'Ticket resolvido com sucesso!' 
    });
  } catch (err) {
    console.error('❌ Erro ao resolver ticket:', err);
    res.status(500).json({ error: err.message });
  }
};
// Atualizar prioridade do ticket
export const updateTicketPriority = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { priority, reason } = req.body;
    if (!priority) {
      return res.status(400).json({ error: 'priority é obrigatório' });
    }
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }
    await ticket.update({ priority });
    // Opcional: salvar reason em um histórico, se desejar
    // Emitir atualização via WebSocket
    const updatedTicket = await Ticket.findByPk(ticketId, {
      include: [
        { model: Queue, required: false },
        { model: User, as: 'AssignedUser', required: false },
        { model: Contact, required: false }
      ]
    });
    emitToAll('ticket-priority-updated', updatedTicket);
    res.json({ message: 'Prioridade do ticket atualizada com sucesso', ticket: updatedTicket });
  } catch (error) {
    console.error('❌ Erro ao atualizar prioridade do ticket:', error);
    res.status(500).json({ error: error.message });
  }
};

// Fechar ticket
export const closeTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    
    // Buscar ticket
    const ticket = await Ticket.findByPk(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }
    
    // Verificar se o ticket pode ser fechado
    if (ticket.chatStatus === 'closed') {
      return res.status(400).json({ 
        error: 'Ticket já está fechado.' 
      });
    }
    
    // Verificar se o usuário tem permissão para fechar
    if (ticket.assignedUserId !== userId) {
      return res.status(403).json({ 
        error: 'Você não tem permissão para fechar este ticket.' 
      });
    }
    
    // Atualizar ticket para fechado
    await ticket.update({
      chatStatus: 'closed',
      closedAt: new Date()
    });
    
    console.log(`🔒 Ticket #${ticketId} fechado pelo usuário ${userId}`);
    
    // Emitir atualização de tickets
    await emitTicketsUpdate();
    
    res.json({ 
      success: true, 
      ticket,
      message: 'Ticket fechado com sucesso!' 
    });
  } catch (err) {
    console.error('❌ Erro ao fechar ticket:', err);
    res.status(500).json({ error: err.message });
  }
};

// Atualizar ticket (campos permitidos)
export const updateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const updates = req.body;
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });

    // Limitar campos que podem ser atualizados via API pública
    const allowed = ['priority', 'assignedUserId', 'queueId', 'contactId', 'chatStatus', 'lastMessage'];
    const payload = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) payload[key] = updates[key];
    }

    await ticket.update(payload);

    // Emitir atualização
    await emitTicketsUpdate();

    res.json({ success: true, ticket });
  } catch (err) {
    console.error('❌ Erro ao atualizar ticket:', err);
    res.status(500).json({ error: err.message });
  }
};

// Deletar (soft-delete) ticket
export const deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });

    // Marcar como deletado (soft delete)
    await ticket.update({ status: 'deleted' });

    // Emitir atualização
    await emitTicketsUpdate();

    res.json({ success: true, message: 'Ticket movido para lixeira.' });
  } catch (err) {
    console.error('❌ Erro ao deletar ticket:', err);
    res.status(500).json({ error: err.message });
  }
};

// Restaurar ticket da lixeira
export const restoreTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado.' });

    // Restaurar status para 'open' (ou outro valor baseado em histórico)
    await ticket.update({ status: 'open' });

    // Emitir atualização
    await emitTicketsUpdate();

    res.json({ success: true, message: 'Ticket restaurado com sucesso.' });
  } catch (err) {
    console.error('❌ Erro ao restaurar ticket:', err);
    res.status(500).json({ error: err.message });
  }
};

// Deletar ticket permanentemente com todas as informações do contato
export const permanentDeleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    
    console.log(`🗑️ Iniciando deleção permanente do ticket #${ticketId} pelo usuário ${userId}`);
    
    // Buscar ticket com contato vinculado
    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: Contact,
          required: false
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }
    
    const contactPhone = ticket.contact;
    const contactId = ticket.contactId;
    
    console.log(`📞 Contato a ser removido: ${contactPhone} (ID: ${contactId})`);
    
    // 1. Buscar todas as mensagens com arquivos para remover do disco
    const messagesWithFiles = await TicketMessage.findAll({
      where: {
        ticketId,
        fileUrl: { [Op.ne]: null }
      }
    });
    
    console.log(`📁 Encontradas ${messagesWithFiles.length} mensagens com arquivos`);
    
    // 2. Remover arquivos do disco
    for (const message of messagesWithFiles) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', message.fileUrl.replace('/uploads/', ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Arquivo removido: ${filePath}`);
        }
      } catch (fileError) {
        console.error(`❌ Erro ao remover arquivo: ${fileError.message}`);
      }
    }
    
    // 3. Remover reações das mensagens
    await MessageReaction.destroy({
      where: {
        messageId: {
          [Op.in]: await TicketMessage.findAll({
            where: { ticketId },
            attributes: ['id']
          }).then(messages => messages.map(m => m.id))
        }
      }
    });
    
    console.log(`🗑️ Reações das mensagens removidas`);
    
    // 4. Remover todas as mensagens do ticket
    await TicketMessage.destroy({
      where: { ticketId }
    });
    
    console.log(`🗑️ Mensagens do ticket removidas`);
    
    // 5. Remover comentários do ticket
    await TicketComment.destroy({
      where: { ticketId }
    });
    
    console.log(`🗑️ Comentários do ticket removidos`);
    
    // 6. Buscar e remover TODOS os tickets deste contato (mesmo número em outras sessões)
    const allContactTickets = await Ticket.findAll({
      where: { contact: contactPhone }
    });
    
    console.log(`🎫 Encontrados ${allContactTickets.length} tickets para o contato ${contactPhone}`);
    
    for (const contactTicket of allContactTickets) {
      if (contactTicket.id !== ticketId) {
        // Remover mensagens de outros tickets do mesmo contato
        const otherTicketMessages = await TicketMessage.findAll({
          where: { ticketId: contactTicket.id, fileUrl: { [Op.ne]: null } }
        });
        
        // Remover arquivos de outros tickets
        for (const message of otherTicketMessages) {
          try {
            const filePath = path.join(process.cwd(), 'uploads', message.fileUrl.replace('/uploads/', ''));
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`🗑️ Arquivo de outro ticket removido: ${filePath}`);
            }
          } catch (fileError) {
            console.error(`❌ Erro ao remover arquivo de outro ticket: ${fileError.message}`);
          }
        }
        
        // Remover reações de outros tickets
        await MessageReaction.destroy({
          where: {
            messageId: {
              [Op.in]: await TicketMessage.findAll({
                where: { ticketId: contactTicket.id },
                attributes: ['id']
              }).then(messages => messages.map(m => m.id))
            }
          }
        });
        
        // Remover mensagens de outros tickets
        await TicketMessage.destroy({
          where: { ticketId: contactTicket.id }
        });
        
        // Remover comentários de outros tickets
        await TicketComment.destroy({
          where: { ticketId: contactTicket.id }
        });
        
        console.log(`🗑️ Ticket relacionado #${contactTicket.id} limpo`);
      }
    }
    
    // 7. Remover todos os tickets do contato (comparando pelo campo contact que guarda o whatsappId)
    await Ticket.destroy({
      where: { contact: contactPhone }
    });
    
    console.log(`🗑️ Todos os tickets do contato removidos`);
    
    // 8. Remover o registro do contato se existir
    if (contactId) {
      await Contact.destroy({
        where: { id: contactId }
      });
      console.log(`🗑️ Registro do contato ${contactId} removido`);
    }
    
    // 9. Remover outros registros de contato que possuam o mesmo whatsappId
    // O modelo de Contact usa o campo `whatsappId` para armazenar o id do contato no WhatsApp.
    await Contact.destroy({
      where: { whatsappId: contactPhone }
    });

    console.log(`🗑️ Todos os registros de contato com whatsappId ${contactPhone} removidos`);
    
    // Emitir atualização de tickets
    await emitTicketsUpdate();
    
    console.log(`✅ Deleção permanente concluída para contato ${contactPhone}`);
    
    res.json({ 
      success: true, 
      message: `Ticket e todas as informações do contato ${contactPhone} foram removidos permanentemente.` 
    });
    
  } catch (err) {
    console.error('❌ Erro ao deletar ticket permanentemente:', err);
    res.status(500).json({ error: err.message });
  }
};