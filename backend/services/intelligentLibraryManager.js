import Session from '../models/session.js';
import * as baileysService from './baileysService.js';
import wwebjsService from './wwebjsService.js';

// Futuramente: instagramService, facebookService
// import * as instagramService from './instagramService.js';
// import * as facebookService from './facebookService.js';

// Utilitário local para remover prefixo data URL de strings base64
function stripDataUrl(data) {
  if (!data || typeof data !== 'string') return data;
  const idx = data.indexOf('base64,');
  return idx >= 0 ? data.substring(idx + 'base64,'.length) : data;
}

/**
 * Gerenciador Inteligente de Bibliotecas Multi-Plataforma
 * 
 * Este serviço centraliza o controle de todas as bibliotecas de mensageria,
 * otimizando recursos e permitindo escalabilidade para múltiplas plataformas.
 */
class IntelligentLibraryManager {
  constructor() {
    // Cache de sessões ativas por biblioteca
    this.activeSessions = {
      baileys: new Set(),
      whatsappjs: new Set(),
      instagram: new Set(),
      facebook: new Set()
    };

    // Contadores de recursos por biblioteca
    this.resourceCounters = {
      baileys: 0,
      whatsappjs: 0,
      instagram: 0,
      facebook: 0
    };

    // Configurações de limites por biblioteca
    this.libraryLimits = {
      baileys: {
        maxSessions: 100,
        memoryPerSession: 50, // MB
        cpuThreshold: 70 // %
      },
      whatsappjs: {
        maxSessions: 50,
        memoryPerSession: 100, // MB
        cpuThreshold: 80 // %
      },
      instagram: {
        maxSessions: 30,
        memoryPerSession: 80, // MB
        cpuThreshold: 75 // %
      },
      facebook: {
        maxSessions: 30,
        memoryPerSession: 80, // MB
        cpuThreshold: 75 // %
      }
    };

    console.log('🧠 Gerenciador Inteligente de Bibliotecas iniciado');
  }

  // Normaliza nomes/aliases de bibliotecas
  normalizeLibraryName(name) {
    if (!name) return name;
    const n = String(name).toLowerCase();
    if (n === 'wwebjs' || n === 'whatsapp-web.js' || n === 'whatsappwebjs') return 'whatsappjs';
    return n;
  }

  /**
   * Determina automaticamente a melhor biblioteca para uma nova sessão
   */
  async getBestLibraryForNewSession(channel = 'whatsapp', preferences = {}) {
    console.log(`🤖 Determinando melhor biblioteca para canal: ${channel}`);

    // Para WhatsApp, escolher entre Baileys e WhatsApp-web.js
    if (channel === 'whatsapp') {
      const baileysLoad = this.getLibraryLoad('baileys');
      const wwebjsLoad = this.getLibraryLoad('whatsappjs');

      // Se usuário tem preferência específica e biblioteca não está sobrecarregada
      if (preferences.library) {
        const preferred = this.normalizeLibraryName(preferences.library);
        if (this.canAcceptNewSession(preferred)) {
          console.log(`✅ Usando biblioteca preferida: ${preferred}`);
          return preferred;
        } else {
          console.log(`⚠️ Biblioteca preferida ${preferred} está sobrecarregada`);
        }
      }

      // Escolher biblioteca com menor carga
      if (baileysLoad < wwebjsLoad && this.canAcceptNewSession('baileys')) {
        console.log(`🎯 Baileys selecionado (carga: ${baileysLoad}%)`);
        return 'baileys';
      } else if (this.canAcceptNewSession('whatsappjs')) {
        console.log(`🎯 WhatsApp-web.js selecionado (carga: ${wwebjsLoad}%)`);
        return 'whatsappjs';
      } else {
        throw new Error('Todas as bibliotecas do WhatsApp estão sobrecarregadas');
      }
    }

    // Para outras plataformas, retornar diretamente
    if (channel === 'instagram') return 'instagram';
    if (channel === 'facebook') return 'facebook';

    throw new Error(`Canal não suportado: ${channel}`);
  }

  /**
   * Calcula a carga atual de uma biblioteca (0-100%)
   */
  getLibraryLoad(library) {
    const activeSessions = this.activeSessions[library].size;
    const maxSessions = this.libraryLimits[library].maxSessions;
    const load = (activeSessions / maxSessions) * 100;
    
    return Math.min(load, 100);
  }

  /**
   * Verifica se uma biblioteca pode aceitar uma nova sessão
   */
  canAcceptNewSession(library) {
    const load = this.getLibraryLoad(library);
    const threshold = 85; // 85% de capacidade máxima
    
    return load < threshold;
  }

  /**
   * Cria uma sessão usando a biblioteca apropriada
   */
  async createSession(sessionId, options = {}) {
    try {
      // Buscar sessão no banco para determinar biblioteca
      let session = await Session.findOne({ where: { whatsappId: sessionId } });
      
      let library;
      if (session && session.library) {
        library = this.normalizeLibraryName(session.library);
        console.log(`📋 Sessão existente encontrada, usando biblioteca: ${library}`);
      } else {
        // Determinar melhor biblioteca para nova sessão
        library = this.normalizeLibraryName(
          await this.getBestLibraryForNewSession(options.channel, options.preferences)
        );
        
        // Atualizar ou criar registro no banco
        if (session) {
          await session.update({ library });
        } else {
          await Session.create({
            whatsappId: sessionId,
            library,
            channel: options.channel || 'whatsapp',
            userId: options.userId || 1,
            status: 'connecting'
          });
        }
      }

      // Criar sessão usando a biblioteca apropriada
      let result;
      switch (library) {
        case 'baileys':
          result = await baileysService.createSession(sessionId, options);
          break;
        case 'whatsappjs':
          result = await wwebjsService.createWwebjsSession(sessionId, options);
          break;
        case 'instagram':
          // result = await instagramService.createSession(sessionId, options);
          throw new Error('Instagram ainda não implementado');
        case 'facebook':
          // result = await facebookService.createSession(sessionId, options);
          throw new Error('Facebook ainda não implementado');
        default:
          throw new Error(`Biblioteca não suportada: ${library}`);
      }

      // Registrar sessão ativa
      this.activeSessions[library].add(sessionId);
      this.resourceCounters[library]++;

      console.log(`✅ Sessão ${sessionId} criada com ${library}`);
      console.log(`📊 Sessões ativas por biblioteca:`, this.getActiveSessionsStats());

      return { success: true, library, result };

    } catch (error) {
      console.error(`❌ Erro ao criar sessão ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Envia mensagem usando a biblioteca correta da sessão
   */
  async sendMessage(sessionId, to, message, options = {}) {
    try {
      const session = await Session.findOne({ where: { whatsappId: sessionId } });
      if (!session) {
        throw new Error(`Sessão ${sessionId} não encontrada no banco`);
      }

      const library = this.normalizeLibraryName(session.library);
      console.log(`📤 Enviando mensagem via ${library} para ${to}`);

      let result;
      const type = (typeof message === 'object' && message?.type) ? message.type : 'text';
      switch (library) {
        case 'baileys': {
          if (type === 'media') {
            // message: { buffer, mimetype, filename, caption }
            result = await baileysService.sendMedia(
              sessionId,
              to,
              message.buffer,
              message.mimetype,
              message.caption,
              { filename: message.filename }
            );
          } else {
            const text = typeof message === 'string' ? message : message.text;
            result = await baileysService.sendText(sessionId, to, text);
          }
          break;
        }
        case 'whatsappjs': {
          // Garantir que o cliente WWebJS está pronto; caso contrário, tentar reconectar e/ou fazer fallback para Baileys
          let wclient = wwebjsService.getWwebjsSession(sessionId);
          let wstate = null;
          try { wstate = await wclient?.getState(); } catch {}

          if (!wclient || wstate !== 'CONNECTED') {
            console.warn(`⚠️ WWebJS não está pronto (state=${wstate}). Tentando reconectar sessão ${sessionId}...`);
            try { await wwebjsService.reconnectWwebjsSession?.(sessionId); } catch (e) { console.warn('Falha ao reconectar WWebJS:', e?.message); }
            wclient = wwebjsService.getWwebjsSession(sessionId);
            try { wstate = await wclient?.getState(); } catch {}
          }

          if (!wclient || wstate !== 'CONNECTED') {
            // Fallback: se Baileys estiver disponível, enviar por ele
            const bsock = baileysService.getBaileysSession?.(sessionId);
            if (bsock && bsock.user) {
              console.log('🔁 Fallback automático: enviando via Baileys pois WWebJS não está pronto');
              if (type === 'media') {
                result = await baileysService.sendMedia(
                  sessionId,
                  to,
                  message.buffer || (message.base64 ? Buffer.from(stripDataUrl(message.base64), 'base64') : null),
                  message.mimetype,
                  message.caption,
                  { filename: message.filename }
                );
              } else {
                const text = typeof message === 'string' ? message : message.text;
                result = await baileysService.sendText(sessionId, to, text);
              }
              break;
            }

            // Sem fallback possível
            throw new Error('WWebJS não está pronto e Baileys não está disponível para fallback');
          }

          if (type === 'media') {
            // Se for áudio e solicitado como voice, enviar nota de voz
            const isAudio = (message.mimetype || '').startsWith('audio');
            const wantsVoice = message.voice === true || /opus|ogg|voice|ptt/i.test(message.filename || '');
            if (isAudio && (wantsVoice || options.voice === true)) {
              const buf = message.buffer || (message.base64 ? Buffer.from(stripDataUrl(message.base64), 'base64') : null);
              if (!buf) throw new Error('Audio buffer is required for voice note');
              result = await wwebjsService.sendVoiceNote(sessionId, to, buf, message.mimetype);
            } else {
              // message: { buffer(base64 accepted), mimetype, filename }
              const base64 = message.base64 || (message.buffer ? message.buffer.toString('base64') : null);
              result = await wwebjsService.sendMedia(sessionId, to, {
                base64,
                mimetype: message.mimetype,
                filename: message.filename
              });
            }
          } else {
            const text = typeof message === 'string' ? message : message.text;
            result = await wwebjsService.sendText(sessionId, to, text);
          }
          break;
        }
        case 'instagram':
          throw new Error('Instagram ainda não implementado');
        case 'facebook':
          throw new Error('Facebook ainda não implementado');
        default:
          throw new Error(`Biblioteca não suportada: ${library}`);
      }

      console.log(`✅ Mensagem enviada via ${library}`);
      return { success: true, library, result };

    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem via ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Envia atualização de presença (typing/recording/available)
   */
  async sendPresenceUpdate(sessionId, to, presenceStatus) {
    const session = await Session.findOne({ where: { whatsappId: sessionId } });
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada no banco`);
    }
    const library = this.normalizeLibraryName(session.library);
    console.log(`📡 Enviando presença '${presenceStatus}' via ${library} para ${to}`);

    switch (library) {
      case 'baileys': {
        const sock = baileysService.getBaileysSession(sessionId);
        if (!sock || !sock.user) throw new Error('Baileys não conectado');
        await sock.sendPresenceUpdate(presenceStatus, to);
        return { success: true, library };
      }
      case 'whatsappjs': {
        await wwebjsService.sendPresenceUpdate(sessionId, to, presenceStatus);
        return { success: true, library };
      }
      default:
        throw new Error(`Biblioteca não suportada: ${library}`);
    }
  }

  /**
   * Reconecta uma sessão usando a biblioteca correta
   */
  async reconnectSession(sessionId) {
    try {
      const session = await Session.findOne({ where: { whatsappId: sessionId } });
      if (!session) {
        throw new Error(`Sessão ${sessionId} não encontrada no banco`);
      }

      const library = session.library;
      console.log(`🔄 Reconectando sessão ${sessionId} via ${library}`);

      let result;
      switch (library) {
        case 'baileys':
          result = await baileysService.reconnectSession?.(sessionId);
          break;
        case 'whatsappjs':
          result = await wwebjsService.reconnectExistingSession?.(sessionId);
          break;
        case 'instagram':
          // result = await instagramService.reconnectSession(sessionId);
          throw new Error('Instagram ainda não implementado');
        case 'facebook':
          // result = await facebookService.reconnectSession(sessionId);
          throw new Error('Facebook ainda não implementado');
        default:
          throw new Error(`Biblioteca não suportada: ${library}`);
      }

      // Registrar sessão ativa se reconexão foi bem sucedida
      if (result) {
        this.activeSessions[library].add(sessionId);
      }

      console.log(`✅ Sessão ${sessionId} reconectada via ${library}`);
      return { success: true, library, result };

    } catch (error) {
      console.error(`❌ Erro ao reconectar sessão ${sessionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Remove uma sessão do controle de recursos
   */
  removeSession(sessionId, library) {
    if (this.activeSessions[library]) {
      this.activeSessions[library].delete(sessionId);
      this.resourceCounters[library] = Math.max(0, this.resourceCounters[library] - 1);
      console.log(`🗑️ Sessão ${sessionId} removida do controle de ${library}`);
    }
  }

  /**
   * Obtém estatísticas das sessões ativas
   */
  getActiveSessionsStats() {
    const stats = {};
    for (const [library, sessions] of Object.entries(this.activeSessions)) {
      stats[library] = {
        active: sessions.size,
        max: this.libraryLimits[library].maxSessions,
        load: this.getLibraryLoad(library).toFixed(1) + '%'
      };
    }
    return stats;
  }

  /**
   * Obtém informações detalhadas do sistema
   */
  async getSystemInfo() {
    const sessionsInDb = await Session.findAll({
      attributes: ['library', 'status'],
      raw: true
    });

    const dbStats = {};
    sessionsInDb.forEach(session => {
      if (!dbStats[session.library]) {
        dbStats[session.library] = { total: 0, connected: 0, disconnected: 0 };
      }
      dbStats[session.library].total++;
      dbStats[session.library][session.status]++;
    });

    return {
      activeInMemory: this.getActiveSessionsStats(),
      databaseStats: dbStats,
      resourceLimits: this.libraryLimits,
      systemLoad: {
        totalActiveSessions: Object.values(this.activeSessions).reduce((sum, sessions) => sum + sessions.size, 0)
      }
    };
  }
}

// Instância singleton
const intelligentLibraryManager = new IntelligentLibraryManager();

export default intelligentLibraryManager;
