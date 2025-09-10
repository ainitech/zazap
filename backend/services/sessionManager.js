import { Session } from '../models/index.js';
import { 
  createBaileysSession, 
  getBaileysSession,
  listBaileysSessions 
} from './baileysService.js';
import wwebjsService from './wwebjsService.js';
import intelligentLibraryManager from './intelligentLibraryManager.js';
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

      console.log(`❌ Nenhuma sessão Baileys ativa encontrada para ${baseNumber}`);
      return false;
  } else if (library === 'wwebjs' || library === 'whatsappjs') {
      // Verificar sessão WWebJS de forma robusta (state CONNECTED)
      const client = wwebjsService.getWwebjsSession(baseNumber);
      let active = false;
      try {
        active = client ? ((await client.getState()) === 'CONNECTED') : false;
      } catch {
        active = false;
      }

      console.log(`📱 WWebJS - Sessão encontrada: ${!!client}`);
      console.log(`📱 WWebJS - Status final: ${active ? 'ATIVA' : 'INATIVA'}`);
      
      return active;
    } else {
      console.log(`❌ Biblioteca não reconhecida: ${library}`);
      return false;
    }
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
    } else if (session.library === 'wwebjs' || session.library === 'whatsappjs') {
      // WWebJS: Criar sessão WWebJS (ESM)
      const { createWwebjsSession } = await import('./wwebjsService.js');
      await createWwebjsSession(normalizeSessionId(session.whatsappId));
    } else {
      console.log(`❌ Biblioteca não reconhecida para reativação: ${session.library}`);
      return false;
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

    // Usar o gerenciador inteligente para obter informações do sistema
    const systemInfo = await intelligentLibraryManager.getSystemInfo();
    console.log(`🧠 Sistema Inteligente - Sessões ativas:`, systemInfo.activeInMemory);

    for (const session of sessions) {
      // Sempre usar o número base para verificações
      const baseNumber = normalizeSessionId(session.whatsappId);
      console.log(`🔍 Verificando sessão ${baseNumber} (${session.library}) - Status atual: ${session.status}`);

      const isActive = await isSessionActuallyActive(session.whatsappId, session.library);

      // Usar o gerenciador inteligente para verificar o status da sessão
      let sessionStatus = { active: isActive, status: isActive ? 'connected' : 'disconnected', library: session.library };
      try {
        // Derivar status pela existência do cliente
        if (session.library === 'baileys') {
          const sock = getBaileysSession(baseNumber);
          sessionStatus = { active: !!(sock && sock.user), status: sock && sock.user ? 'connected' : 'disconnected', library: 'baileys' };
        } else if (session.library === 'wwebjs' || session.library === 'whatsappjs') {
          const client = wwebjsService.getWwebjsSession(baseNumber);
          let active = false;
          try { active = client ? ((await client.getState()) === 'CONNECTED') : false; } catch { active = false; }
          sessionStatus = { active, status: active ? 'connected' : 'disconnected', library: 'whatsappjs' };
        }
      } catch (e) {
        console.warn('⚠️ Falha ao obter status unificado:', e.message);
      }
      const isActiveUnified = sessionStatus.active;
      
      console.log(`📡 Status detectado: ${sessionStatus.status} (biblioteca: ${sessionStatus.library || 'desconhecida'})`);

      if (isActiveUnified && session.status !== 'connected') {
        // Sessão está ativa mas o banco mostra como desconectada - atualizar
        await session.update({ 
          status: 'connected',
          library: sessionStatus.library // Atualizar biblioteca se necessário
        });
        console.log(`✅ Sessão ${baseNumber} reconectada (${sessionStatus.library})`);
        reconnectedCount++;
        
      } else if (!isActiveUnified && session.status === 'connected') {
        // Sessão mostra como conectada mas não está ativa - desconectar
        await session.update({ status: 'disconnected' });
        console.log(`❌ Sessão ${baseNumber} desconectada`);
        disconnectedCount++;
        
      } else if (!isActiveUnified && sessionStatus.library && session.status === 'disconnected') {
        // Sessão existe mas não está ativa - tentar reconectar se possível
  console.log(`🔄 Tentando reconectar sessão ${baseNumber} (${sessionStatus.library})`);
  const reconnectedResult = await intelligentLibraryManager.reconnectSession(baseNumber);
  const reconnected = !!reconnectedResult?.success;
        if (reconnected) {
          await session.update({ 
            status: 'connected',
            library: sessionStatus.library 
          });
          console.log(`✅ Sessão ${baseNumber} reconectada automaticamente`);
          reconnectedCount++;
        }
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
    // Buscar todas as sessões
    const all = await Session.findAll();
    // Incluir conectadas ou que tenham importAllChats (porque o usuário espera fluxo de import)
    const target = all.filter(s => {
      const st = String(s.status || '').toLowerCase();
      return st === 'connected' || st === 'connecting' || (s.importAllChats && (st === 'disconnected' || !st));
    });

    if (!target.length) {
      console.log('📱 Nenhuma sessão elegível para reconectar');
      return;
    }

    console.log(`📱 Sessões alvo para reconexão inicial: ${target.length}`);

    // Primeira passada
    for (const session of target) {
      const baseNumber = normalizeSessionId(session.whatsappId);
      console.log(`🔍 (Passo 1) Checando sessão ${baseNumber}`);
      const active = await isSessionActuallyActive(session.whatsappId, session.library);
      if (active) {
        console.log(`✅ (Passo 1) Sessão ${baseNumber} já ativa`);
        continue;
      }
      console.log(`🔄 (Passo 1) Reativando sessão ${baseNumber}`);
      await reactivateSession(session);
      await new Promise(r => setTimeout(r, 1200));
    }

    console.log('⏳ Aguardando 5s para segunda verificação de sessões que ainda não responderam...');
    await new Promise(r => setTimeout(r, 5000));

    // Segunda tentativa para qualquer sessão marcada como connected/importAllChats ainda não ativa
    for (const session of target) {
      const baseNumber = normalizeSessionId(session.whatsappId);
      const active = await isSessionActuallyActive(session.whatsappId, session.library);
      if (active) continue;
      console.log(`♻️ (Passo 2) Segunda tentativa de reativação para sessão ${baseNumber}`);
      await reactivateSession(session);
      await new Promise(r => setTimeout(r, 1500));
    }

    // Loop adicional (até 5 ciclos) a cada 5 segundos para sessões que ainda não ativaram
    const MAX_EXTRA_CYCLES = 5; // total ~25s adicionais
    for (let cycle = 1; cycle <= MAX_EXTRA_CYCLES; cycle++) {
      // Verificar se ainda restam sessões inativas
      const remaining = [];
      for (const session of target) {
        const active = await isSessionActuallyActive(session.whatsappId, session.library);
        if (!active) remaining.push(session);
      }
      if (!remaining.length) {
        console.log('✅ Todas as sessões alvo já estão ativas antes de esgotar ciclos extras');
        break;
      }
      console.log(`⏱️ Ciclo extra ${cycle}/${MAX_EXTRA_CYCLES} (5s) — ${remaining.length} sessão(ões) ainda inativa(s)`);
      await new Promise(r => setTimeout(r, 5000));
      for (const session of remaining) {
        const baseNumber = normalizeSessionId(session.whatsappId);
        const activeNow = await isSessionActuallyActive(session.whatsappId, session.library);
        if (activeNow) continue;
        console.log(`🔁 (Extra ${cycle}) Tentando novamente sessão ${baseNumber}`);
        try {
          await reactivateSession(session);
        } catch (e) {
          console.warn(`⚠️ Falha tentativa extra (${cycle}) para ${baseNumber}:`, e.message);
        }
        await new Promise(r => setTimeout(r, 800));
      }
    }

    console.log('✅ Reconexão automática concluída (2-pass)');

  } catch (error) {
    console.error('❌ Erro na reconexão automática:', error);
  }
};


