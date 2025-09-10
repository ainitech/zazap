// Gerenciador de bibliotecas de sessões (Baileys vs WWebJS)
import { Session } from '../models/index.js';
import { getBaileysSession, listBaileysSessions } from './baileysService.js';
import wwebjsService from './wwebjsService.js';

// ===== IDENTIFICAÇÃO DE BIBLIOTECAS =====

/**
 * Determina qual biblioteca uma sessão está usando
 * @param {string} sessionId - ID da sessão
 * @returns {Promise<'baileys'|'wwebjs'|null>} - Tipo da biblioteca ou null se não encontrada
 */
export const getSessionLibrary = async (sessionId) => {
  try {
    // Primeiro, verificar no banco de dados
    const session = await Session.findOne({ 
      where: { whatsappId: sessionId } 
    });
    
    if (session?.library) {
      console.log(`🔍 Biblioteca identificada via banco: ${sessionId} -> ${session.library}`);
      return session.library;
    }

    // Se não tem no banco, tentar identificar pela sessão ativa
    const baileysSession = getBaileysSession(sessionId);
    const wwebjsSession = wwebjsService.getWwebjsSession(sessionId);
    
    if (baileysSession) {
      console.log(`🔍 Biblioteca identificada via sessão ativa: ${sessionId} -> baileys`);
      return 'baileys';
    }
    
    if (wwebjsSession) {
      console.log(`🔍 Biblioteca identificada via sessão ativa: ${sessionId} -> wwebjs`);
      return 'wwebjs';
    }

    // Verificar se existe em disco
    const hasWwebjsOnDisk = await wwebjsService.sessionExistsOnDisk(sessionId);
    if (hasWwebjsOnDisk) {
      console.log(`🔍 Biblioteca identificada via disco: ${sessionId} -> wwebjs`);
      return 'wwebjs';
    }

    console.log(`❓ Biblioteca não identificada para sessão: ${sessionId}`);
    return null;
  } catch (error) {
    console.error(`❌ Erro ao identificar biblioteca da sessão ${sessionId}:`, error.message);
    return null;
  }
};

/**
 * Verifica se uma sessão está ativa em qualquer biblioteca
 * @param {string} sessionId - ID da sessão
 * @returns {Promise<{active: boolean, library: string|null, session: any}>}
 */
export const getSessionStatus = async (sessionId) => {
  try {
    // Verificar Baileys
    const baileysSession = getBaileysSession(sessionId);
    if (baileysSession && baileysSession.user) {
      return {
        active: true,
        library: 'baileys',
        session: baileysSession,
        status: 'connected'
      };
    }

    // Verificar WWebJS
    const wwebjsSession = wwebjsService.getWwebjsSession(sessionId);
    if (wwebjsSession) {
      const isReady = wwebjsSession.info && wwebjsSession.info.wid;
      return {
        active: isReady,
        library: 'wwebjs',
        session: wwebjsSession,
        status: isReady ? 'connected' : 'connecting'
      };
    }

    // Não está ativa, mas pode existir em disco
    const library = await getSessionLibrary(sessionId);
    return {
      active: false,
      library: library,
      session: null,
      status: 'disconnected'
    };
  } catch (error) {
    console.error(`❌ Erro ao verificar status da sessão ${sessionId}:`, error.message);
    return {
      active: false,
      library: null,
      session: null,
      status: 'error'
    };
  }
};

// ===== FUNÇÕES DE ENVIO UNIFICADAS =====

/**
 * Envia mensagem de texto usando a biblioteca correta
 * @param {string} sessionId - ID da sessão
 * @param {string} to - Destinatário
 * @param {string} text - Texto da mensagem
 * @returns {Promise<any>} - Resultado do envio
 */
export const sendTextMessage = async (sessionId, to, text) => {
  try {
    const { active, library, session } = await getSessionStatus(sessionId);
    
    if (!active) {
      // Tentar reconectar se não estiver ativa
      console.log(`🔄 Sessão ${sessionId} não está ativa, tentando reconectar...`);
      const reconnected = await reconnectSession(sessionId);
      if (!reconnected) {
        throw new Error(`Sessão ${sessionId} não está conectada e não foi possível reconectar`);
      }
      return await sendTextMessage(sessionId, to, text); // Retry após reconexão
    }

    console.log(`📤 Enviando mensagem via ${library.toUpperCase()} para ${to}`);
    
    if (library === 'baileys') {
      const { sendText } = await import('./baileysService.js');
      return await sendText(sessionId, to, text);
    } else if (library === 'wwebjs') {
      return await wwebjsService.sendText(sessionId, to, text);
    } else {
      throw new Error(`Biblioteca ${library} não suportada`);
    }
  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem de texto:`, error.message);
    throw error;
  }
};

/**
 * Envia mensagem de mídia usando a biblioteca correta
 * @param {string} sessionId - ID da sessão
 * @param {string} to - Destinatário
 * @param {object} media - Dados da mídia
 * @returns {Promise<any>} - Resultado do envio
 */
export const sendMediaMessage = async (sessionId, to, media) => {
  try {
    const { active, library, session } = await getSessionStatus(sessionId);
    
    if (!active) {
      console.log(`🔄 Sessão ${sessionId} não está ativa, tentando reconectar...`);
      const reconnected = await reconnectSession(sessionId);
      if (!reconnected) {
        throw new Error(`Sessão ${sessionId} não está conectada e não foi possível reconectar`);
      }
      return await sendMediaMessage(sessionId, to, media); // Retry após reconexão
    }

    console.log(`📤 Enviando mídia via ${library.toUpperCase()} para ${to}`);
    
    if (library === 'baileys') {
      const { sendMedia } = await import('./baileysService.js');
      return await sendMedia(sessionId, to, media);
    } else if (library === 'wwebjs') {
      return await wwebjsService.sendMedia(sessionId, to, media);
    } else {
      throw new Error(`Biblioteca ${library} não suportada`);
    }
  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem de mídia:`, error.message);
    throw error;
  }
};

// ===== GERENCIAMENTO DE SESSÕES =====

/**
 * Tenta reconectar uma sessão baseada na biblioteca identificada
 * @param {string} sessionId - ID da sessão
 * @returns {Promise<boolean>} - True se reconectou com sucesso
 */
export const reconnectSession = async (sessionId) => {
  try {
    const library = await getSessionLibrary(sessionId);
    
    if (!library) {
      console.log(`❌ Não foi possível identificar a biblioteca da sessão ${sessionId}`);
      return false;
    }

    console.log(`🔄 Tentando reconectar sessão ${sessionId} usando ${library.toUpperCase()}`);
    
    if (library === 'wwebjs') {
      const reconnected = await wwebjsService.reconnectExistingSession(sessionId);
      if (reconnected) {
        console.log(`✅ Sessão WWebJS ${sessionId} reconectada com sucesso`);
        return true;
      }
    } else if (library === 'baileys') {
      // Para Baileys, implementar lógica de reconexão se necessário
      console.log(`⚠️ Reconexão automática do Baileys não implementada para ${sessionId}`);
      return false;
    }

    return false;
  } catch (error) {
    console.error(`❌ Erro ao reconectar sessão ${sessionId}:`, error.message);
    return false;
  }
};

/**
 * Lista todas as sessões ativas por biblioteca
 * @returns {Promise<object>} - Objeto com estatísticas das sessões
 */
export const listAllSessions = async () => {
  try {
    const baileysSessions = listBaileysSessions();
    const wwebjsSessions = wwebjsService.listWwebjsSessions();
    const wwebjsOnDisk = await wwebjsService.listSessionsOnDisk();
    
    const stats = {
      baileys: {
        active: baileysSessions.length,
        sessions: baileysSessions
      },
      wwebjs: {
        active: wwebjsSessions.length,
        onDisk: wwebjsOnDisk.length,
        sessions: wwebjsSessions,
        diskSessions: wwebjsOnDisk
      },
      total: {
        active: baileysSessions.length + wwebjsSessions.length,
        onDisk: wwebjsOnDisk.length
      }
    };

    console.log(`📊 Sessões: Baileys(${stats.baileys.active}), WWebJS(ativo:${stats.wwebjs.active}, disco:${stats.wwebjs.onDisk})`);
    
    return stats;
  } catch (error) {
    console.error('❌ Erro ao listar sessões:', error.message);
    return { baileys: { active: 0, sessions: [] }, wwebjs: { active: 0, onDisk: 0, sessions: [], diskSessions: [] }, total: { active: 0, onDisk: 0 } };
  }
};

/**
 * Atualiza a biblioteca de uma sessão no banco de dados
 * @param {string} sessionId - ID da sessão
 * @param {'baileys'|'wwebjs'} library - Biblioteca a ser definida
 * @returns {Promise<boolean>} - True se atualizou com sucesso
 */
export const setSessionLibrary = async (sessionId, library) => {
  try {
    const session = await Session.findOne({ 
      where: { whatsappId: sessionId } 
    });
    
    if (!session) {
      console.log(`❌ Sessão ${sessionId} não encontrada no banco para atualizar biblioteca`);
      return false;
    }

    await session.update({ library });
    console.log(`✅ Biblioteca da sessão ${sessionId} atualizada para: ${library}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao atualizar biblioteca da sessão ${sessionId}:`, error.message);
    return false;
  }
};

export default {
  getSessionLibrary,
  getSessionStatus,
  sendTextMessage,
  sendMediaMessage,
  reconnectSession,
  listAllSessions,
  setSessionLibrary
};
