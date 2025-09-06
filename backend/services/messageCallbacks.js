import { Op } from 'sequelize';
import { emitToAll } from './socket.js';
import { sendText as sendTextBaileys } from './baileysService.js';
import { getBaileysSession } from './baileysService.js';
import { Session, Ticket, Queue, User, TicketMessage, Contact } from '../models/index.js';
import emitTicketsUpdate from './ticketBroadcast.js';
import { detectBaileysMessageType, extractBaileysMessageContent } from '../utils/baileysMessageDetector.js';
import {
  processQueueRules,
  processHumanTransfer,
  autoReceiveTicketToQueue
} from './queueRules.js';

// Função para detectar se uma mensagem pode ser resposta de enquete
const detectPollResponse = async (messageBody, ticketId) => {
  try {
    // Buscar enquetes recentes no ticket (últimas 24 horas)
    const recentPolls = await TicketMessage.findAll({
      where: {
        ticketId,
        messageType: 'poll',
        createdAt: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    if (recentPolls.length === 0) {
      return null; // Nenhuma enquete recente encontrada
    }

    // Verificar se a mensagem corresponde a uma opção de enquete
    for (const poll of recentPolls) {
      try {
        const pollData = JSON.parse(poll.pollData || poll.content);
        if (pollData.options && Array.isArray(pollData.options)) {
          // Verificar se a mensagem é um número correspondente a uma opção
          const optionIndex = parseInt(messageBody.trim()) - 1; // Converter para 0-based
          if (!isNaN(optionIndex) && optionIndex >= 0 && optionIndex < pollData.options.length) {
            return {
              pollMessageId: poll.messageId,
              selectedOption: optionIndex,
              pollData: pollData
            };
          }

          // Verificar se a mensagem contém exatamente o texto de uma opção
          const exactMatchIndex = pollData.options.findIndex(option =>
            option.toLowerCase().trim() === messageBody.toLowerCase().trim()
          );
          if (exactMatchIndex !== -1) {
            return {
              pollMessageId: poll.messageId,
              selectedOption: exactMatchIndex,
              pollData: pollData
            };
          }
        }
      } catch (error) {
        console.log(`⚠️ Erro ao processar enquete ${poll.id}:`, error.message);
      }
    }

    return null; // Não é resposta de enquete
  } catch (error) {
    console.error('❌ Erro ao detectar resposta de enquete:', error);
    return null;
  }
};


// Agora usa a nova implementação unificada do queueRules.js
const autoAssignTicketToQueue = async (ticket, sessionId) => {
  try {
    console.log(`🔍 [autoAssignTicketToQueue] Iniciando para ticket #${ticket.id} (sessão ${sessionId})`);

    // Primeiro tenta auto-recebimento explícito (caso fila tenha autoReceiveMessages)
    const receivedQueue = await autoReceiveTicketToQueue(ticket, sessionId);

    if (!receivedQueue) {
      // Se não recebeu por autoReceive, ainda processa regras para tentar atribuição baseada em outras regras
      const rulesResult = await processQueueRules(ticket, sessionId, true);
      if (rulesResult.queueId) {
        console.log(`✅ [autoAssignTicketToQueue] Ticket #${ticket.id} entrou na fila "${rulesResult.queueName}"`);
        return true;
      }
      console.log(`❌ [autoAssignTicketToQueue] Nenhuma fila atribuída ao ticket #${ticket.id}`);
      return false;
    }

    // Já recebeu fila, agora processa regras restantes
    await processQueueRules(ticket, sessionId, true);
    return true;
  } catch (error) {
    console.error(`❌ [autoAssignTicketToQueue] Erro:`, error);
    return false;
  }
};

// Removida lógica de normalização avançada (normalizeContactId) a pedido.
const normalizeSenderPn = (senderPn) => senderPn || null;


// Função para processar mensagens do Baileys
const handleBaileysMessage = async (message, sessionId) => {
  try {
    console.log(`� [BAILEYS] handleBaileysMessage CHAMADO - sessionId: ${sessionId}`);
    console.log(`�📨 [BAILEYS] Processando mensagem Baileys:`, JSON.stringify(message, null, 2));

  // Determine primary JID for contact/ticket:
  // - For groups (@g.us): use the group JID (normalized).
  // - For 1:1: prefer senderPn when provided (real phone JID), else normalized remoteJid (may be @s.whatsapp.net from @lid conversion).
  const remoteJidRaw = message.key.remoteJid;
  const isGroup = remoteJidRaw && remoteJidRaw.endsWith('@g.us');
  // Usar diretamente os IDs fornecidos sem normalização adicional
  const remoteNorm = remoteJidRaw;
  const pnNorm = message.key?.senderPn || null;
  const contactId = isGroup ? remoteNorm : (pnNorm || remoteNorm);

  if (!contactId) {
      console.log(`❌ [BAILEYS] ContactId inválido:`, message.key.remoteJid);
      return;
    }

  console.log(`📞 [BAILEYS] Contact ID normalizado: ${contactId} (original: ${message.key.remoteJid}, senderPn: ${message.key?.senderPn || 'N/A'})`);

    // Buscar ou criar contato
    let contact = await Contact.findOne({ where: { whatsappId: contactId } });
    if (!contact) {
      // Extrair número limpo para nome se não houver pushName
      const sourceForNumber = contactId; // já é pnNorm quando disponível
      const cleanNumber = sourceForNumber.split('@')[0];
      
      const contactName = message.pushName || cleanNumber;
      
      contact = await Contact.create({
        whatsappId: contactId, // Mantém normalizado para consistência no banco
        sessionId: sessionId,
        name: contactName,
        pushname: message.pushName, // Nome do WhatsApp
        formattedNumber: cleanNumber, // Número limpo sem @lid/@s.whatsapp.net
        isGroup: contactId.includes('@g.us')
      });
      console.log(`👤 [BAILEYS] Novo contato criado: ${contactName} (${contactId})`);
    } else {
      console.log(`👤 [BAILEYS] Contato existente encontrado: ${contact.name} (${contactId})`);
      // Atualiza somente foto se ainda não houver e não for grupo
      if (!contact.profilePicUrl && !contact.isGroup) {
        try {
          const session = await Session.findByPk(sessionId);
          if (session?.library === 'baileys') {
            const sock = getBaileysSession(session.whatsappId);
            if (sock) {
              try {
                const pic = await sock.profilePictureUrl(contactId, 'image');
                if (pic) {
                  await contact.update({ profilePicUrl: pic, lastSeen: new Date() });
                  emitToAll('contact-updated', contact);
                  console.log(`🖼️ [BAILEYS] Foto adicionada ao contato ${contactId}`);
                }
              } catch (picErr) {
                console.log(`⚠️ [BAILEYS] Não foi possível obter foto para ${contactId}: ${picErr.message}`);
              }
            }
          }
        } catch (updErr) {
          console.log(`⚠️ [BAILEYS] Erro ao tentar atualizar foto do contato ${contactId}: ${updErr.message}`);
        }
      }
    }

  // Buscar ticket existente ou criar novo (diagnóstico detalhado)
  console.log('🧪[MSG] Iniciando busca de ticket para contato', contactId, 'remoteNorm', remoteNorm, 'session', sessionId);
  let ticket = await Ticket.findOne({
      where: {
        contact: { [Op.in]: [contactId, remoteNorm].filter(Boolean) },
        status: ['open', 'pending']
      },
      order: [['createdAt', 'DESC']]
    });

    console.log(`🎫 [BAILEYS] Busca de ticket para ${contactId}: ${ticket ? `encontrado #${ticket.id}` : 'não encontrado'}`);

    let isNewTicket = false;
    if (!ticket) {
      console.log('🧪[MSG] Nenhum ticket aberto encontrado. Criando novo ticket...');
      // Criar novo ticket
      // Buscar sessão para aplicar defaultQueueId se existir
      const sess = await Session.findByPk(sessionId);
      const defaultQueueId = sess?.defaultQueueId || null;
      ticket = await Ticket.create({
        contact: contactId,
        contactId: contact.id,
        status: 'pending',
        unreadCount: 1,
        sessionId: sessionId,
        queueId: defaultQueueId
      });
      isNewTicket = true;
      console.log(`🎫 [BAILEYS] Novo ticket criado: #${ticket.id}`);
      if (defaultQueueId) {
        console.log(`🧪[MSG] defaultQueueId aplicado na criação: ${defaultQueueId}`);
      }

      // Tentar auto-atribuir à fila
      const assignResult = await autoAssignTicketToQueue(ticket, sessionId);
      console.log('🧪[MSG] Resultado autoAssignTicketToQueue:', assignResult, 'queueId final=', ticket.queueId);
    } else {
      // Se ticket foi encontrado por remoteNorm e temos pnNorm (1:1), migrar o ticket para usar pnNorm como contato principal
      if (!isGroup && pnNorm && ticket.contact !== pnNorm) {
        console.log(`🔁 [BAILEYS] Migrando ticket #${ticket.id} de contato ${ticket.contact} -> ${pnNorm}`);
        await ticket.update({ contact: pnNorm, contactId: contact.id });
      }
      // Atualizar ticket existente
      const messageText = extractBaileysMessageContent(message);
      
      await ticket.update({
        unreadCount: ticket.unreadCount + 1,
        lastMessage: messageText,
        updatedAt: new Date()
      });
      console.log(`🎫 [BAILEYS] Ticket existente atualizado: #${ticket.id} (unread: ${ticket.unreadCount + 1})`);
    }

    // Extrair conteúdo da mensagem usando função especializada
    const messageContent = extractBaileysMessageContent(message);
    
    // Detectar tipo de mensagem corretamente
    const messageType = detectBaileysMessageType(message);

    console.log(`💬 [BAILEYS] Conteúdo da mensagem extraído: "${messageContent}"`);
    console.log(`🔍 [BAILEYS] Tipo de mensagem detectado: "${messageType}"`);

    // Verificar se é resposta de enquete
    const pollResponse = await detectPollResponse(messageContent, ticket.id);
    
    // Extrair participant (para mensagens de grupo)
  const rawParticipant = message.key?.participant;
  const participantIdNorm = rawParticipant || null;

    let messageData = {
      ticketId: ticket.id,
      sender: 'contact',  // Mudança: usar 'contact' em vez de 'customer' para consistência com frontend
      content: messageContent,
      messageId: message.key.id,
      timestamp: new Date(),
      isFromGroup: (remoteNorm || '').includes('@g.us'),
      messageType: messageType, // Usar tipo detectado corretamente
      // LID support if provided by Baileys (v6.7.19+)
      senderLid: message.key?.senderLid,
      participantLid: message.key?.participantLid,
      senderPn: message.key?.senderPn,
      participantId: participantIdNorm || null
    };

    console.log(`💾 [BAILEYS] Dados da mensagem para salvar:`, messageData);

    // Se for resposta de enquete, adicionar campos específicos
    if (pollResponse) {
      messageData.messageType = 'poll_response';
      messageData.pollResponse = pollResponse.selectedOption;
      messageData.pollMessageId = pollResponse.pollMessageId;
      console.log(`📊 Resposta de enquete detectada: Opção ${pollResponse.selectedOption + 1} da enquete ${pollResponse.pollMessageId}`);
    }

    // Salvar mensagem
    const savedMessage = await TicketMessage.create(messageData);

    console.log(`💾 [BAILEYS] Mensagem salva com ID ${savedMessage.id} para ticket #${ticket.id}`);

    // Processar regras da fila se não for novo (novo já foi processado no autoAssignTicketToQueue)
    if (!isNewTicket && ticket.queueId) {
      await processQueueRules(ticket, sessionId, false);
    }

    // Emitir evento - enviar mensagem diretamente com ticketId incluído
    const eventData = {
      id: savedMessage.id,
      ticketId: ticket.id,
      sender: 'contact',  // Consistente com como foi salvo
      content: messageContent,
      timestamp: new Date(),
      messageType: savedMessage.messageType,
      pollResponse: savedMessage.pollResponse,
      pollMessageId: savedMessage.pollMessageId,
      senderLid: savedMessage.senderLid,
      participantLid: savedMessage.participantLid,
  senderPn: savedMessage.senderPn,
  lastMessage: messageContent,
  ticketUpdatedAt: ticket.updatedAt
    };
    
    console.log(`🚀 [BAILEYS] Emitindo evento new-message para ticket #${ticket.id}:`);
    console.log(`📡 [BAILEYS] Dados do evento:`, JSON.stringify(eventData, null, 2));
    
    // Emitir para todos (global) e especificamente para a sala do ticket
    emitToAll('new-message', eventData);
    console.log(`✅ [BAILEYS] Evento emitido globalmente`);
    
    // Também emitir especificamente para clientes conectados à sala do ticket
    const { emitToTicket } = await import('./socket.js');
    emitToTicket(ticket.id, 'new-message', eventData);
    console.log(`✅ [BAILEYS] Evento emitido para sala do ticket ${ticket.id}`);
    
    // Atualizar lista de tickets para frontend (Aguardando/Accepted tabs)
    // Evitar excesso: apenas ao criar ticket novo ou quando unreadCount muda.
    try {
      await emitTicketsUpdate();
    } catch (e) {
      console.error('Erro ao emitir tickets-update após mensagem:', e.message);
    }

    console.log(`🎯 [BAILEYS] Processamento completo da mensagem para ticket #${ticket.id} - ID da mensagem: ${savedMessage.id}`);

  } catch (error) {
    console.error(`❌ [BAILEYS] Erro ao processar mensagem Baileys:`, error);
  }
};

export {
  autoAssignTicketToQueue,
  handleBaileysMessage,
  normalizeSenderPn
};
