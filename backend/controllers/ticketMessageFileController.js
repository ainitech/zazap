import { TicketMessage, Ticket, Session } from '../models/index.js';
import { sendMedia as sendMediaWhatsappJs } from '../services/whatsappjsService.js';
import { sendMedia as sendMediaBaileys } from '../services/baileysService.js';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

export const sendFileMessage = async (req, res) => {
  const { ticketId } = req.params;
  const { content, sender } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado.' });
  
  try {
    console.log(`📁 Enviando arquivo para ticket ${ticketId} - sender: ${sender}`);
    
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      console.log(`❌ Ticket ${ticketId} não encontrado`);
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    const msg = await TicketMessage.create({
      ticketId,
      sender,
      content: content || '',
      timestamp: new Date(),
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype
    });
    
    console.log(`✅ Mensagem com arquivo criada - ID: ${msg.id}`);
    
    // Enviar arquivo via WhatsApp se sender for 'user'
    if (sender === 'user') {
      console.log(`📱 Enviando arquivo via WhatsApp para ${ticket.contact} na sessão ${ticket.sessionId}`);
      
      // Buscar informações da sessão para saber qual biblioteca usar
      const session = await Session.findByPk(ticket.sessionId);
      if (!session) {
        console.error(`❌ Sessão ${ticket.sessionId} não encontrada no banco de dados`);
      } else {
        console.log(`🔍 Sessão encontrada: ${session.library} (${session.whatsappId}) - Status: ${session.status}`);
        
        // Verificar apenas o status do banco de dados
        if (session.status !== 'connected') {
          console.error(`❌ Sessão ${ticket.sessionId} não está conectada no banco (status: ${session.status})`);
        } else {
          console.log(`✅ Sessão está conectada no banco, enviando arquivo...`);
          
          let fileSent = false;
          const filePath = path.join(uploadDir, req.file.filename);
          
          if (session.library === 'whatsapp-web.js' || session.library === 'whatsappjs') {
            try {
              console.log(`📤 Enviando arquivo via WhatsApp-Web.js para ${ticket.contact}`);
              const fileBuffer = fs.readFileSync(filePath);
              const base64Data = fileBuffer.toString('base64');
              // Usar session.whatsappId em vez de ticket.sessionId
              await sendMediaWhatsappJs(session.whatsappId, ticket.contact, base64Data, req.file.originalname, req.file.mimetype);
              console.log(`✅ Arquivo enviado via WhatsApp-Web.js`);
              fileSent = true;
            } catch (whatsappJsError) {
              console.error(`❌ Erro no WhatsApp-Web.js:`, whatsappJsError.message);
            }
          } else if (session.library === 'baileys') {
            try {
              console.log(`📤 Enviando arquivo via Baileys para ${ticket.contact}`);
              const fileBuffer = fs.readFileSync(filePath);
              // Usar session.whatsappId em vez de ticket.sessionId
              await sendMediaBaileys(session.whatsappId, ticket.contact, fileBuffer, req.file.mimetype);
              console.log(`✅ Arquivo enviado via Baileys`);
              fileSent = true;
            } catch (baileysError) {
              console.error(`❌ Erro no Baileys:`, baileysError.message);
            }
          } else {
            console.error(`❌ Biblioteca desconhecida: ${session.library}`);
          }
          
          if (!fileSent) {
            console.error(`❌ Falha ao enviar arquivo via ${session.library}`);
          }
        }
      }
    }
    
    res.json(msg);
  } catch (err) {
    console.error(`❌ Erro ao enviar arquivo para ticket ${ticketId}:`, err);
    res.status(500).json({ error: err.message });
  }
};
