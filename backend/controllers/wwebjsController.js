import wwebjsService from '../services/wwebjsService.js';
import { Session } from '../models/index.js';
import { emitToAll } from '../services/socket.js';
import { handleWwebjsMessage } from '../services/messageCallbacks.js';

export const initSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    console.log(`🚀 Iniciando sessão WWebJS: ${sessionId}`);
    
    // Limpar qualquer sessão órfã antes de iniciar
    await wwebjsService.cleanupWwebjsSession(sessionId);
    
    let lastQR = null;
    let initializationComplete = false;
    
    try {
      await wwebjsService.createWwebjsSession(sessionId, {
        onQR: (qr) => { 
          lastQR = qr; 
          console.log(`📱 QR gerado para sessão WWebJS ${sessionId}`);
        },
        onReady: async (client) => {
          try {
            console.log(`✅ WWebJS session ${sessionId} ready - processando callback`);
            console.log(`🔍 Procurando sessão no banco: whatsappId=${sessionId}, userId=${req.user.id}`);
            // Encontrar a sessão no banco por whatsappId e userId
            const session = await Session.findOne({ where: { whatsappId: sessionId, userId: req.user.id } });
            console.log(`🔍 Sessão encontrada no banco:`, session ? `ID=${session.id}` : 'NÃO ENCONTRADA');
            if (session) {
              let real = null;
              try { 
                real = client?.info?.wid?._serialized?.split('@')[0] || null; 
                console.log(`📱 Número real detectado: ${real}`);
              } catch (e) {
                console.warn('Erro ao extrair número real:', e?.message);
              }
              
              await session.update({ status: 'connected', realNumber: real || session.realNumber });
              console.log(`✅ Sessão ${sessionId} atualizada no banco - status: connected`);
              
              // Emit whatsappSession event like the reference implementation
              console.log(`🚀 Emitindo evento whatsappSession para sessão ${sessionId}...`);
              emitToAll('whatsappSession', {
                action: 'update',
                session: {
                  id: session.id,
                  whatsappId: session.whatsappId,
                  name: session.name,
                  status: 'connected',
                  realNumber: real,
                  library: session.library
                }
              });
              
              // Also emit the session-status-update for frontend modal auto-close
              console.log(`🚀 Emitindo evento session-status-update para sessão ${sessionId}...`);
              emitToAll('session-status-update', { sessionId: session.id, status: 'connected' });
              console.log(`✅ Eventos emitidos para sessão ${sessionId}`);
            } else {
              // Emite um fallback sem id do banco
              console.log(`⚠️ Sessão ${sessionId} não encontrada no banco - emitindo evento fallback`);
              emitToAll('wwebjs-status-update', { whatsappId: sessionId, status: 'connected' });
            }
          } catch (e) {
            console.error('wwebjs onReady post-update error:', e);
          }
        },
        onMessage: async (msg) => {
          try {
            // Processar mensagens recebidas do whatsapp-web.js
            console.log(`📨 Nova mensagem WWebJS recebida para ${sessionId}:`, msg.body?.substring(0, 50));
            await handleWwebjsMessage(msg, sessionId);
          } catch (e) {
            console.error('wwebjs onMessage error:', e?.message);
          }
        }
      });
      
      initializationComplete = true;
      console.log(`✅ Inicialização da sessão ${sessionId} concluída`);
      
    } catch (initError) {
      console.error(`❌ Erro na inicialização da sessão ${sessionId}:`, initError?.message);
      
      // Emitir evento de erro para o frontend
      const session = await Session.findOne({ where: { whatsappId: sessionId, userId: req.user.id } });
      if (session) {
        emitToAll('whatsappSession', {
          action: 'update',
          session: {
            id: session.id,
            whatsappId: session.whatsappId,
            name: session.name,
            status: 'error',
            library: session.library
          }
        });
      }
      
      throw initError;
    }

    return res.json({ 
      ok: true, 
      sessionId, 
      qr: lastQR,
      initialized: initializationComplete
    });
  } catch (e) {
    console.error('initSession (wwebjs) error:', e);
    return res.status(500).json({ 
      error: e.message,
      details: 'Falha na inicialização da sessão WhatsApp-web.js'
    });
  }
};export const sendTextMessage = async (req, res) => {
  try {
    const { sessionId, to, text } = req.body;
    if (!sessionId || !to || !text) return res.status(400).json({ error: 'sessionId, to, text are required' });
    const result = await wwebjsService.sendText(sessionId, to, text);
    return res.json({ ok: true, result });
  } catch (e) {
    console.error('sendText (wwebjs) error:', e);
    return res.status(500).json({ error: e.message });
  }
};

export const sendMediaMessage = async (req, res) => {
  try {
    const { sessionId, to, base64, mimetype, filename } = req.body;
    if (!sessionId || !to || !base64 || !mimetype) {
      return res.status(400).json({ error: 'sessionId, to, base64, mimetype are required' });
    }
    const result = await wwebjsService.sendMedia(sessionId, to, { base64, mimetype, filename });
    return res.json({ ok: true, result });
  } catch (e) {
    console.error('sendMedia (wwebjs) error:', e);
    return res.status(500).json({ error: e.message });
  }
};

export default { initSession, sendTextMessage, sendMediaMessage };
