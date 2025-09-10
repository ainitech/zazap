import intelligentLibraryManager from '../services/intelligentLibraryManager.js';
import Session from '../models/session.js';

/**
 * Controller para Gerenciamento Inteligente de Bibliotecas
 */
class LibraryManagerController {

  /**
   * Obtém informações do sistema e estatísticas das bibliotecas
   */
  static async getSystemInfo(req, res) {
    try {
      const systemInfo = await intelligentLibraryManager.getSystemInfo();
      
      res.json({
        success: true,
        data: systemInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao obter informações do sistema:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Obtém estatísticas das sessões ativas
   */
  static async getActiveSessionsStats(req, res) {
    try {
      const stats = intelligentLibraryManager.getActiveSessionsStats();
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas das sessões:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Cria uma nova sessão usando a biblioteca mais adequada
   */
  static async createIntelligentSession(req, res) {
    try {
      const { sessionId, channel = 'whatsapp', preferences = {} } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId é obrigatório'
        });
      }

      const result = await intelligentLibraryManager.createSession(sessionId, {
        channel,
        preferences,
        userId: req.user?.id || 1
      });

      res.json({
        success: true,
        message: `Sessão ${sessionId} criada com ${result.library}`,
        data: {
          sessionId,
          library: result.library,
          channel
        }
      });

    } catch (error) {
      console.error('Erro ao criar sessão inteligente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao criar sessão',
        details: error.message
      });
    }
  }

  /**
   * Envia mensagem usando o gerenciador inteligente
   */
  static async sendIntelligentMessage(req, res) {
    try {
      const { sessionId, to, message, options = {} } = req.body;

      if (!sessionId || !to || !message) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, to e message são obrigatórios'
        });
      }

      const result = await intelligentLibraryManager.sendMessage(sessionId, to, message, options);

      res.json({
        success: true,
        message: `Mensagem enviada via ${result.library}`,
        data: {
          sessionId,
          library: result.library,
          to,
          messageLength: message.length
        }
      });

    } catch (error) {
      console.error('Erro ao enviar mensagem inteligente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao enviar mensagem',
        details: error.message
      });
    }
  }

  /**
   * Reconecta uma sessão usando o gerenciador inteligente
   */
  static async reconnectIntelligentSession(req, res) {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId é obrigatório'
        });
      }

      const result = await intelligentLibraryManager.reconnectSession(sessionId);

      res.json({
        success: true,
        message: `Sessão ${sessionId} reconectada via ${result.library}`,
        data: {
          sessionId,
          library: result.library
        }
      });

    } catch (error) {
      console.error('Erro ao reconectar sessão:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao reconectar sessão',
        details: error.message
      });
    }
  }

  /**
   * Altera a biblioteca de uma sessão existente
   */
  static async changeSessionLibrary(req, res) {
    try {
      const { sessionId } = req.params;
      const { newLibrary } = req.body;

      if (!sessionId || !newLibrary) {
        return res.status(400).json({
          success: false,
          error: 'sessionId e newLibrary são obrigatórios'
        });
      }

      const validLibraries = ['baileys', 'whatsappjs', 'instagram', 'facebook'];
      if (!validLibraries.includes(newLibrary)) {
        return res.status(400).json({
          success: false,
          error: `Biblioteca deve ser uma das: ${validLibraries.join(', ')}`
        });
      }

      // Buscar sessão no banco
      const session = await Session.findOne({ where: { whatsappId: sessionId } });
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Sessão não encontrada'
        });
      }

      const oldLibrary = session.library;

      // Atualizar biblioteca no banco
      await session.update({ library: newLibrary });

      // Remover do controle da biblioteca antiga
      intelligentLibraryManager.removeSession(sessionId, oldLibrary);

      res.json({
        success: true,
        message: `Biblioteca da sessão ${sessionId} alterada de ${oldLibrary} para ${newLibrary}`,
        data: {
          sessionId,
          oldLibrary,
          newLibrary
        }
      });

    } catch (error) {
      console.error('Erro ao alterar biblioteca da sessão:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao alterar biblioteca',
        details: error.message
      });
    }
  }

  /**
   * Lista todas as sessões e suas bibliotecas
   */
  static async listSessionsWithLibraries(req, res) {
    try {
      const sessions = await Session.findAll({
        attributes: ['id', 'whatsappId', 'name', 'library', 'channel', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      // Agrupar por biblioteca
      const groupedByLibrary = sessions.reduce((acc, session) => {
        if (!acc[session.library]) {
          acc[session.library] = [];
        }
        acc[session.library].push(session);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          total: sessions.length,
          groupedByLibrary,
          allSessions: sessions
        }
      });

    } catch (error) {
      console.error('Erro ao listar sessões:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao listar sessões',
        details: error.message
      });
    }
  }

  /**
   * Obtém recomendação de biblioteca para nova sessão
   */
  static async getLibraryRecommendation(req, res) {
    try {
      const { channel = 'whatsapp', preferences = {} } = req.query;

      const recommendedLibrary = await intelligentLibraryManager.getBestLibraryForNewSession(
        channel, 
        preferences
      );

      const stats = intelligentLibraryManager.getActiveSessionsStats();

      res.json({
        success: true,
        data: {
          recommendedLibrary,
          channel,
          reason: `Biblioteca com menor carga para ${channel}`,
          currentStats: stats
        }
      });

    } catch (error) {
      console.error('Erro ao obter recomendação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao obter recomendação',
        details: error.message
      });
    }
  }
}

export default LibraryManagerController;
