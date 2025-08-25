import { Session } from '../models/index.js';
import { 
  createWhatsappJsSession, 
  getWhatsappJsSession,
  listSessions as listWhatsappJsSessions 
} from './whatsappjsService.js';
import { 
  createBaileysSession, 
  getBaileysSession,
  listBaileysSessions 
} from './baileysService.js';
import { emitToAll } from './socket.js';
import { 
  createWhatsappJsMessageCallback,
  createBaileysMessageCallback 
} from './messageCallbacks.js';

// Função para verificar se uma sessão está realmente ativa
const isSessionActuallyActive = (whatsappId, library) => {
  try {
    if (library === 'whatsappjs') {
      const session = getWhatsappJsSession(whatsappId);
      return session && session.info && session.info.wid;
    } else if (library === 'baileys') {
      const session = getBaileysSession(whatsappId);
      return session && session.user;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Função para reativar uma sessão específica
const reactivateSession = async (session) => {
  try {
    console.log(`🔄 Reativando sessão ${session.whatsappId} (${session.library}) com callbacks de mídia...`);
    
    if (session.library === 'whatsappjs') {
      // Criar callback para processamento de mensagens
      const onMessage = createWhatsappJsMessageCallback(session);
      // WhatsApp.js: (sessionId, onReady, onMessage)
      await createWhatsappJsSession(session.whatsappId, null, onMessage);
    } else if (session.library === 'baileys') {
      // Criar callback para processamento de mensagens
      const onMessage = createBaileysMessageCallback(session);
      // Baileys: (sessionId, onQR, onReady, onMessage)
      await createBaileysSession(session.whatsappId, null, null, onMessage);
    }
    
    console.log(`✅ Sessão ${session.whatsappId} reativada com sucesso com callbacks de mensagens e mídia`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao reativar sessão ${session.whatsappId}:`, error.message);
    
    // Atualizar status no banco para disconnected
    await session.update({ status: 'disconnected' });
    
    return false;
  }
};

// Função para sincronizar status de todas as sessões
export const syncAllSessions = async () => {
  try {
    console.log('🔄 Sincronizando status de todas as sessões...');
    
    const sessions = await Session.findAll();
    let reconnectedCount = 0;
    let disconnectedCount = 0;
    
    for (const session of sessions) {
      const isActive = isSessionActuallyActive(session.whatsappId, session.library);
      
      if (session.status === 'connected' && !isActive) {
        console.log(`⚠️ Sessão ${session.whatsappId} está marcada como conectada mas não está ativa`);
        
        // Tentar reativar
        const reactivated = await reactivateSession(session);
        
        if (reactivated) {
          reconnectedCount++;
        } else {
          disconnectedCount++;
        }
      } else if (session.status === 'connected' && isActive) {
        console.log(`✅ Sessão ${session.whatsappId} está ativa e conectada`);
      } else if (session.status === 'disconnected') {
        console.log(`🔌 Sessão ${session.whatsappId} está desconectada (normal)`);
      }
    }
    
    console.log(`📊 Sincronização concluída:`);
    console.log(`   - ${reconnectedCount} sessões reconectadas`);
    console.log(`   - ${disconnectedCount} sessões desconectadas`);
    
    // Emitir atualização via WebSocket
    emitSessionsUpdate();
    
  } catch (error) {
    console.error('❌ Erro ao sincronizar sessões:', error);
  }
};

// Função para emitir atualizações de sessões
const emitSessionsUpdate = async () => {
  try {
    const sessions = await Session.findAll({
      order: [['createdAt', 'DESC']]
    });

    const sessionsWithStatus = sessions.map(session => ({
      ...session.toJSON(),
      currentStatus: session.status
    }));

    console.log('🔄 Emitindo atualização de sessões via WebSocket após sincronização');
    emitToAll('sessions-update', sessionsWithStatus);
  } catch (error) {
    console.error('❌ Erro ao emitir atualização de sessões:', error);
  }
};

// Função para verificar sessões periodicamente (a cada 5 minutos)
export const startSessionHealthCheck = () => {
  console.log('🏥 Iniciando verificação de saúde das sessões (a cada 5 minutos)...');
  
  setInterval(async () => {
    console.log('🏥 Executando verificação de saúde das sessões...');
    await syncAllSessions();
  }, 5 * 60 * 1000); // 5 minutos
};

// Função para reconectar automaticamente sessões ao iniciar
export const autoReconnectSessions = async () => {
  try {
    console.log('🚀 Iniciando reconexão automática de sessões...');
    
    const sessions = await Session.findAll({
      where: { status: 'connected' }
    });
    
    if (sessions.length === 0) {
      console.log('📱 Nenhuma sessão para reconectar');
      return;
    }
    
    console.log(`📱 Encontradas ${sessions.length} sessões para reconectar`);
    
    for (const session of sessions) {
      console.log(`🔄 Tentando reconectar sessão ${session.whatsappId}...`);
      
      // Aguardar um pouco entre tentativas para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await reactivateSession(session);
    }
    
    console.log('✅ Reconexão automática concluída');
    
  } catch (error) {
    console.error('❌ Erro na reconexão automática:', error);
  }
};
