import { TicketMessage, Ticket, Session } from '../models/index.js';
import { sendMedia as sendMediaBaileys } from '../services/baileysService.js';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

export const sendFileMessage = async (req, res) => {
  const { ticketId } = req.params;
  const { content, sender, messageType, isVoiceNote, audioDuration } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado.' });
  
  try {
    console.log(`📁 Enviando arquivo para ticket ${ticketId}`, {
      sender,
      messageType,
      isVoiceNote,
      audioDuration,
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
    
    // Validações específicas para áudio PTT
    if (req.file.mimetype && req.file.mimetype.startsWith('audio/')) {
      console.log('🎵 Processando arquivo de áudio:', {
        mimetype: req.file.mimetype,
        size: req.file.size,
        isVoiceNote: isVoiceNote,
        duration: audioDuration
      });
      
      // Validar tamanho mínimo do arquivo de áudio
      if (req.file.size < 1000) {
        console.error('❌ Arquivo de áudio muito pequeno:', req.file.size, 'bytes');
        return res.status(400).json({ error: 'Arquivo de áudio muito pequeno (mínimo 1KB)' });
      }
      
      // Validar duração se fornecida
      if (audioDuration && (parseFloat(audioDuration) < 1 || parseFloat(audioDuration) > 300)) {
        console.error('❌ Duração do áudio inválida:', audioDuration);
        return res.status(400).json({ error: 'Duração do áudio inválida (1-300 segundos)' });
      }
      
      console.log('✅ Arquivo de áudio validado com sucesso');
    }
    
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      console.log(`❌ Ticket ${ticketId} não encontrado`);
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    
    // Criar dados da mensagem
    const messageData = {
      ticketId,
      sender,
      content: content || '',
      timestamp: new Date(),
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype
    };
    
    // Adicionar metadados específicos para áudio/voz
    if (messageType === 'audio' || isVoiceNote === 'true') {
      messageData.messageType = 'audio';
      if (audioDuration) {
        messageData.audioDuration = parseFloat(audioDuration);
      }
    }
    
    const msg = await TicketMessage.create(messageData);
    
    console.log(`✅ Mensagem com arquivo criada - ID: ${msg.id}`, {
      type: messageData.messageType || 'file',
      isVoice: isVoiceNote === 'true'
    });
    
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
          
          if (session.library === 'baileys') {
            try {
              console.log(`📤 Enviando arquivo via Baileys para ${ticket.contact}`);
              const fileBuffer = fs.readFileSync(filePath);
              
              // Preparar opções para áudio
              const mediaOptions = {};
              
              // Se for áudio e tiver informações específicas
              if (req.file.mimetype.startsWith('audio/')) {
                mediaOptions.isVoiceNote = isVoiceNote === 'true';
                
                if (audioDuration) {
                  mediaOptions.duration = audioDuration;
                  console.log(`🎵 Enviando áudio com duração: ${audioDuration}s`);
                }
                
                console.log(`🎵 Enviando como ${mediaOptions.isVoiceNote ? 'nota de voz (PTT)' : 'arquivo de áudio'}`);
              }
              
              // Usar session.whatsappId em vez de ticket.sessionId
              await sendMediaBaileys(
                session.whatsappId, 
                ticket.contact, 
                fileBuffer, 
                req.file.mimetype, 
                content || '', // caption
                mediaOptions
              );
              
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
