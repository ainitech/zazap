import { Session } from '../models/index.js';

export const getSessionsStatus = async (req, res) => {
  try {
    console.log('🔍 Verificando status de todas as sessões...');
    
    // Buscar todas as sessões do banco
    const sessions = await Session.findAll();
    
    const sessionsStatus = sessions.map(session => {
      // Considera conectado apenas pelo status do banco
      const activeConnection = session.status === 'connected';
      return {
        id: session.id,
        name: session.name,
        whatsappId: session.whatsappId,
        library: session.library,
        status: session.status,
        activeConnection,
        activeService: activeConnection ? session.library : null
      };
    });
    
    console.log(`📊 Status das sessões:`, sessionsStatus);
    
    res.json({
      total: sessions.length,
      active: sessionsStatus.filter(s => s.activeConnection).length,
      sessions: sessionsStatus
    });
  } catch (err) {
    console.error('❌ Erro ao verificar status das sessões:', err);
    res.status(500).json({ error: err.message });
  }
};

export const reactivateSession = async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    console.log(`🔄 Tentando reativar sessão ${sessionId}...`);
    
    // Buscar sessão no banco
    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }
    
    // Verificar se já está ativa baseado apenas no banco
    if (session.status === 'connected') {
      return res.json({ message: 'Sessão já está ativa no banco', active: true });
    }
    
    // Atualizar status para conectado
    await Session.update(
      { status: 'connected' },
      { where: { id: sessionId } }
    );
    
    console.log(`✅ Status da sessão ${sessionId} atualizado para 'connected'`);
    
    res.json({ 
      message: 'Sessão reativada com sucesso',
      sessionId: session.id,
      library: session.library,
      whatsappId: session.whatsappId,
      status: 'connected'
    });
    
  } catch (err) {
    console.error(`❌ Erro ao reativar sessão ${sessionId}:`, err);
    res.status(500).json({ error: err.message });
  }
};
