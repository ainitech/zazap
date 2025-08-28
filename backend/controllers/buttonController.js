import { sendButtons, sendList } from '../services/whatsappjsService.js';
import { Ticket, Contact, Session } from '../models/index.js';

export const sendButtonMessage = async (req, res) => {
  try {
    const { ticketId, text, buttons, title, footer } = req.body;

    // Validação dos dados obrigatórios
    if (!ticketId || !text || !buttons || !Array.isArray(buttons)) {
      return res.status(400).json({
        error: 'ticketId, text e buttons são obrigatórios. buttons deve ser um array.'
      });
    }

    if (buttons.length === 0 || buttons.length > 3) {
      return res.status(400).json({
        error: 'O WhatsApp permite entre 1 e 3 botões por mensagem.'
      });
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

    // Validar estrutura dos botões
    for (const button of buttons) {
      if (!button.text && !button.displayText) {
        return res.status(400).json({
          error: 'Cada botão deve ter uma propriedade "text" ou "displayText"'
        });
      }
      if (button.text && button.text.length > 20) {
        return res.status(400).json({
          error: 'O texto do botão não pode exceder 20 caracteres'
        });
      }
    }

    console.log(`📤 Enviando botões para ticket ${ticketId}:`, {
      to: ticket.contact,
      sessionId: session.id,
      buttonsCount: buttons.length
    });

    // Enviar os botões
    const result = await sendButtons(
      session.id,
      ticket.contact,
      text,
      buttons,
      title,
      footer
    );

    res.json({
      success: true,
      message: 'Botões enviados com sucesso',
      messageId: result.messageId,
      whatsappResponse: result.data,
      data: {
        ticketId,
        to: ticket.contact,
        text,
        buttons,
        title,
        footer
      }
    });

  } catch (error) {
    console.error('❌ Erro ao enviar botões:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};

export const sendListMessage = async (req, res) => {
  try {
    const { ticketId, text, buttonText, sections, title, footer } = req.body;

    // Validação dos dados obrigatórios
    if (!ticketId || !text || !buttonText || !sections || !Array.isArray(sections)) {
      return res.status(400).json({
        error: 'ticketId, text, buttonText e sections são obrigatórios. sections deve ser um array.'
      });
    }

    if (sections.length === 0 || sections.length > 10) {
      return res.status(400).json({
        error: 'O WhatsApp permite entre 1 e 10 seções por lista.'
      });
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

    // Validar estrutura das seções
    for (const section of sections) {
      if (!section.title || !section.rows || !Array.isArray(section.rows)) {
        return res.status(400).json({
          error: 'Cada seção deve ter "title" e "rows" (array)'
        });
      }
      
      if (section.rows.length === 0 || section.rows.length > 10) {
        return res.status(400).json({
          error: 'Cada seção deve ter entre 1 e 10 itens'
        });
      }

      for (const row of section.rows) {
        if (!row.title) {
          return res.status(400).json({
            error: 'Cada item da lista deve ter um "title"'
          });
        }
        if (row.title.length > 24) {
          return res.status(400).json({
            error: 'O título do item não pode exceder 24 caracteres'
          });
        }
        if (row.description && row.description.length > 72) {
          return res.status(400).json({
            error: 'A descrição do item não pode exceder 72 caracteres'
          });
        }
      }
    }

    console.log(`📤 Enviando lista para ticket ${ticketId}:`, {
      to: ticket.contact,
      sessionId: session.id,
      sectionsCount: sections.length
    });

    // Enviar a lista
    const message = await sendList(
      session.id,
      ticket.contact,
      text,
      buttonText,
      sections,
      title,
      footer
    );

    res.json({
      success: true,
      message: 'Lista enviada com sucesso',
      messageId: message.messageId,
      data: {
        ticketId,
        to: ticket.contact,
        text,
        buttonText,
        sections,
        title,
        footer
      }
    });

  } catch (error) {
    console.error('❌ Erro ao enviar lista:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
};
