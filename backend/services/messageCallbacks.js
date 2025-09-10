import { Op } from 'sequelize';
import { emitToAll } from './socket.js';
import { sendText as sendTextBaileys } from './baileysService.js';
import { getBaileysSession } from './baileysService.js';
import { Session, Ticket, Queue, User, TicketMessage, Contact } from '../models/index.js';
import emitTicketsUpdate from './ticketBroadcast.js';
import { detectBaileysMessageType, extractBaileysMessageContent } from '../utils/baileysMessageDetector.js';
import { downloadAndProcessMedia, canDownloadMedia } from './mediaDownloadService.js';
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
    console.log(`🟢 [BAILEYS] handleBaileysMessage INICIADO - sessionId: ${sessionId}, messageId: ${message.key?.id}`);
    console.log(`📨 [BAILEYS] Processando mensagem Baileys - conteúdo:`, message.message?.conversation || message.message?.extendedTextMessage?.text || '[mídia/outro]');

    // Buscar sessão no banco - pode ser por ID numérico ou whatsappId (string)
    let sessionRecord = null;
    
    // Tentar buscar por ID numérico primeiro
    const numericSessionId = Number(sessionId);
    if (!isNaN(numericSessionId)) {
      sessionRecord = await Session.findByPk(numericSessionId);
      console.log(`🔍 [BAILEYS] Busca por ID numérico ${numericSessionId}:`, sessionRecord ? `encontrada (${sessionRecord.whatsappId})` : 'não encontrada');
    }
    
    // Se não encontrou, buscar por whatsappId (string)
    if (!sessionRecord) {
      sessionRecord = await Session.findOne({ where: { whatsappId: sessionId } });
      console.log(`🔍 [BAILEYS] Busca por whatsappId "${sessionId}":`, sessionRecord ? `encontrada (ID: ${sessionRecord.id})` : 'não encontrada');
    }

    if (!sessionRecord) {
      console.error(`❌ [BAILEYS] Sessão não encontrada para sessionId: ${sessionId}`);
      return;
    }

    console.log(`✅ [BAILEYS] Sessão encontrada: ID ${sessionRecord.id}, whatsappId: ${sessionRecord.whatsappId}`);

    // Use the actual session ID from the database record
    const actualSessionId = sessionRecord.id;

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
        sessionId: sessionRecord.id, // Usar ID numérico da sessão
        name: contactName,
        pushname: message.pushName, // Nome do WhatsApp
        formattedNumber: cleanNumber, // Número limpo sem @lid/@s.whatsapp.net
        isGroup: contactId.includes('@g.us')
      });
      console.log(`👤 [BAILEYS] Novo contato criado: ${contactName} (${contactId}) para sessão ${sessionRecord.id}`);
    } else {
      console.log(`👤 [BAILEYS] Contato existente encontrado: ${contact.name} (${contactId}) para sessão ${sessionRecord.id}`);
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

  // Extrair conteúdo da mensagem cedo para poder usar ao criar ticket
  const incomingContent = extractBaileysMessageContent(message);

  // Buscar ticket existente ou criar novo (diagnóstico detalhado)
  console.log('🔍[TICKET-SEARCH] Iniciando busca de ticket para contato:', contactId, '| remoteNorm:', remoteNorm, '| sessionId:', sessionId);
  let ticket = await Ticket.findOne({
      where: {
        contact: { [Op.in]: [contactId, remoteNorm].filter(Boolean) },
  status: { [Op.in]: ['open', 'pending'] }
      },
      order: [['createdAt', 'DESC']]
    });

    console.log(`🎫 [TICKET-SEARCH] Resultado da busca para ${contactId}: ${ticket ? `ENCONTRADO #${ticket.id} (status: ${ticket.status}, chatStatus: ${ticket.chatStatus}, assignedUserId: ${ticket.assignedUserId})` : 'NÃO ENCONTRADO'}`);

    let isNewTicket = false;
    if (!ticket) {
      console.log('🆕[TICKET-CREATE] Nenhum ticket aberto encontrado. Criando novo ticket...');
      // Criar novo ticket
      // Buscar sessão para aplicar defaultQueueId se existir
      const sess = await Session.findByPk(actualSessionId);
      console.log('🔧[TICKET-CREATE] Sessão encontrada:', sess ? `ID ${sess.id}, defaultQueueId: ${sess.defaultQueueId}` : 'NÃO ENCONTRADA');
      const defaultQueueId = sess?.defaultQueueId || null;
      ticket = await Ticket.create({
        contact: contactId,
        contactId: contact.id,
        status: 'open',            // alinhar com criação manual
        chatStatus: 'waiting',      // necessário para aparecer em "aguardando"
        unreadCount: 1,
        sessionId: actualSessionId,
        queueId: defaultQueueId,
        lastMessage: incomingContent || null,
        channel: 'whatsapp'
      });
      isNewTicket = true;
      console.log(`✅ [TICKET-CREATE] Novo ticket criado: #${ticket.id} com chatStatus: ${ticket.chatStatus}, queueId: ${ticket.queueId}`);
      if (defaultQueueId) {
        console.log(`🔧[TICKET-CREATE] defaultQueueId aplicado na criação: ${defaultQueueId}`);
      }

      // Tentar auto-atribuir à fila
      console.log('🔄[QUEUE-ASSIGN] Iniciando auto-atribuição à fila...');
      const assignResult = await autoAssignTicketToQueue(ticket, actualSessionId);
      console.log('✅[QUEUE-ASSIGN] Resultado autoAssignTicketToQueue:', assignResult, 'queueId final=', ticket.queueId);
    } else {
      console.log(`🔄 [TICKET-UPDATE] Ticket existente encontrado #${ticket.id}. Atualizando...`);
      // Se ticket foi encontrado por remoteNorm e temos pnNorm (1:1), migrar o ticket para usar pnNorm como contato principal
      if (!isGroup && pnNorm && ticket.contact !== pnNorm) {
        console.log(`🔁 [TICKET-MIGRATE] Migrando ticket #${ticket.id} de contato ${ticket.contact} -> ${pnNorm}`);
        await ticket.update({ contact: pnNorm, contactId: contact.id });
      }
      // Atualizar ticket existente
  const messageText = incomingContent;
      
      await ticket.update({
        unreadCount: ticket.unreadCount + 1,
        lastMessage: messageText,
        updatedAt: new Date(),
        channel: ticket.channel || 'whatsapp'
      });
      console.log(`✅ [TICKET-UPDATE] Ticket existente atualizado: #${ticket.id} (unread: ${ticket.unreadCount + 1})`);

      // Garantir que tickets sem atendente voltem para "Aguardando"
      try {
        const needsWaiting = !ticket.assignedUserId || !ticket.chatStatus || ticket.chatStatus === 'pending' || ticket.chatStatus === 'open';
        console.log(`🔍 [WAITING-CHECK] Ticket #${ticket.id} - assignedUserId: ${ticket.assignedUserId}, chatStatus: ${ticket.chatStatus}, needsWaiting: ${needsWaiting}`);
        if (needsWaiting && ticket.chatStatus !== 'waiting') {
          console.log(`⏳ [WAITING-SET] Alterando chatStatus do ticket #${ticket.id} de '${ticket.chatStatus}' para 'waiting'`);
          await ticket.update({ chatStatus: 'waiting' });
          console.log(`✅ [WAITING-SET] Ticket #${ticket.id} movido para 'waiting' (sem atendente)`);
          try {
            console.log('📡 [TICKETS-EMIT] Emitindo tickets-update imediato após mudança para waiting...');
            const { emitTicketsUpdate } = await import('./ticketBroadcast.js');
            await emitTicketsUpdate();
            console.log('✅ [TICKETS-EMIT] tickets-update emitido com sucesso');
          } catch (emitErr) {
            console.warn('⚠️ [TICKETS-EMIT] Falha ao emitir tickets-update imediato (Baileys):', emitErr.message);
          }
        } else {
          console.log(`ℹ️ [WAITING-SKIP] Ticket #${ticket.id} não precisa de mudança para waiting`);
        }
      } catch (stErr) {
        console.warn('⚠️ [WAITING-ERROR] Falha ao ajustar chatStatus para waiting:', stErr.message);
      }
    }

  // Conteúdo da mensagem já extraído
  const messageContent = incomingContent;
    
    // Detectar tipo de mensagem corretamente
    const messageType = detectBaileysMessageType(message);

    console.log(`💬 [BAILEYS] Conteúdo da mensagem extraído: "${messageContent}"`);
    console.log(`🔍 [BAILEYS] Tipo de mensagem detectado: "${messageType}"`);

    // Processar mídia se presente
    let mediaInfo = null;
    if (canDownloadMedia(message)) {
      console.log(`📥 [BAILEYS] Detectada mídia na mensagem, iniciando download...`);
      mediaInfo = await downloadAndProcessMedia(message, sessionId);
      if (mediaInfo) {
        console.log(`✅ [BAILEYS] Mídia processada:`, mediaInfo);
      }
    }

    // Verificar se é resposta de enquete
    const pollResponse = await detectPollResponse(messageContent, ticket.id);

    // Capturar NPS quando ticket fechado. Reabrir depois de capturar, e também
    // se cliente mandar outra mensagem após já ter respondido.
    try {
      if (ticket.chatStatus === 'closed' || ticket.chatStatus === 'resolved') {
        const trimmed = (messageContent || '').trim();
        const isStrictNumeric = /^\d{1,2}$/.test(trimmed);
  console.log(`[NPS] Avaliando mensagem para NPS -> ticket #${ticket.id} status=${ticket.chatStatus} npsScore=${ticket.npsScore} trimmed='${trimmed}' isStrictNumeric=${isStrictNumeric}`);
        // Caso ainda não tenha NPS e seja nota puramente numérica => registra, NÃO reabre
  if (ticket.npsScore == null && isStrictNumeric) {
          const score = parseInt(trimmed, 10);
          if (score >= 0 && score <= 10) {
            const npsUserId = ticket.assignedUserId || null;
            await ticket.update({ npsScore: score, npsUserId });
            console.log(`⭐ NPS registrado para ticket #${ticket.id}: ${score}`);
            // Mensagem de agradecimento
            let thanksContent = `Obrigado! Sua nota ${score} foi registrada.`;
            try {
              const { Setting } = await import('../models/index.js');
              const thanksSetting = await Setting.findOne({ where: { key: 'chat_nps_thanks_template' } });
              if (thanksSetting && thanksSetting.value) {
                thanksContent = thanksSetting.value.replace(/\{nota\}/g, String(score));
              }
            } catch (templErr) {
              console.warn('⚠️ Não foi possível carregar template de agradecimento NPS:', templErr.message);
            }
            try {
              const thanksMsg = await TicketMessage.create({
                ticketId: ticket.id,
                sender: 'system',
                content: thanksContent,
                timestamp: new Date(),
                isFromGroup: false,
                messageType: 'text',
                channel: 'system'
              });
              emitToAll('new-message', { id: thanksMsg.id, ticketId: ticket.id, content: thanksContent, sender: 'system', channel: 'system', messageType: 'text', createdAt: thanksMsg.createdAt });
              if (!ticket.queueId && ticket.sessionId) {
                try {
                  const { sendText } = await import('./baileysService.js');
                  await sendText(ticket.sessionId, ticket.contact, thanksContent);
                } catch (extErr) {
                  console.warn('⚠️ Falha ao enviar agradecimento NPS externamente:', extErr.message);
                }
              }
            } catch (ackErr) {
              console.warn('⚠️ Falha ao salvar/enviar mensagem de agradecimento NPS:', ackErr.message);
            }
            // NÃO reabrir se for somente número
          }
        } else {
          // Se já existe NPS e usuário envia novamente apenas número, ignorar silenciosamente (sem reabrir)
          if (ticket.npsScore != null && isStrictNumeric) {
            console.log(`🔒 Nota NPS já registrada para ticket #${ticket.id}; ignorando nova nota '${trimmed}'.`);
            // segue fluxo normal para salvar mensagem como histórico sem alterar status
          }
          // Mensagem não é somente número. Se já existe NPS ou se ainda não temos (comentário adicional), reabrir.
          const shouldReopen = !isStrictNumeric; // explicitamente texto / não só números
          if (shouldReopen && (ticket.chatStatus === 'closed' || ticket.chatStatus === 'resolved')) {
            try {
              await ticket.update({ chatStatus: 'waiting' });
              await emitTicketsUpdate();
              console.log(`🔄 Ticket #${ticket.id} reaberto (waiting) por mensagem textual pós-encerramento.`);
            } catch (reopenErr) {
              console.warn('⚠️ Falha ao reabrir ticket após mensagem textual:', reopenErr.message);
            }
          }
        }
      }
    } catch (npsErr) {
      console.warn('⚠️ Erro no fluxo de NPS:', npsErr.message);
    }
    
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
      channel: 'whatsapp',
      // LID support if provided by Baileys (v6.7.19+)
      senderLid: message.key?.senderLid,
      participantLid: message.key?.participantLid,
      senderPn: message.key?.senderPn,
      participantId: participantIdNorm || null,
      // Campos de mídia
      fileUrl: mediaInfo?.filePath || null,
      fileName: mediaInfo?.fileName || null,
      mimeType: mediaInfo?.mimeType || null,
      fileSize: mediaInfo?.size || null,
      duration: mediaInfo?.duration || null,
      isPtt: mediaInfo?.isPtt || false
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
      await processQueueRules(ticket, actualSessionId, false);
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
      ticketUpdatedAt: ticket.updatedAt,
      channel: 'whatsapp',
      // Campos de mídia - incluir no evento para o frontend
      fileUrl: savedMessage.fileUrl,
      fileName: savedMessage.fileName,
      mimeType: savedMessage.mimeType,
      fileSize: savedMessage.fileSize,
      duration: savedMessage.duration,
      isPtt: savedMessage.isPtt,
      fileType: savedMessage.mimeType // Para compatibilidade
    };    
    
    console.log(`🚀 [BAILEYS] Emitindo evento new-message para ticket #${ticket.id}:`);
    console.log(`📡 [BAILEYS] Dados do evento:`, JSON.stringify(eventData, null, 2));
    
    // Verificar quantos clientes estão conectados na sala do ticket
    const { getRoomInfo } = await import('./socket.js');
    const roomInfo = getRoomInfo(`ticket-${ticket.id}`);
    console.log(`📊 [BAILEYS] Info da sala ticket-${ticket.id}:`, roomInfo);
    
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
      console.log('📡 [FINAL-EMIT] Emitindo tickets-update final...');
      await emitTicketsUpdate();
      console.log('✅ [FINAL-EMIT] tickets-update final emitido com sucesso');
    } catch (e) {
      console.error('❌ [FINAL-EMIT] Erro ao emitir tickets-update após mensagem:', e.message);
    }

    console.log(`🎯 [BAILEYS-COMPLETE] Processamento completo da mensagem para ticket #${ticket.id} - ID da mensagem: ${savedMessage.id}`);
    console.log(`🎯 [BAILEYS-COMPLETE] Estado final do ticket: status=${ticket.status}, chatStatus=${ticket.chatStatus}, queueId=${ticket.queueId}, assignedUserId=${ticket.assignedUserId}`);

  } catch (error) {
    console.error(`❌ [BAILEYS-ERROR] Erro ao processar mensagem Baileys:`, error);
  }
};

export {
  autoAssignTicketToQueue,
  handleBaileysMessage,
  normalizeSenderPn
};

// ======================= whatsapp-web.js inbound =========================
// Processamento simples e eficiente para mensagens do whatsapp-web.js
export const handleWwebjsMessage = async (msg, sessionKey) => {
  try {
    console.log(`📨 [WWEBJS] Processando mensagem - sessionKey: ${sessionKey}`);
    
    // Filtrar apenas mensagens próprias - WhatsApp-web.js é mais estável que Baileys
    if (msg.fromMe) {
      console.log(`⏭️ [WWEBJS] Ignorando mensagem própria: ${msg.body?.substring(0, 50)}`);
      return;
    }
    
    // Localizar Sessão por whatsappId (sessionKey)
    const session = await Session.findOne({ where: { whatsappId: sessionKey } });
    if (!session) {
      console.warn(`❌ [WWEBJS] Sessão não encontrada para chave: ${sessionKey}`);
      return;
    }

    const isGroup = msg.from?.endsWith('@g.us');
    const contactId = isGroup ? msg.from : (msg.from || null);
    if (!contactId) {
      console.warn(`❌ [WWEBJS] ContactId inválido:`, msg.from);
      return;
    }

    console.log(`👤 [WWEBJS] Contact ID: ${contactId} (grupo: ${isGroup})`);

    // Buscar/criar contato
    let contact = await Contact.findOne({ where: { whatsappId: contactId } });
    if (!contact) {
      const clean = contactId.split('@')[0];
      let contactName = clean;
      
      try {
        // Tentar obter nome do contato de forma simples
        contactName = msg._data?.notifyName || msg._data?.pushname || clean;
      } catch (e) {
        // Ignorar erros na obtenção do nome
      }
      
      contact = await Contact.create({
        whatsappId: contactId,
        sessionId: session.id,
        name: contactName,
        pushname: contactName,
        isGroup: isGroup,
        formattedNumber: clean
      });
      console.log(`✅ [WWEBJS] Novo contato criado: ${contactName} (${contactId})`);
      emitToAll('contact-updated', contact);
    } else {
      console.log(`👤 [WWEBJS] Contato existente: ${contact.name} (${contactId})`);
    }

    // Buscar ticket aberto ou criar novo
    let ticket = await Ticket.findOne({
      where: { contact: contactId, status: { [Op.in]: ['open', 'pending'] } },
      order: [['createdAt', 'DESC']]
    });
    
    let isNewTicket = false;
    if (!ticket) {
      const defaultQueueId = session?.defaultQueueId || null;
      ticket = await Ticket.create({
        contact: contactId,
        contactId: contact.id,
        sessionId: session.id,
        status: 'open',
        chatStatus: 'waiting',
        unreadCount: 1,
        channel: 'whatsapp',
        queueId: defaultQueueId,
        lastMessage: msg.body || '[mensagem sem conteúdo]'
      });
      isNewTicket = true;
      console.log(`🎫 [WWEBJS] Novo ticket criado: #${ticket.id}`);
      
      // Tentar auto-atribuir à fila
      try {
        await autoAssignTicketToQueue(ticket, session.id);
      } catch (e) {
        console.warn(`⚠️ [WWEBJS] Erro na auto-atribuição de fila:`, e?.message);
      }
    } else {
      await ticket.update({ 
        unreadCount: ticket.unreadCount + 1,
        lastMessage: msg.body || '[mensagem sem conteúdo]'
      });
      console.log(`🎫 [WWEBJS] Ticket existente atualizado: #${ticket.id} (unread: ${ticket.unreadCount + 1})`);

      // Garantir visibilidade em "Aguardando" quando não há atendente
      try {
        const needsWaiting = !ticket.assignedUserId || !ticket.chatStatus || ticket.chatStatus === 'pending' || ticket.chatStatus === 'open';
        if (needsWaiting && ticket.chatStatus !== 'waiting') {
          await ticket.update({ chatStatus: 'waiting' });
          console.log(`⏳ [WWEBJS] Ticket #${ticket.id} movido para 'waiting' (sem atendente)`);
          try {
            const { emitTicketsUpdate } = await import('./ticketBroadcast.js');
            await emitTicketsUpdate();
          } catch (emitErr) {
            console.warn('⚠️ [WWEBJS] Falha ao emitir tickets-update imediato:', emitErr.message);
          }
        }
      } catch (stErr) {
        console.warn('⚠️ [WWEBJS] Falha ao ajustar chatStatus para waiting:', stErr.message);
      }
    }

    const body = msg.body || '[mensagem sem conteúdo]';

    // Detectar tipo de mensagem de forma simples
    let messageType = 'text';
    
    try {
      if (msg.hasMedia) {
        messageType = 'media'; // Simples - não tentar baixar mídia por enquanto
        console.log(`📎 [WWEBJS] Mídia detectada na mensagem`);
      }
    } catch (e) {
      // Ignorar erros de mídia por enquanto
    }

    // Usar timestamp da mensagem se disponível, senão usar atual
    const messageTimestamp = msg.timestamp ? new Date(msg.timestamp * 1000) : new Date();

    const saved = await TicketMessage.create({
      ticketId: ticket.id,
      sender: 'contact',
      content: body,
      timestamp: messageTimestamp,
      channel: 'whatsapp',
      messageType: messageType,
      messageId: msg.id?._serialized || null
    });

    console.log(`💾 [WWEBJS] Mensagem salva: #${saved.id} para ticket #${ticket.id}`);

    // Processar regras da fila se não for novo ticket
    if (!isNewTicket && ticket.queueId) {
      try {
        await processQueueRules(ticket, session.id, false);
      } catch (e) {
        console.warn(`⚠️ [WWEBJS] Erro ao processar regras da fila:`, e?.message);
      }
    }

    const eventData = {
      id: saved.id,
      ticketId: ticket.id,
      sender: 'contact',
      content: body,
      timestamp: saved.timestamp,
      channel: 'whatsapp',
      messageType: messageType,
      lastMessage: body,
      ticketUpdatedAt: ticket.updatedAt
    };

    console.log(`🚀 [WWEBJS] Emitindo evento new-message para ticket #${ticket.id}`);
    emitToAll('new-message', eventData);
    
    // Atualizar lista de tickets
    try {
      await emitTicketsUpdate();
    } catch (e) {
      console.warn(`⚠️ [WWEBJS] Erro ao emitir tickets-update:`, e?.message);
    }

    console.log(`✅ [WWEBJS] Processamento completo da mensagem para ticket #${ticket.id}`);
  } catch (e) {
    console.error('[WWEBJS] handleWwebjsMessage erro:', e);
  }
};
