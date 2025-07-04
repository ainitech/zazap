import { TicketMessage, Ticket, Session } from '../models/index.js';
import { sendText as sendTextWhatsappJs } from '../services/whatsappjsService.js';
import { sendText as sendTextBaileys } from '../services/baileysService.js';

// Lista mensagens de um ticket
export const listMessages = async (req, res) => {
  const { ticketId } = req.params;
  try {
    console.log(`🔍 Buscando mensagens do ticket ${ticketId}`);
    
    const messages = await TicketMessage.findAll({
      where: { ticketId },
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
    
    // Enviar mensagem via WhatsApp se sender for 'user'
    if (sender === 'user') {
      console.log(`📱 Enviando mensagem via WhatsApp para ${ticket.contact} na sessão ${ticket.sessionId}`);
      
      // Buscar informações da sessão para saber qual biblioteca usar
      const session = await Session.findByPk(ticket.sessionId);
      if (!session) {
        console.error(`❌ Sessão ${ticket.sessionId} não encontrada no banco de dados`);
      } else {
        console.log(`🔍 Sessão encontrada: ${session.library} (${session.whatsappId}) - Status: ${session.status}`);
        console.log(`🔑 Usando whatsappId "${session.whatsappId}" para buscar sessão ativa`);
        
        // Verificar apenas o status do banco de dados
        if (session.status !== 'connected') {
          console.error(`❌ Sessão ${ticket.sessionId} não está conectada no banco (status: ${session.status})`);
        } else {
          console.log(`✅ Sessão está conectada no banco, enviando mensagem...`);
          
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
    
    res.json(message);
  } catch (err) {
    console.error(`❌ Erro ao enviar mensagem para ticket ${ticketId}:`, err);
    res.status(500).json({ error: err.message });
  }
};
