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
      // Tentar Baileys como fallback
      const baileysService = await import('../services/baileysService.js');
      const baileysClient = baileysService.getBaileysSession(sessionId);
      
      if (baileysClient && baileysClient.user) {
        console.log(`🎵 Cliente Baileys encontrado para sessão ${sessionId}`);
        console.log(`🎵 Status atual do cliente:`, baileysClient.user?.id);
        
        if (isRecording) {
          // Enviar status "gravando áudio" via Baileys
          console.log(`🎵 Enviando status 'recording' para ${phoneNumber}`);
          await baileysClient.sendPresenceUpdate('recording', phoneNumber);
          console.log(`✅ Status "gravando áudio" enviado via Baileys para ${phoneNumber}`);
        } else {
          // Parar status de gravação
          console.log(`🎵 Enviando status 'available' para ${phoneNumber}`);
          await baileysClient.sendPresenceUpdate('available', phoneNumber);
          console.log(`✅ Status "disponível" enviado via Baileys para ${phoneNumber}`);
        }
        
  return res.json({ success: true, library: 'baileys' });
      } else {
        console.log(`❌ Cliente Baileys não encontrado ou não conectado para sessão ${sessionId}`);
      }
    } catch (baileysError) {
      console.log('❌ Baileys não disponível:', baileysError.message);
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
      // Tentar Baileys
      const baileysService = await import('../services/baileysService.js');
      const baileysClient = baileysService.getBaileysSession(sessionId);
      
      if (baileysClient && baileysClient.user) {
        console.log(`⌨️ Cliente Baileys encontrado para sessão ${sessionId}`);
        
        if (isTyping) {
          // Enviar status "digitando" via Baileys
          console.log(`⌨️ Enviando status 'composing' para ${phoneNumber}`);
          await baileysClient.sendPresenceUpdate('composing', phoneNumber);
          console.log(`✅ Status "digitando" enviado via Baileys para ${phoneNumber}`);
        } else {
          // Parar status de digitação
          console.log(`⌨️ Enviando status 'available' para ${phoneNumber}`);
          await baileysClient.sendPresenceUpdate('available', phoneNumber);
          console.log(`✅ Status "disponível" enviado via Baileys para ${phoneNumber}`);
        }
        
        return res.json({ success: true, library: 'baileys' });
      } else {
        console.log(`❌ Cliente Baileys não encontrado ou não conectado para sessão ${sessionId}`);
      }
    } catch (baileysError) {
      console.log('❌ Baileys não disponível:', baileysError.message);
    }
    
    return res.json({ 
      success: false,
      error: 'Sessão indisponível',
      warning: 'Status de digitação não foi enviado ao WhatsApp'
    });
    
  } catch (error) {
    console.error('Erro ao notificar status de digitação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
