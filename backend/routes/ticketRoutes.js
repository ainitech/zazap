import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { moveTicket, listTickets, acceptTicket, resolveTicket, closeTicket, updateTicket, deleteTicket, restoreTicket, permanentDeleteTicket, getTicketByUid, createTicket, updateTicketPriority } from '../controllers/ticketController.js';
import { transferTicketToQueue } from '../controllers/queueController.js';
const router = express.Router();

// Listar tickets com filtros e busca avançada
router.get('/', authMiddleware, listTickets);

// Buscar ticket por UID (para links diretos)
router.get('/uid/:uid', authMiddleware, getTicketByUid);

// Criar ticket
router.post('/', authMiddleware, createTicket);

// Aceitar ticket
router.put('/:ticketId/accept', authMiddleware, acceptTicket);

// Resolver ticket
router.put('/:ticketId/resolve', authMiddleware, resolveTicket);

// Fechar ticket
router.put('/:ticketId/close', authMiddleware, closeTicket);

// Mover ticket para outra fila
router.post('/move', authMiddleware, moveTicket);

// Transferir ticket para outra fila (ou agente)
router.post('/:ticketId/transfer', authMiddleware, transferTicketToQueue);

// Atualizar ticket (campos permitidos)
router.put('/:ticketId', authMiddleware, updateTicket);

// Deletar (soft-delete) ticket
router.delete('/:ticketId', authMiddleware, deleteTicket);

// Deletar ticket permanentemente (remove tudo sobre o contato)
router.delete('/:ticketId/permanent', authMiddleware, permanentDeleteTicket);

// Restaurar ticket da lixeira
router.post('/:ticketId/restore', authMiddleware, restoreTicket);

// Atualizar prioridade do ticket
router.put('/:ticketId/priority', authMiddleware, updateTicketPriority);

// Notificar status de gravação de áudio
router.post('/:id/recording-status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { isRecording } = req.body;
    
    // Buscar o ticket
    const { Ticket, Contact, Session } = await import('../models/index.js');
    const ticket = await Ticket.findByPk(id, {
      include: [
        { model: Contact, as: 'Contact' }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }
    
    if (!ticket.sessionId) {
      return res.status(400).json({ error: 'Sessão não encontrada para este ticket' });
    }
    
    const phoneNumber = ticket.Contact?.phoneNumber || ticket.contact;
    const sessionId = ticket.sessionId;
    
    try {
      // Usar o Gerenciador Inteligente para enviar status de presença
      const intelligentLibraryManager = (await import('../services/intelligentLibraryManager.js')).default;
      const { Session } = await import('../models/index.js');
      
      // Buscar informações da sessão
      const sessionRecord = await Session.findByPk(sessionId);
      if (!sessionRecord) {
        return res.status(400).json({ error: 'Registro de sessão não encontrado' });
      }
      
      console.log(`🎵 Enviando status via Gerenciador Inteligente para ${phoneNumber}`);
      
      const presenceStatus = isRecording ? 'recording' : 'available';
      
  // Usar Gerenciador Inteligente primeiro
      try {
        const statusResult = await intelligentLibraryManager.sendPresenceUpdate(
          sessionRecord.whatsappId,
          phoneNumber,
          presenceStatus
        );
        
        console.log(`✅ Status "${presenceStatus}" enviado via ${statusResult.library} (Gerenciador Inteligente)`);
        return res.json({ success: true, library: statusResult.library });
        
      } catch (intelligentError) {
        console.log('❌ Gerenciador Inteligente falhou:', intelligentError.message);
        
        // Fallback: tentar com a biblioteca específica da sessão
        if (sessionRecord.library === 'baileys') {
          const baileysService = await import('../services/baileysService.js');
          const baileysClient = baileysService.getBaileysSession(sessionRecord.whatsappId);
          
          if (baileysClient && baileysClient.user) {
            await baileysClient.sendPresenceUpdate(presenceStatus, phoneNumber);
            console.log(`✅ Status "${presenceStatus}" enviado via Baileys (fallback)`);
            return res.json({ success: true, library: 'baileys' });
          }
        } else if (sessionRecord.library === 'whatsappjs') {
          const wwebjsService = await import('../services/wwebjsService.js');
          const wwebjsClient = wwebjsService.default.getWwebjsSession(sessionRecord.whatsappId);
          
          if (wwebjsClient) {
            // WWebJS tem método próprio para presença
            await wwebjsClient.sendPresenceUpdate?.(presenceStatus);
            console.log(`✅ Status "${presenceStatus}" enviado via WWebJS (fallback)`);
            return res.json({ success: true, library: 'whatsappjs' });
          }
        }
        
        throw new Error(`Nenhuma biblioteca disponível para sessão ${sessionRecord.whatsappId}`);
      }
      
    } catch (error) {
      console.log('❌ Gerenciador Inteligente falhou:', error.message);
      
      // Fallback para Baileys direto
      try {
        const baileysService = await import('../services/baileysService.js');
        const { Session } = await import('../models/index.js');
        const sessionRecord = await Session.findByPk(sessionId);
        
        if (sessionRecord) {
          const baileysClient = baileysService.getBaileysSession(sessionRecord.whatsappId);
          if (baileysClient && baileysClient.user) {
            const presenceStatus = isRecording ? 'recording' : 'available';
            await baileysClient.sendPresenceUpdate(presenceStatus, phoneNumber);
            console.log(`✅ Status "${presenceStatus}" enviado via fallback Baileys`);
            return res.json({ success: true, library: 'baileys' });
          }
        }
      } catch (fallbackError) {
        console.log('❌ Fallback Baileys também falhou:', fallbackError.message);
      }
    }
    
    // Se chegou aqui, nenhuma biblioteca está funcionando
    console.warn('⚠️ Nenhuma biblioteca WhatsApp disponível para enviar status de gravação');
    return res.json({ 
      success: false,
  error: 'Sessão indisponível',
  warning: 'Status de gravação não foi enviado ao WhatsApp'
    });
    
  } catch (error) {
    console.error('Erro ao notificar status de gravação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Notificar status de digitação
router.post('/:id/typing-status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { isTyping } = req.body;
    
    // Buscar o ticket
    const { Ticket, Contact, Session } = await import('../models/index.js');
    const ticket = await Ticket.findByPk(id, {
      include: [
        { model: Contact, as: 'Contact' }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado' });
    }
    
    if (!ticket.sessionId) {
      return res.status(400).json({ error: 'Sessão não encontrada para este ticket' });
    }
    
    const phoneNumber = ticket.Contact?.phoneNumber || ticket.contact;
    const sessionId = ticket.sessionId;
    
    try {
      // Usar o Gerenciador Inteligente para enviar status de digitação
      const intelligentLibraryManager = (await import('../services/intelligentLibraryManager.js')).default;
      const { Session } = await import('../models/index.js');
      
      // Buscar informações da sessão
      const sessionRecord = await Session.findByPk(sessionId);
      if (!sessionRecord) {
        return res.status(400).json({ error: 'Registro de sessão não encontrado' });
      }
      
      console.log(`⌨️ Enviando status de digitação via Gerenciador Inteligente para ${phoneNumber}`);
      
      const presenceStatus = isTyping ? 'composing' : 'available';
      
      // Usar Gerenciador Inteligente primeiro
      try {
        const statusResult = await intelligentLibraryManager.sendPresenceUpdate(
          sessionRecord.whatsappId,
          phoneNumber,
          presenceStatus
        );
        
        console.log(`✅ Status de digitação "${presenceStatus}" enviado via ${statusResult.library} (Gerenciador Inteligente)`);
        return res.json({ success: true, library: statusResult.library });
        
      } catch (intelligentError) {
        console.log('❌ Gerenciador Inteligente falhou para digitação:', intelligentError.message);
        
        // Fallback: tentar com a biblioteca específica da sessão
        if (sessionRecord.library === 'baileys') {
          const baileysService = await import('../services/baileysService.js');
          const baileysClient = baileysService.getBaileysSession(sessionRecord.whatsappId);
          
          if (baileysClient && baileysClient.user) {
            await baileysClient.sendPresenceUpdate(presenceStatus, phoneNumber);
            console.log(`✅ Status de digitação "${presenceStatus}" enviado via Baileys (fallback)`);
            return res.json({ success: true, library: 'baileys' });
          }
        } else if (sessionRecord.library === 'whatsappjs') {
          const wwebjsService = await import('../services/wwebjsService.js');
          const wwebjsClient = wwebjsService.default.getWwebjsSession(sessionRecord.whatsappId);
          
          if (wwebjsClient) {
            // WWebJS tem método próprio para presença
            await wwebjsClient.sendPresenceUpdate?.(presenceStatus);
            console.log(`✅ Status de digitação "${presenceStatus}" enviado via WWebJS (fallback)`);
            return res.json({ success: true, library: 'whatsappjs' });
          }
        }
        
        throw new Error(`Nenhuma biblioteca disponível para sessão ${sessionRecord.whatsappId}`);
      }
      
    } catch (error) {
      console.log('❌ Gerenciador Inteligente falhou para digitação:', error.message);
      
      // Fallback para Baileys direto
      try {
        const baileysService = await import('../services/baileysService.js');
        const { Session } = await import('../models/index.js');
        const sessionRecord = await Session.findByPk(sessionId);
        
        if (sessionRecord) {
          const baileysClient = baileysService.getBaileysSession(sessionRecord.whatsappId);
          if (baileysClient && baileysClient.user) {
            const presenceStatus = isTyping ? 'composing' : 'available';
            await baileysClient.sendPresenceUpdate(presenceStatus, phoneNumber);
            console.log(`✅ Status de digitação "${presenceStatus}" enviado via fallback Baileys`);
            return res.json({ success: true, library: 'baileys' });
          }
        }
      } catch (fallbackError) {
        console.log('❌ Fallback Baileys para digitação também falhou:', fallbackError.message);
      }
    }
  } catch (error) {
    console.error('Erro ao notificar status de digitação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
