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
const { 
  handleWhatsappJsMessage,
  handleBaileysMessage 
} = await import('./messageCallbacks.js');

// Função para verificar se uma sessão está realmente ativa
const isSessionActuallyActive = async (whatsappId, library) => {
  try {
    console.log(`🔍 Verificando se sessão ${whatsappId} (${library}) está realmente ativa...`);

    if (library === 'whatsappjs') {
      const session = await getWhatsappJsSession(whatsappId);
      const isActive = session && session.info && session.info.wid;

      console.log(`📱 WhatsApp.js - Sessão encontrada: ${!!session}`);
      console.log(`📱 WhatsApp.js - Tem info: ${!!(session && session.info)}`);
      console.log(`📱 WhatsApp.js - Tem wid: ${!!(session && session.info && session.info.wid)}`);
      console.log(`📱 WhatsApp.js - Status final: ${isActive ? 'ATIVA' : 'INATIVA'}`);

      return isActive;
    } else if (library === 'baileys') {
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

    if (session.library === 'whatsappjs') {
      // Criar callback para processamento de mensagens
      const onMessage = async (message) => {
        await handleWhatsappJsMessage(message, session.id);
      };

      // Verificar se já existe uma sessão sendo inicializada
      try {
        const existingSession = getWhatsappJsSession(session.whatsappId);
        if (existingSession) {
          console.log(`⏳ Sessão ${session.whatsappId} já existe na lista, aguardando inicialização`);
          return true;
        }
      } catch (error) {
        // Sessão não existe, pode prosseguir
        console.log(`📝 Sessão ${session.whatsappId} não encontrada na lista, prosseguindo com reativação`);
      }

      // WhatsApp.js: (sessionId, onReady, onMessage)
      await createWhatsappJsSession(session.whatsappId, null, onMessage);
    } else if (session.library === 'baileys') {
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

        // Ser mais conservador: só tentar reativar se for whatsappjs e se não houver sessão na lista
        if (session.library === 'whatsappjs') {
          try {
            // Verificar se existe alguma sessão com esse whatsappId na lista
            const hasAnySession = sessions.some(s => s.sessionId === session.whatsappId || s.id === session.id);
            console.log(`📊 Existe alguma sessão na lista para ${session.whatsappId}: ${hasAnySession}`);

            if (!hasAnySession) {
              console.log(`🔄 Tentando reativar sessão ${session.whatsappId} (nenhuma sessão encontrada na lista)`);
              const reactivated = await reactivateSession(session);

              if (reactivated) {
                reconnectedCount++;
              } else {
                disconnectedCount++;
              }
            } else {
              console.log(`⏳ Mantendo sessão ${session.whatsappId} (há sessão na lista, pode estar inicializando)`);
            }
          } catch (error) {
            console.error(`❌ Erro ao verificar sessão ${session.whatsappId}:`, error.message);
            disconnectedCount++;
          }
        } else {
          console.log(`⏳ Mantendo sessão Baileys ${session.whatsappId} (não reativar automaticamente)`);
        }
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
