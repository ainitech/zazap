import { sendPoll } from '../services/baileysService.js';
import { Ticket, Session, Contact, TicketMessage } from '../models/index.js';
import { emitToTicket, emitToAll } from '../services/socket.js';

/**
 * Enviar enquete para um ticket
 */
export const sendPollMessage = async (req, res) => {
  try {
    const { ticketId, question, options, allowMultipleAnswers = false } = req.body;

    // Validação dos dados obrigatórios
    if (!ticketId || !question || !options || !Array.isArray(options)) {
      return res.status(400).json({
        error: 'ticketId, question e options são obrigatórios. options deve ser um array.'
      });
    }

    if (options.length < 2 || options.length > 12) {
      return res.status(400).json({
        error: 'Uma enquete deve ter entre 2 e 12 opções.'
      });
    }

    // Verificar se cada opção é uma string não vazia
    for (const option of options) {
      if (typeof option !== 'string' || option.trim().length === 0) {
        return res.status(400).json({
          error: 'Todas as opções devem ser strings não vazias.'
        });
      }
      if (option.length > 100) {
        return res.status(400).json({
          error: 'Cada opção não pode exceder 100 caracteres.'
        });
      }
    }

    // Buscar o ticket
    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: Contact,
          required: true
        }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }

    // Buscar a sessão
    const session = await Session.findByPk(ticket.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    console.log(`📊 Enviando enquete para ticket ${ticketId}:`, {
      to: ticket.contact,
      sessionId: session.id,
      question,
      optionsCount: options.length,
      allowMultipleAnswers
    });

    // Enviar a enquete
    const result = await sendPoll(
      session.whatsappId,
      ticket.contact,
      question,
      options,
      { allowMultipleAnswers }
    );

    // Salvar mensagem da enquete no banco de dados
    const pollMessageData = {
      type: 'poll',
      question,
      options,
      allowMultipleAnswers,
      messageId: result.messageId
    };

    const message = await TicketMessage.create({
      ticketId,
      content: question, // Salvar apenas a pergunta no content
      sender: 'user',
      timestamp: new Date(),
      messageType: 'poll',
      pollData: JSON.stringify(pollMessageData),
      messageId: result.messageId
    });

    console.log(`✅ Enquete salva no banco - ID: ${message.id}`);

    // Emitir nova mensagem via WebSocket
    try {
      console.log(`🔄 Emitindo enquete via WebSocket para ticket ${ticketId}`);
      emitToTicket(ticketId, 'new-message', message);
      emitToAll('message-update', { ticketId, message });
    } catch (socketError) {
      console.error('❌ Erro ao emitir mensagem via WebSocket:', socketError);
    }

    res.json({
      success: true,
      message: 'Enquete enviada com sucesso',
      messageId: result.messageId,
      data: {
        ticketId,
        to: ticket.contact,
        question,
        options,
        allowMultipleAnswers
      }
    });

  } catch (error) {
    console.error('❌ Erro ao enviar enquete:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};
