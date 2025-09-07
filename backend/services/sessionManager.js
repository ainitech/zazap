import { Session } from '../models/index.js';
import { 
  createBaileysSession, 
  getBaileysSession,
  listBaileysSessions 
} from './baileysService.js';
import { emitToAll } from './socket.js';
import { 
  handleBaileysMessage 
} from './messageCallbacks.js';

// Função para normalizar sessionId (remover device ID) com proteção
const normalizeSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== 'string') return '';
  return sessionId.split(':')[0];
};

// Função para encontrar sessão no banco usando base normalizada
const findSessionByBaseNumber = async (whatsappId) => {
  const baseNumber = normalizeSessionId(whatsappId);
  
  // Primeiro tentar busca exata
  let session = await Session.findOne({ where: { whatsappId } });
  
  if (!session) {
    // Se não encontrar, buscar por base number
    const allSessions = await Session.findAll();
    session = allSessions.find(s => normalizeSessionId(s.whatsappId) === baseNumber);
    
    if (session) {
      console.log(`🔄 Sessão encontrada por base number: ${session.whatsappId} para busca ${whatsappId}`);
    }
  }
  
  return session;
};

// Função para verificar se uma sessão está realmente ativa
const isSessionActuallyActive = async (whatsappId, library) => {
  try {
    // Sempre usar o número base para verificações
    const baseNumber = normalizeSessionId(whatsappId);
    console.log(`🔍 Verificando se sessão ${baseNumber} (${library}) está realmente ativa...`);

    if (library === 'baileys') {
      // Primeiro tentar encontrar pela ID exata
      let session = getBaileysSession(baseNumber);
      let isActive = session && session.user;

      if (isActive) {
        console.log(`✅ Sessão encontrada pela ID base: ${baseNumber}`);
        console.log(`📱 Baileys - Sessão encontrada: ${!!session}`);
        console.log(`📱 Baileys - Tem user: ${!!(session && session.user)}`);
        console.log(`📱 Baileys - Status final: ATIVA`);
        return true;
      }

      // Se não encontrou pela ID base, tentar pelo ID completo (com device ID)
      console.log(`🔄 Tentando encontrar sessão pelo ID completo: ${whatsappId}`);
      session = getBaileysSession(whatsappId);
      isActive = session && session.user;

      if (isActive) {
        console.log(`✅ Sessão encontrada pelo ID completo: ${whatsappId}`);
        return true;
      }

      // Verificar todas as sessões ativas para encontrar uma com o mesmo base number
      const activeSessions = listBaileysSessions(); // array de strings (sessionIds)
      console.log(`📋 Sessões ativas no Baileys: ${activeSessions.join(', ') || 'nenhuma'}`);

      // Procurar por uma sessão ativa com o mesmo número base
      const matchingSessionId = activeSessions.find(id => normalizeSessionId(id) === baseNumber);

      if (matchingSessionId) {
        console.log(`🔄 Sessão encontrada por base number: ${matchingSessionId} para busca ${baseNumber}`);

        // Atualizar o whatsappId no banco de dados para o ID correto
        try {
          const dbSession = await findSessionByBaseNumber(whatsappId);
          if (dbSession && dbSession.whatsappId !== matchingSessionId) {
            console.log(`📝 Atualizando whatsappId no banco: ${dbSession.whatsappId} → ${matchingSessionId}`);
            await dbSession.update({ whatsappId: matchingSessionId });
          }
        } catch (updateError) {
          console.error(`❌ Erro ao atualizar whatsappId no banco:`, updateError.message);
        }

        return true;
      }

      console.log(`❌ Nenhuma sessão ativa encontrada para ${baseNumber}`);
      return false;
    }

    console.log(`❌ Biblioteca não reconhecida: ${library}`);
    return false;
  } catch (error) {
    console.error(`❌ Erro ao verificar sessão ${whatsappId}:`, error.message);
    return false;
  }
};// Função para reativar uma sessão específica
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
        console.log(`📨 [SESSION MANAGER] Callback onMessage chamado para sessão ${session.id}`);
        console.log(`📨 [SESSION MANAGER] Verificando se handleBaileysMessage existe:`, typeof handleBaileysMessage);
        try {
          if (typeof handleBaileysMessage === 'function') {
            console.log(`📨 [SESSION MANAGER] Chamando handleBaileysMessage...`);
            await handleBaileysMessage(message, session.id);
            console.log(`📨 [SESSION MANAGER] handleBaileysMessage concluído`);
          } else {
            console.error(`❌ [SESSION MANAGER] handleBaileysMessage não é uma função:`, handleBaileysMessage);
          }
        } catch (error) {
          console.error(`❌ [SESSION MANAGER] Erro no handleBaileysMessage:`, error);
        }
      };
      // Baileys: (sessionId, onQR, onReady, onMessage)
  await createBaileysSession(normalizeSessionId(session.whatsappId), null, null, onMessage);
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

    // Primeiro, obter todas as sessões ativas do Baileys
  const activeBaileysSessions = listBaileysSessions().filter(id => !!id); // array de strings válidas
  console.log(`📋 Sessões ativas no Baileys: ${activeBaileysSessions.join(', ') || 'nenhuma'}`);

    for (const session of sessions) {
      // Sempre usar o número base para verificações
      const baseNumber = normalizeSessionId(session.whatsappId);
      console.log(`🔍 Verificando sessão ${baseNumber} (${session.library}) - Status atual: ${session.status}`);

      const isActive = await isSessionActuallyActive(session.whatsappId, session.library);

      // Verificar se existe uma sessão ativa com o mesmo base number
      if (!isActive && session.library === 'baileys') {
  const activeSessionWithSameBase = activeBaileysSessions.find(id => id && normalizeSessionId(id) === baseNumber);

        if (activeSessionWithSameBase) {
          console.log(`🔄 Encontrada sessão ativa com mesmo base number: ${activeSessionWithSameBase} para ${baseNumber}`);

          // Atualizar o whatsappId na sessão do banco de dados para usar apenas o número base
          await session.update({
            whatsappId: baseNumber, // Sempre usar apenas o número base
            status: 'connected'
          });

          console.log(`✅ Sessão ${session.whatsappId} atualizada para ${baseNumber}`);
          reconnectedCount++;
          continue;
        }
      }

      if (session.status === 'connected' && !isActive) {
        console.log(`⚠️ Sessão ${baseNumber} está marcada como conectada mas não está ativa`);
        console.log(`⏳ Mantendo sessão Baileys ${baseNumber} (não reativar automaticamente)`);
      } else if (session.status === 'connected' && isActive) {
        console.log(`✅ Sessão ${baseNumber} está ativa e conectada`);
      } else if (session.status === 'disconnected') {
        console.log(`🔌 Sessão ${baseNumber} está desconectada (normal)`);
      } else {
        console.log(`📋 Sessão ${baseNumber} tem status: ${session.status}`);
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

  // Buscar todas as sessões e filtrar em memória (case-insensitive)
  const all = await Session.findAll();
  const sessions = all.filter(s => String(s.status || '').toLowerCase() === 'connected');

  if (sessions.length === 0) {
      console.log('📱 Nenhuma sessão para reconectar');
      return;
    }

    console.log(`📱 Encontradas ${sessions.length} sessões marcadas como conectadas`);

    for (const session of sessions) {
      // Sempre normalizar o ID para evitar problemas com device IDs
      const baseNumber = normalizeSessionId(session.whatsappId);
      console.log(`🔍 Verificando se sessão ${baseNumber} realmente precisa de reconexão...`);

      // Verificar se a sessão já está ativa antes de tentar reconectar
      const isAlreadyActive = await isSessionActuallyActive(session.whatsappId, session.library);

      if (isAlreadyActive) {
        console.log(`✅ Sessão ${baseNumber} já está ativa, pulando reconexão`);
        continue;
      }

      console.log(`🔄 Sessão ${baseNumber} não está ativa, tentando reconectar...`);

      // Aguardar um pouco entre tentativas para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 2000));

      await reactivateSession(session);
    }

    console.log('✅ Reconexão automática concluída');

  } catch (error) {
    console.error('❌ Erro na reconexão automática:', error);
  }
};
