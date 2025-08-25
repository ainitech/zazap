import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { moveTicket, listTickets, acceptTicket, resolveTicket, closeTicket, updateTicket, deleteTicket, restoreTicket, permanentDeleteTicket } from '../controllers/ticketController.js';
import { transferTicket } from '../controllers/queueController.js';
import { updateTicketPriority } from '../controllers/ticketController.js';
const router = express.Router();

// Listar tickets com filtros e busca avançada
router.get('/', authenticateToken, listTickets);

// Aceitar ticket
router.put('/:ticketId/accept', authenticateToken, acceptTicket);

// Resolver ticket
router.put('/:ticketId/resolve', authenticateToken, resolveTicket);

// Fechar ticket
router.put('/:ticketId/close', authenticateToken, closeTicket);

// Mover ticket para outra fila
router.post('/move', authenticateToken, moveTicket);

// Transferir ticket para outra fila (ou agente)
router.post('/:ticketId/transfer', authenticateToken, transferTicket);

// Atualizar ticket (campos permitidos)
router.put('/:ticketId', authenticateToken, updateTicket);

// Deletar (soft-delete) ticket
router.delete('/:ticketId', authenticateToken, deleteTicket);

// Deletar ticket permanentemente (remove tudo sobre o contato)
router.delete('/:ticketId/permanent', authenticateToken, permanentDeleteTicket);

// Restaurar ticket da lixeira
router.post('/:ticketId/restore', authenticateToken, restoreTicket);

// Atualizar prioridade do ticket
router.put('/:ticketId/priority', authenticateToken, updateTicketPriority);

// Notificar status de gravação de áudio
router.post('/:id/recording-status', authenticateToken, async (req, res) => {
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
      // Tentar WhatsApp.js primeiro
      const whatsappService = await import('../services/whatsappjsService.js');
      const whatsappClient = whatsappService.getWhatsappJsSession(sessionId);
      
      if (whatsappClient && whatsappClient.info && whatsappClient.info.wid) {
        if (isRecording) {
          // Enviar status "gravando áudio"
          await whatsappClient.sendPresenceUpdate('recording', phoneNumber);
          console.log(`✅ Status "gravando áudio" enviado via WhatsApp.js para ${phoneNumber}`);
        } else {
          // Parar status de gravação
          await whatsappClient.sendPresenceUpdate('available', phoneNumber);
          console.log(`✅ Status "disponível" enviado via WhatsApp.js para ${phoneNumber}`);
        }
        
        return res.json({ success: true, library: 'whatsappjs' });
      }
    } catch (whatsappError) {
      console.log('WhatsApp.js não disponível, tentando Baileys:', whatsappError.message);
    }
    
    try {
      // Tentar Baileys como fallback
      const baileysService = await import('../services/baileysService.js');
      const baileysClient = baileysService.getBaileysSession(sessionId);
      
      if (baileysClient && baileysClient.user) {
        if (isRecording) {
          // Enviar status "gravando áudio" via Baileys
          await baileysClient.sendPresenceUpdate('recording', phoneNumber);
          console.log(`✅ Status "gravando áudio" enviado via Baileys para ${phoneNumber}`);
        } else {
          // Parar status de gravação
          await baileysClient.sendPresenceUpdate('available', phoneNumber);
          console.log(`✅ Status "disponível" enviado via Baileys para ${phoneNumber}`);
        }
        
        return res.json({ success: true, library: 'baileys' });
      }
    } catch (baileysError) {
      console.log('Baileys não disponível:', baileysError.message);
    }
    
    // Se chegou aqui, nenhuma biblioteca está funcionando
    console.warn('⚠️ Nenhuma biblioteca WhatsApp disponível para enviar status de gravação');
    return res.json({ 
      success: false,
      error: 'Nenhuma biblioteca WhatsApp disponível',
      warning: 'Status de gravação não foi enviado ao WhatsApp'
    });
    
  } catch (error) {
    console.error('Erro ao notificar status de gravação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
