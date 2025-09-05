import { Session } from '../models/index.js';
import { 
  createBaileysSession, 
  getBaileysSession,
  listBaileysSessions 
} from './baileysService.js';
import { emitToAll } from './socket.js';
const { 
  handleBaileysMessage 
} = await import('./messageCallbacks.js');

// Função para verificar se uma sessão está realmente ativa
const isSessionActuallyActive = async (whatsappId, library) => {
  try {
    console.log(`🔍 Verificando se sessão ${whatsappId} (${library}) está realmente ativa...`);

  if (library === 'baileys') {
      const session = getBaileysSession(whatsappId);
      const isActive = session && session.user;

      console.log(`📱 Baileys - Sessão encontrada: ${!!session}`);
      console.log(`📱 Baileys - Tem user: ${!!(session && session.user)}`);
      console.log(`📱 Baileys - Status final: ${isActive ? 'ATIVA' : 'INATIVA'}`);

      return isActive;
    }

    console.log(`❌ Biblioteca não reconhecida: ${library}`);
    return false;
  } catch (error) {
    console.error(`❌ Erro ao verificar sessão ${whatsappId}:`, error.message);
    return false;
  }
};

// Função para reativar uma sessão específica
const reactivateSession = async (session) => {
  try {
    console.log(`🔄 Reativando sessão ${session.whatsappId} (${session.library}) com callbacks de mídia...`);

    // Verificar se já existe uma sessão ativa antes de tentar reativar
    const isAlreadyActive = await isSessionActuallyActive(session.whatsappId, session.library);
    if (isAlreadyActive) {
      console.log(`✅ Sessão ${session.whatsappId} já está ativa, não precisa reativar`);
      return true;
    }

  if (session.library === 'baileys') {
      // Criar callback para processamento de mensagens
      const onMessage = async (message) => {
        await handleBaileysMessage(message, session.id);
      };
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
      console.log(`🔍 Verificando sessão ${session.whatsappId} (${session.library}) - Status atual: ${session.status}`);

      const isActive = await isSessionActuallyActive(session.whatsappId, session.library);

      if (session.status === 'connected' && !isActive) {
        console.log(`⚠️ Sessão ${session.whatsappId} está marcada como conectada mas não está ativa`);

  console.log(`⏳ Mantendo sessão Baileys ${session.whatsappId} (não reativar automaticamente)`);
      } else if (session.status === 'connected' && isActive) {
        console.log(`✅ Sessão ${session.whatsappId} está ativa e conectada`);
      } else if (session.status === 'disconnected') {
        console.log(`🔌 Sessão ${session.whatsappId} está desconectada (normal)`);
      } else {
        console.log(`📋 Sessão ${session.whatsappId} tem status: ${session.status}`);
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

    console.log(`📱 Encontradas ${sessions.length} sessões marcadas como conectadas`);

    for (const session of sessions) {
      console.log(`� Verificando se sessão ${session.whatsappId} realmente precisa de reconexão...`);

      // Verificar se a sessão já está ativa antes de tentar reconectar
      const isAlreadyActive = await isSessionActuallyActive(session.whatsappId, session.library);

      if (isAlreadyActive) {
        console.log(`✅ Sessão ${session.whatsappId} já está ativa, pulando reconexão`);
        continue;
      }

      console.log(`🔄 Sessão ${session.whatsappId} não está ativa, tentando reconectar...`);

      // Aguardar um pouco entre tentativas para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 2000));

      await reactivateSession(session);
    }

    console.log('✅ Reconexão automática concluída');

  } catch (error) {
    console.error('❌ Erro na reconexão automática:', error);
  }
};
