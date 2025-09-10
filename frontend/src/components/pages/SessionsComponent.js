import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PhoneIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  PlusIcon,
  TrashIcon,
  QrCodeIcon,
  PlayIcon,
  StopIcon,
  PauseIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  WifiIcon,
  SparklesIcon,
  BoltIcon,
  LinkIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { apiUrl, apiFetch } from '../../utils/apiClient';
import { useNavigate } from 'react-router-dom';

// Backend base comes from env via apiClient; requests should use apiUrl helper

export default function SessionsComponent() {
  const { socket, isConnected } = useSocket();
  const toastApi = useToast();
  // Use a ref to make toast API available inside WebSocket handlers declared later
  const toastApiRef = useRef(null);
  const navigate = useNavigate();
  // Keep sessions state in scope for handlers
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [newSession, setNewSession] = useState({ 
    library: 'baileys',
    name: '',
    channel: 'whatsapp',
    igUser: '',
    igPass: '',
    fbEmail: '',
  fbPass: '',
  importAllChats: false,
  importFromDate: '',
  importToDate: ''
  });
  const [qrCode, setQrCode] = useState('');
  const [qrStatus, setQrStatus] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [realTimeStatus, setRealTimeStatus] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [queues, setQueues] = useState([]);
  const [loadingQueues, setLoadingQueues] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [importProgress, setImportProgress] = useState({}); // sessionId -> progress object
  // WWebJS inline (new session modal)
  const [wjsQr, setWjsQr] = useState('');
  const [wjsStatus, setWjsStatus] = useState('');
  // quick-send via WWebJS removido

  useEffect(() => {
    // Buscar sessões iniciais apenas uma vez
    fetchSessions();
  }, []);

  // Setup WebSocket listeners quando socket está disponível
  useEffect(() => {
  // keep toast api ref updated
  toastApiRef.current = toastApi;

    if (!socket || !isConnected) {
      console.log('🔌 Socket não disponível ou não conectado, pulando configuração de listeners', { socket: !!socket, isConnected });
      return;
    }

    console.log('🔗 Configurando listeners WebSocket para sessões...');
    console.log('📊 Estado atual:', { showQRModal, selectedSession: selectedSession?.id });
    
    // Listener para atualizações de sessões
    const handleSessionsUpdate = (sessionsData) => {
      console.log('🔄 Atualização de sessões recebida via WebSocket:', sessionsData.length);
      
      // Atualizar timestamp da última atualização
      setLastUpdate(new Date());
      
      // Verificar se alguma sessão foi removida
      const currentSessionIds = sessions.map(s => s.id);
      const newSessionIds = sessionsData.map(s => s.id);
      const removedSessions = sessions.filter(s => !newSessionIds.includes(s.id));
      
      if (removedSessions.length > 0) {
        console.log('🗑️ Sessões removidas detectadas:', removedSessions.map(s => s.whatsappId || s.name));
        // Mostrar mensagem de remoção se não foi uma deleção manual
        if (!actionLoading[removedSessions[0]?.id]) {
          const sessionName = removedSessions[0]?.whatsappId || removedSessions[0]?.name || 'Sessão';
          setSuccessMessage(`${sessionName} foi removida do sistema.`);
          setTimeout(() => setSuccessMessage(''), 4000);
        }
      }
      
      setSessions(sessionsData);
      
      // Atualizar status em tempo real
      const statusMap = {};
      sessionsData.forEach(session => {
        statusMap[session.id] = session.currentStatus || session.status;
      });
      setRealTimeStatus(statusMap);
    };
    
    // Listener para status de sessão individual
    const { addToast } = toastApiRef.current || {};
  const handleSessionStatusUpdate = ({ sessionId, status }) => {
      console.log('🔄 Status de sessão atualizado via WebSocket:', { sessionId, status });
      setRealTimeStatus(prev => ({ 
        ...prev, 
        [sessionId]: status 
      }));

      // Se for a sessão selecionada no modal e conectou, fechar modal
      if (showQRModal && selectedSession?.id === sessionId && status === 'connected') {
        console.log('🎉 Sessão conectada com sucesso - fechando modal QR');
        setShowQRModal(false);
        setQrCode('');
        setQrStatus('');
        setSuccessMessage(`Sessão ${selectedSession.whatsappId || selectedSession.name || sessionId} conectada com sucesso!`);
        setTimeout(() => setSuccessMessage(''), 5000);
      }

      // Novo: se estivermos com o modal de criação aberto exibindo QR do WWebJS, feche ao conectar
      if (status === 'connected' && showCreateModal) {
        // Confirmar se a sessão conectada existe na lista e está em biblioteca wwebjs
        const sess = sessions.find(s => s.id === sessionId);
        if (sess && (sess.library === 'wwebjs' || sess.library === 'whatsappjs')) {
          console.log('🎉 Sessão WWebJS conectada - fechando modal de criação');
          setShowCreateModal(false);
          setWjsQr('');
          setWjsStatus('');
          setNewSession({ library: 'baileys', name: '', channel: 'whatsapp', igUser: '', igPass: '', fbEmail: '', fbPass: '', importAllChats: false, importFromDate: '', importToDate: '' });
          setSuccessMessage('Sessão conectada com sucesso!');
          setTimeout(() => setSuccessMessage(''), 5000);
        }
      }

      // Mostrar toast quando sessão ficar desconectada
      if (status === 'disconnected') {
        // Tentar pegar o nome da sessão
        const sess = sessions.find(s => s.id === sessionId);
        const name = sess ? (sess.whatsappId || sess.name || `Sessão ${sessionId}`) : `Sessão ${sessionId}`;
        // Usar addToast se disponível
        if (toastApiRef.current && toastApiRef.current.addToast) {
          toastApiRef.current.addToast(`Sessão ${name} desconectada. Por favor reconecte na página de sessões.`, { 
            type: 'error', 
            duration: 12000,
            action: {
              label: 'Ir para Sessões',
              onClick: () => navigate('/sessions')
            }
          });
        } else {
          console.warn('Toast API não encontrada para notificações de sessão desconectada');
        }
      }
    };

    // Listener para QR Code updates
    const handleQRCodeUpdate = ({ sessionId, qrCode, status }) => {
      console.log('🔄 QR Code atualizado via WebSocket:', { sessionId, status, qrCode: qrCode ? 'presente' : 'ausente' });
      
      // Se for a sessão selecionada no modal, atualizar o QR
      if (showQRModal && selectedSession?.id === sessionId) {
        setQrCode(qrCode || '');
        setQrStatus(status || '');

        // Novo: Fechar modal imediatamente quando status chegar como 'connected'
        // (alguns ambientes podem emitir o "connected" no evento de QR antes do session-status-update)
        if (status === 'connected') {
          console.log('🎉 Sessão conectada (via QR update) - fechando modal QR');
          setShowQRModal(false);
          setSuccessMessage(`Sessão ${selectedSession.whatsappId || selectedSession.name || sessionId} conectada com sucesso!`);
          setTimeout(() => setSuccessMessage(''), 5000);
        }
        
        // Não fechar modal aqui - aguardar o evento session-status-update com 'connected'
        // para garantir que a sessão está realmente conectada
      }
      
      // Atualizar status da sessão apenas se não for o modal atual
      // (o modal será atualizado pelo session-status-update)
      if (!showQRModal || selectedSession?.id !== sessionId) {
        setRealTimeStatus(prev => ({ 
          ...prev, 
          [sessionId]: status || 'disconnected' 
        }));
      }
    };

    socket.on('sessions-update', handleSessionsUpdate);
    socket.on('session-status-update', handleSessionStatusUpdate);
    socket.on('session-qr-update', handleQRCodeUpdate);
    
    // Listener para whatsappSession (compatível com referência Baileys)
    const handleWhatsappSession = (data) => {
      console.log('📱 whatsappSession event recebido:', data);
      if (data.action === 'update' && data.session) {
        const { session } = data;
        // Se a sessão está conectada e é WWebJS, fechar modal QR se aberto
        if (session.status === 'connected' && session.library === 'wwebjs') {
          if (showQRModal && selectedSession?.whatsappId === session.whatsappId) {
            console.log('🎉 WWebJS conectado via whatsappSession - fechando modal QR');
            setShowQRModal(false);
            setSuccessMessage(`Sessão ${session.name || session.whatsappId} conectada com sucesso!`);
            setTimeout(() => setSuccessMessage(''), 5000);
          }
        }
        // Atualizar lista de sessões também
        fetchSessions(true);
      }
    };
    socket.on('whatsappSession', handleWhatsappSession);
    
    // Fallback para eventos específicos do WWebJS (quando não há id da sessão do banco)
    const handleWwebjsStatusUpdate = ({ whatsappId, status }) => {
      if (status === 'connected' && showCreateModal) {
        // Fecha o modal de criação se estivermos aguardando QR inline
        setShowCreateModal(false);
        setWjsQr('');
        setWjsStatus('');
        setSuccessMessage('Sessão conectada com sucesso!');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    };
    socket.on('wwebjs-status-update', handleWwebjsStatusUpdate);
    // Import progress listener
    const handleImportProgress = (payload) => {
      if (!payload || !payload.sessionId) return;
      setImportProgress(prev => ({ ...prev, [payload.sessionId]: payload }));
      if (payload.status === 'completed') {
        // Pequeno toast opcional
        if (toastApiRef.current && toastApiRef.current.addToast) {
          toastApiRef.current.addToast(`Importação concluída (${payload.created}/${payload.total}) para sessão ${payload.whatsappId}`, { type: 'success', duration: 6000 });
        }
      } else if (payload.status === 'error') {
        if (toastApiRef.current && toastApiRef.current.addToast) {
          toastApiRef.current.addToast(`Erro na importação: ${payload.error}`, { type: 'error', duration: 8000 });
        }
      }
    };
    socket.on('session-import-progress', handleImportProgress);

    console.log('✅ Listeners WebSocket configurados com sucesso');

    return () => {
      console.log('🔌 Removendo listeners WebSocket...');
      socket.off('sessions-update', handleSessionsUpdate);
      socket.off('session-status-update', handleSessionStatusUpdate);
      socket.off('session-qr-update', handleQRCodeUpdate);
      socket.off('session-import-progress', handleImportProgress);
      socket.off('wwebjs-status-update', handleWwebjsStatusUpdate);
      socket.off('whatsappSession', handleWhatsappSession);
      console.log('✅ Listeners WebSocket removidos');
    };
  }, [socket, isConnected, showQRModal, selectedSession, showCreateModal]);

  const fetchSessions = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
  const response = await apiFetch('/api/sessions');
      
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        
        // Atualizar timestamp da última atualização
        setLastUpdate(new Date());
        
        // Atualizar status em tempo real
        const statusMap = {};
        data.forEach(session => {
          statusMap[session.id] = session.currentStatus || session.status;
        });
        setRealTimeStatus(statusMap);
        
        if (!silent) setError('');
      } else {
        if (!silent) setError('Erro ao carregar sessões');
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      if (!silent) setError('Erro ao conectar com o servidor');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ============ WWebJS (whatsapp-web.js) isolated flow ============
  // Helper to slugify a human name into a safe session id
  const makeSessionId = useCallback((name) => {
    const base = String(name || '').toLowerCase().trim()
      .normalize('NFD').replace(/[^\p{Letter}\p{Number}\s_-]/gu, '')
      .replace(/\s+/g, '_').replace(/_+/g, '_').slice(0, 40);
    return base || `sess_${Date.now()}`;
  }, []);

  const initWwebjs = async (sessionIdArg) => {
    const sid = sessionIdArg || makeSessionId(newSession.name);
    if (!sid) {
      setError('Informe um nome para gerar a sessão (WWebJS)');
      return;
    }
    try {
      setActionLoading(prev => ({ ...prev, wwebjsInit: true }));
      setWjsQr('');
      setWjsStatus('loading');
      const resp = await apiFetch('/api/wwebjs/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(data?.error || 'Falha ao iniciar WWebJS');
        setWjsStatus('error');
        return;
      }
      // Controller returns { ok, sessionId, qr }
      const qrObj = data?.qr;
      const qrImage = typeof qrObj === 'object' ? (qrObj.dataUrl || qrObj.qr || '') : (qrObj || '');
      setWjsQr(qrImage);
      setWjsStatus('qr_ready');
      setError('');
    } catch (e) {
      console.error('Erro initWwebjs:', e);
      setError('Erro ao conectar com o servidor (WWebJS)');
      setWjsStatus('error');
    } finally {
      setActionLoading(prev => ({ ...prev, wwebjsInit: false }));
    }
  };

  // Initialize WWebJS and display QR in the global QR modal
  const initWwebjsForModal = async (whatsappId) => {
    if (!whatsappId) return;
    try {
      setQrCode('');
      setQrStatus('loading');
      const resp = await apiFetch('/api/wwebjs/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: whatsappId })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setQrStatus('error');
        setError(data?.error || 'Falha ao iniciar WWebJS');
        return;
      }
      const qrObj = data?.qr;
      const qrImage = typeof qrObj === 'object' ? (qrObj.dataUrl || qrObj.qr || '') : (qrObj || '');
      setQrCode(qrImage);
      setQrStatus('qr_ready');
    } catch (e) {
      console.error('Erro initWwebjsForModal:', e);
      setQrStatus('error');
      setError('Erro ao conectar com o servidor (WWebJS)');
    }
  };

  // função de envio removida

  const openEditModal = async (session) => {
    setEditSession({ ...session, defaultQueueId: session.defaultQueueId || '' });
    setShowEditModal(true);
    await fetchQueues();
  };

  const fetchQueues = async () => {
    try {
      setLoadingQueues(true);
  const resp = await apiFetch('/api/queues');
      if (resp.ok) {
        const data = await resp.json();
        setQueues(Array.isArray(data) ? data : data.queues || []);
      }
    } catch (e) {
      console.error('Erro ao carregar filas:', e);
    } finally {
      setLoadingQueues(false);
    }
  };

  const saveSessionEdit = async () => {
    if (!editSession) return;
    try {
      setSavingEdit(true);
      const resp = await apiFetch(`/api/sessions/${editSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultQueueId: editSession.defaultQueueId || null })
      });
      if (resp.ok) {
        setShowEditModal(false);
        fetchSessions(true);
        setSuccessMessage('Sessão atualizada');
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        let errMsg = 'Falha ao salvar sessão';
        try { const j = await resp.json(); errMsg = j.error || errMsg; } catch {}
        console.error('Erro salvar sessão', resp.status, errMsg);
        setError(`${errMsg} (HTTP ${resp.status})`);
      }
    } catch (e) {
      console.error('Erro ao salvar sessão:', e);
    } finally {
      setSavingEdit(false);
    }
  };

  const renderEditModal = () => {
    if (!showEditModal || !editSession) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl">
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-700">
            <h2 className="text-lg font-semibold text-neutral-100">Editar Conexão</h2>
            <button onClick={() => setShowEditModal(false)} className="text-neutral-400 hover:text-neutral-200 transition">✕</button>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wide text-neutral-400 mb-1">ID / Número</label>
              <div className="px-3 py-2 bg-neutral-800 rounded border border-neutral-700 text-neutral-200 text-sm">{editSession.whatsappId}</div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-neutral-400 mb-1">Biblioteca</label>
              <div className="px-3 py-2 bg-neutral-800 rounded border border-neutral-700 text-neutral-300 text-sm">{editSession.library}</div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-neutral-400 mb-1 flex items-center gap-2">Fila Padrão <span className="text-neutral-500 normal-case font-normal">(auto vincular novos tickets)</span></label>
              <select
                disabled={loadingQueues}
                value={editSession.defaultQueueId || ''}
                onChange={(e) => setEditSession(prev => ({ ...prev, defaultQueueId: e.target.value }))}
                className="w-full bg-neutral-800 border border-neutral-600 focus:border-indigo-500 focus:ring-0 rounded px-3 py-2 text-sm text-neutral-100 disabled:opacity-50">
                <option value="">Sem fila padrão</option>
                {queues.map(q => (
                  <option key={q.id} value={q.id}>{q.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-neutral-700 flex justify-end gap-3">
            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-600 text-neutral-200">Cancelar</button>
            <button onClick={saveSessionEdit} disabled={savingEdit} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded text-white font-medium flex items-center gap-2">
              {savingEdit && <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"/>}
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const syncSessions = async () => {
    try {
      setActionLoading(prev => ({ ...prev, sync: true }));
      
  const response = await apiFetch('/api/sessions/sync', { method: 'POST' });

      if (response.ok) {
        setSuccessMessage('Sessões sincronizadas com sucesso! Sessões desconectadas foram reconectadas automaticamente.');
        setTimeout(() => setSuccessMessage(''), 8000);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao sincronizar sessões');
      }
    } catch (error) {
      console.error('Erro ao sincronizar sessões:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setActionLoading(prev => ({ ...prev, sync: false }));
    }
  };

  const createSession = async () => {
    if (!newSession.name.trim()) {
      setError('Nome da sessão é obrigatório');
      return;
    }
    // Valida credenciais conforme canal
    if (newSession.channel === 'instagram' && (!newSession.igUser || !newSession.igPass)) {
      setError('Credenciais Instagram necessárias');
      return;
    }
    if (newSession.channel === 'facebook' && (!newSession.fbEmail || !newSession.fbPass)) {
      setError('Credenciais Facebook necessárias');
      return;
    }
    try {
      setActionLoading(prev => ({ ...prev, create: true }));
      let response;
      const generatedId = makeSessionId(newSession.name);
      if (newSession.channel === 'whatsapp') {
        if (newSession.library === 'wwebjs') {
          // Cria a sessão no banco e fecha o modal (fluxo igual ao Baileys)
          const resp = await apiFetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              whatsappId: generatedId,
              library: 'wwebjs',
              name: newSession.name?.trim() || undefined
            })
          });
          if (!resp.ok) {
            let errMsg = 'Erro ao criar sessão';
            try { const j = await resp.json(); errMsg = j.error || errMsg; } catch {}
            setError(errMsg);
            return; // não prossegue
          }
          await fetchSessions(true);
          setShowCreateModal(false);
          setNewSession({ library: 'baileys', name: '', channel: 'whatsapp', igUser: '', igPass: '', fbEmail: '', fbPass: '', importAllChats: false, importFromDate: '', importToDate: '' });
          setSuccessMessage('Sessão criada. Clique em QR Code no card para conectar.');
          setTimeout(() => setSuccessMessage(''), 5000);
          setError('');
          return;
        }
        response = await apiFetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            whatsappId: generatedId, 
            library: 'baileys', 
            name: newSession.name?.trim() || undefined,
            importAllChats: !!newSession.importAllChats,
            importFromDate: newSession.importAllChats && newSession.importFromDate ? newSession.importFromDate : undefined,
            importToDate: newSession.importAllChats && newSession.importToDate ? newSession.importToDate : undefined
          })
        });
      } else {
        // Multi canal init direto (gera ID a partir do nome)
        const payload = { sessionId: generatedId, channel: newSession.channel };
        if (newSession.channel === 'instagram') {
          payload.credentials = { username: newSession.igUser, password: newSession.igPass };
        }
        if (newSession.channel === 'facebook') {
          payload.credentials = { email: newSession.fbEmail, password: newSession.fbPass };
        }
        response = await apiFetch('/api/mc/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
  setShowCreateModal(false);
  setWjsQr(''); setWjsStatus('');
  setNewSession({ library: 'baileys', name: '', channel: 'whatsapp', igUser: '', igPass: '', fbEmail: '', fbPass: '', importAllChats: false, importFromDate: '', importToDate: '' });
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao criar sessão');
      }
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setActionLoading(prev => ({ ...prev, create: false }));
    }
  };

  const startSession = async (sessionId) => {
    try {
      setActionLoading(prev => ({ ...prev, [sessionId]: 'starting' }));
      
  const response = await apiFetch(`/api/sessions/${sessionId}/start`, { method: 'POST' });

      if (response.ok) {
        const data = await response.json();
        console.log('Sessão iniciada:', data);
        
        // Atualizar status local imediatamente
        setRealTimeStatus(prev => ({ 
          ...prev, 
          [sessionId]: 'connecting' 
        }));
        
        setError('');
        // Não buscar sessões manualmente - WebSocket irá atualizar
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao iniciar sessão');
      }
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setActionLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const stopSession = async (sessionId) => {
    try {
      setActionLoading(prev => ({ ...prev, [sessionId]: 'stopping' }));
      
  const response = await apiFetch(`/api/sessions/${sessionId}/shutdown`, { method: 'POST' });

      if (response.ok) {
        setRealTimeStatus(prev => ({ 
          ...prev, 
          [sessionId]: 'disconnected' 
        }));
        setError('');
        // Não buscar sessões manualmente - WebSocket irá atualizar
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao parar sessão');
      }
    } catch (error) {
      console.error('Erro ao parar sessão:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setActionLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const restartSession = async (sessionId) => {
    try {
      setActionLoading(prev => ({ ...prev, [sessionId]: 'restarting' }));
      
  const response = await apiFetch(`/api/sessions/${sessionId}/restart`, { method: 'POST' });

      if (response.ok) {
        setRealTimeStatus(prev => ({ 
          ...prev, 
          [sessionId]: 'connecting' 
        }));
        setError('');
        // Não buscar sessões manualmente - WebSocket irá atualizar
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao reiniciar sessão');
      }
    } catch (error) {
      console.error('Erro ao reiniciar sessão:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setActionLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const deleteSession = async (sessionId) => {
    // Encontrar a sessão para mostrar informações específicas
    const session = sessions.find(s => s.id === sessionId);
    const sessionName = session ? (session.whatsappId || session.name || `Sessão ${sessionId}`) : `Sessão ${sessionId}`;
    
    const confirmMessage = `Tem certeza que deseja excluir a sessão "${sessionName}"?\n\nEsta ação irá:\n• Remover a sessão permanentemente do banco de dados\n• Limpar todos os arquivos de autenticação\n• Desconectar qualquer conexão ativa\n\nEsta ação não pode ser desfeita.`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      setActionLoading(prev => ({ ...prev, [sessionId]: 'deleting' }));
      
  const response = await apiFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });

      if (response.ok) {
        setError('');
        // Mostrar mensagem de sucesso
        const session = sessions.find(s => s.id === sessionId);
        const sessionName = session ? (session.whatsappId || session.name || `Sessão ${sessionId}`) : `Sessão ${sessionId}`;
        setSuccessMessage(`Sessão "${sessionName}" excluída com sucesso!`);
        setTimeout(() => setSuccessMessage(''), 5000);
        
        // Mostrar toast de sucesso
        if (toastApiRef.current && toastApiRef.current.addToast) {
          toastApiRef.current.addToast(`Sessão "${sessionName}" foi excluída com sucesso!`, { 
            type: 'success', 
            duration: 4000 
          });
        }
        
        // Não buscar sessões manualmente - WebSocket irá atualizar
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao excluir sessão');
      }
    } catch (error) {
      console.error('Erro ao excluir sessão:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setActionLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const getQRCode = async (sessionId, silent = false) => {
    try {
  const response = await apiFetch(`/api/sessions/${sessionId}/qr`);

      if (response.ok) {
        const data = await response.json();
        
        if (!silent) {
          setQrCode(data.qrCode || '');
          setQrStatus(data.status || '');
        }
        
        // Se conectou, WebSocket irá atualizar automaticamente
        if (data.status === 'connected') {
          setShowQRModal(false);
          setQrCode('');
          setQrStatus('');
          // Atualizar status da sessão
          setRealTimeStatus(prev => ({ 
            ...prev, 
            [sessionId]: 'connected' 
          }));
          // Mostrar mensagem de sucesso
          setSuccessMessage('Sessão conectada com sucesso!');
          setTimeout(() => setSuccessMessage(''), 5000);
        }
        
        // Atualizar o QR no modal se estiver aberto
        if (showQRModal && selectedSession?.id === sessionId) {
          setQrCode(data.qrCode || '');
          setQrStatus(data.status || '');
        }
        
        // Atualizar status da sessão
        setRealTimeStatus(prev => ({ 
          ...prev, 
          [sessionId]: data.status || 'disconnected' 
        }));
        
        return data;
      } else {
        if (!silent) {
          const errorData = await response.json();
          setError(errorData.error || 'Erro ao obter QR Code');
        }
      }
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      if (!silent) setError('Erro ao conectar com o servidor');
    }
  };

  const showQRCode = async (session) => {
    setSelectedSession(session);
    setShowQRModal(true);
    setQrCode('');
    setQrStatus('loading');
    
    try {
      if (session.library === 'wwebjs') {
        await initWwebjsForModal(session.whatsappId);
      } else {
        // Baileys: verificar se a sessão está ativa
        const qrData = await getQRCode(session.id, true);
        if (qrData && qrData.qrCode && qrData.status !== 'disconnected') {
          setQrCode(qrData.qrCode);
          setQrStatus(qrData.status || 'qr_ready');
        } else {
          console.log('🔄 Sessão não ativa, iniciando...');
          await startSession(session.id);
          setTimeout(async () => {
            const newQrData = await getQRCode(session.id, true);
            if (newQrData && newQrData.qrCode) {
              setQrCode(newQrData.qrCode);
              setQrStatus(newQrData.status || 'qr_ready');
            } else {
              setQrStatus('error');
              setError('Erro ao gerar QR code. Tente novamente.');
            }
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Erro ao mostrar QR code:', error);
      setQrStatus('error');
      setError('Erro ao preparar QR code');
    }
    
    // WebSocket irá manter o QR atualizado automaticamente
  };

  const closeQRModal = () => {
    // Se a sessão ainda não conectou, mostrar confirmação
    if (qrStatus !== 'connected' && qrStatus !== '') {
      const confirmClose = window.confirm('Tem certeza que deseja fechar? A sessão ainda não foi conectada.');
      if (!confirmClose) return;
    }
    
    setShowQRModal(false);
    setSelectedSession(null);
    setQrCode('');
    setQrStatus('');
  };

  const getStatusIcon = (sessionId, status) => {
    const currentStatus = realTimeStatus[sessionId] || status;
    // Mapeia ícones por status para evitar sempre cair no default
    switch (currentStatus) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-emerald-500" />;
      case 'connecting':
      case 'qr_ready':
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'disconnected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case 'qr':
        return <QrCodeIcon className="h-5 w-5 text-blue-500 animate-pulse" />;
      default:
        return <SignalIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (sessionId, status) => {
    const currentStatus = realTimeStatus[sessionId] || status;
    const baseCls = 'font-medium';
    switch (currentStatus) {
      case 'connected':
        return <span className="text-emerald-500 {baseCls}">Conectado</span>;
      case 'connecting':
      case 'starting':
        return <span className="text-indigo-400 {baseCls}">Conectando...</span>;
      case 'qr_ready':
        return <span className="text-blue-500 {baseCls}">QR Pronto</span>;
      case 'qr':
        return <span className="text-blue-400 {baseCls}">Escaneie o QR</span>;
      case 'restarting':
        return <span className="text-amber-400 {baseCls}">Reiniciando...</span>;
      case 'stopping':
        return <span className="text-yellow-500 {baseCls}">Parando...</span>;
      case 'disconnected':
        return <span className="text-gray-400 {baseCls}">Desconectado</span>;
      case 'error':
        return <span className="text-red-500 {baseCls}">Erro</span>;
      case 'awaiting_initial_sync':
      case 'awaiting':
        return <span className="text-sky-400 {baseCls}">Aguardando</span>;
      default:
        // Capitaliza status desconhecido para alguma visibilidade
        return <span className="text-gray-500 {baseCls}">{(currentStatus || 'Desconhecido')}</span>;
    }
  };

  const getActionButtons = (session) => {
    const currentStatus = realTimeStatus[session.id] || session.status;
    const isLoading = actionLoading[session.id];
  const importInfo = importProgress[session.id];
  const canceling = actionLoading[`cancel_${session.id}`];
    
    return (
      <>
        {/* WWebJS: sempre exibir botão de QR e ocultar start/restart/stop Baileys */}
        {(session.library === 'wwebjs' || session.library === 'whatsappjs') ? (
          <>
            <button
              onClick={() => showQRCode(session)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 touch-manipulation"
            >
              <QrCodeIcon className="h-4 w-4" />
              <span>QR Code</span>
            </button>
            {/* Secondary: Remover (manter), ocultar Reiniciar para WWebJS */}
            <div className="grid grid-cols-1 gap-2 mt-2">
              <button
                onClick={() => deleteSession(session.id)}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-2 py-2.5 sm:py-2 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center touch-manipulation min-h-[36px] sm:min-h-[auto]"
                title="Remover"
              >
                {isLoading === 'deleting' ? (
                  <ClockIcon className="h-4 w-4 sm:h-3 sm:w-3 animate-spin" />
                ) : (
                  <TrashIcon className="h-4 w-4 sm:h-3 sm:w-3" />
                )}
              </button>
            </div>
          </>
  ) : (
  <>
  {/* Primary Action */}
  {currentStatus === 'disconnected' || currentStatus === 'error' ? (
          <button
            onClick={() => startSession(session.id)}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center space-x-1"
          >
            {isLoading === 'starting' ? (
              <ClockIcon className="h-4 w-4 animate-spin" />
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
            <span>{isLoading === 'starting' ? 'Iniciando...' : 'Iniciar'}</span>
          </button>
        ) : (
          <button
            onClick={() => stopSession(session.id)}
            disabled={isLoading}
            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center space-x-1"
          >
            {isLoading === 'stopping' ? (
              <ClockIcon className="h-4 w-4 animate-spin" />
            ) : (
              <PauseIcon className="h-4 w-4" />
            )}
            <span>{isLoading === 'stopping' ? 'Parando...' : 'Parar'}</span>
          </button>
        )}

        {/* QR Code Button */}
        {(currentStatus === 'connecting' || 
          currentStatus === 'qr_ready' || 
          currentStatus === 'qr' || 
          currentStatus === 'starting') && (
          <button
            onClick={() => showQRCode(session)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 touch-manipulation"
          >
            <QrCodeIcon className="h-4 w-4" />
            <span>QR Code</span>
          </button>
        )}

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => restartSession(session.id)}
            disabled={isLoading}
            className="bg-slate-600 hover:bg-slate-700 disabled:bg-gray-700 text-white px-2 py-2.5 sm:py-2 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center touch-manipulation min-h-[36px] sm:min-h-[auto]"
            title="Reiniciar"
          >
            {isLoading === 'restarting' ? (
              <ClockIcon className="h-4 w-4 sm:h-3 sm:w-3 animate-spin" />
            ) : (
              <ArrowPathIcon className="h-4 w-4 sm:h-3 sm:w-3" />
            )}
          </button>

          <button
            onClick={() => deleteSession(session.id)}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-2 py-2.5 sm:py-2 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center touch-manipulation min-h-[36px] sm:min-h-[auto]"
            title="Remover"
          >
            {isLoading === 'deleting' ? (
              <ClockIcon className="h-4 w-4 sm:h-3 sm:w-3 animate-spin" />
            ) : (
              <TrashIcon className="h-4 w-4 sm:h-3 sm:w-3" />
            )}
          </button>
  </div>
  </>
  )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-900 min-h-screen">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen relative">
      {renderEditModal()}
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          {/* Title and Status */}
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl">
              <PhoneIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Sessões
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></div>
                <span className={`text-xs ${
                  isConnected ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isConnected ? 'Conectado' : 'Desconectado'}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400">{sessions.length} sessão{sessions.length !== 1 ? 'ões' : ''}</span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchSessions()}
              disabled={!isConnected}
              className="flex items-center space-x-1 px-3 py-2 bg-slate-700/50 text-gray-300 rounded-lg hover:bg-slate-600/50 transition-all duration-200 disabled:opacity-50 text-sm"
              title="Atualizar sessões"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            
            <button
              onClick={syncSessions}
              disabled={!isConnected || actionLoading.sync}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 disabled:opacity-50 text-sm"
              title="Sincronizar sessões"
            >
              {actionLoading.sync ? (
                <ClockIcon className="h-4 w-4 animate-spin" />
              ) : (
                <WifiIcon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {actionLoading.sync ? 'Sync...' : 'Sincronizar'}
              </span>
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 font-medium text-sm"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Nova Sessão</span>
            </button>
          </div>
        </div>
        
        {/* WebSocket Status Warning */}
        {!isConnected && (
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span className="text-sm">Conexão em tempo real indisponível</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/20 rounded-xl">
              <ExclamationTriangleIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Erro</p>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/30 text-green-400 px-6 py-4 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-xl">
              <CheckCircleIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Sucesso</p>
              <p className="text-sm text-green-300">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sessions.map((session) => {
          const importInfo = importProgress[session.id];
          const canceling = actionLoading[`cancel_${session.id}`];
          return (
          <div key={session.id} className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/50 transition-all duration-200">
            {/* Session Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <PhoneIcon className="h-4 w-4 text-yellow-400" />
                <h3 className="font-medium text-slate-200 truncate">
                  {session.whatsappId}
                </h3>
              </div>
              
              <div className="flex items-center space-x-1">
                {getStatusIcon(session.id, session.status)}
                <span className="text-xs">
                  {getStatusText(session.id, session.status)}
                </span>
              </div>
            </div>

            {/* Library Badge */}
            <div className="mb-3">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-500/20 text-blue-400">
                {session.channel ? session.channel : 'whatsapp'}
              </span>
            </div>

            {/* Session Info */}
            <div className="text-xs text-gray-400 mb-4">
              <div className="flex justify-between">
                <span>Criado:</span>
                <span>{new Date(session.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {getActionButtons(session)}
               {importInfo && (
                 <div className="mt-2">
                   <div className="flex justify-between items-center mb-1">
                     <span className="text-[10px] uppercase tracking-wide text-gray-400">Importação</span>
                     <span className="text-[10px] text-gray-400">{importInfo.percentage}%</span>
                   </div>
                   <div className="w-full h-2 bg-slate-700/60 rounded-full overflow-hidden">
                     <div className={`h-full transition-all duration-300 ${importInfo.status === 'error' ? 'bg-red-500' : importInfo.status === 'completed' ? 'bg-green-500' : importInfo.status === 'canceled' ? 'bg-gray-500' : 'bg-yellow-500 animate-pulse'}`}
                          style={{ width: `${importInfo.percentage || 0}%` }} />
                   </div>
                   <div className="mt-1 text-[10px] text-gray-400 flex justify-between">
                     <span>{importInfo.processed}/{importInfo.total}</span>
                     <span>{importInfo.status === 'completed' ? 'Concluído' : importInfo.status === 'error' ? 'Erro' : importInfo.status === 'canceled' ? 'Cancelado' : 'Processando...'}</span>
                   </div>
                   {importInfo.status === 'running' && (
                     <button
                       onClick={async () => {
                         try {
                           setActionLoading(prev => ({ ...prev, [`cancel_${session.id}`]: true }));
                           const resp = await apiFetch(`/api/sessions/${session.id}/cancel-import`, { method: 'POST' });
                           if (!resp.ok) {
                             const j = await resp.json().catch(()=>({}));
                             setError(j.error || 'Falha ao cancelar importação');
                           }
                         } catch (e) {
                           setError('Erro ao solicitar cancelamento');
                         } finally {
                           setActionLoading(prev => ({ ...prev, [`cancel_${session.id}`]: false }));
                         }
                       }}
                       disabled={canceling}
                       className="mt-2 w-full bg-red-600 hover:bg-red-700 disabled:bg-red-900 text-white rounded-lg py-1.5 text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                     >
                       {canceling ? <ClockIcon className="h-3 w-3 animate-spin"/> : <XCircleIcon className="h-3 w-3"/>}
                       {canceling ? 'Cancelando...' : 'Cancelar Importação'}
                     </button>
                   )}
                 </div>
     )}
              <button
                onClick={() => openEditModal(session)}
                className="w-full mt-2 bg-neutral-700/60 hover:bg-neutral-600 text-neutral-200 text-xs font-medium px-3 py-2 rounded-lg transition flex items-center justify-center gap-1"
              >
                <span>Editar</span>
              </button>
              {session.defaultQueueId && (
                <div className="mt-1 text-[10px] text-indigo-300 tracking-wide">Fila padrão: {session.defaultQueueId}</div>
              )}
            </div>
          </div>
   )})}
      </div>

      {/* Empty State */}
      {sessions.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <PhoneIcon className="h-8 w-8 text-yellow-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Nenhuma sessão encontrada</h3>
          <p className="text-gray-400 mb-6">Comece criando uma nova sessão WhatsApp.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 font-medium"
          >
            Criar primeira sessão
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-md w-full p-4 sm:p-8 border border-slate-700/50 shadow-2xl backdrop-blur-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
                  <PlusIcon className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
                </div>
                <h2 className="text-lg sm:text-2xl font-bold text-white">Nova Sessão</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
              >
                <XCircleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2 sm:mb-3">
                  Nome da Sessão *
                </label>
                <input
                  type="text"
                  value={newSession.name}
                  onChange={(e) => setNewSession({...newSession, name: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600/50 text-white rounded-xl focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
                  placeholder="Ex: Atendimento Principal"
                />
                <p className="text-xs text-gray-400 mt-2">Um nome amigável; o ID técnico será gerado automaticamente.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2 sm:mb-3">Canal</label>
                <select
                  value={newSession.channel}
                  onChange={(e) => setNewSession({ ...newSession, channel: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600/50 text-white rounded-xl focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 text-sm sm:text-base"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>

              {newSession.channel === 'whatsapp' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Biblioteca</label>
                  <select
                    value={newSession.library}
                    onChange={(e) => setNewSession(prev => ({ ...prev, library: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 text-white rounded-xl text-sm"
                  >
                    <option value="baileys">Baileys (recomendado)</option>
                    <option value="wwebjs">whatsapp-web.js</option>
                  </select>
                </div>
              )}

              {newSession.channel === 'instagram' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">IG Username *</label>
                    <input value={newSession.igUser} onChange={e=>setNewSession({...newSession, igUser:e.target.value})} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 text-white rounded-xl focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">IG Password *</label>
                    <input type="password" value={newSession.igPass} onChange={e=>setNewSession({...newSession, igPass:e.target.value})} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 text-white rounded-xl focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 text-sm" />
                  </div>
                  <p className="text-xs text-amber-400 sm:col-span-2">Credenciais armazenadas somente na sessão do servidor (não persistimos em claro no frontend).</p>
                </div>
              )}

              {newSession.channel === 'facebook' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">FB Email *</label>
                    <input value={newSession.fbEmail} onChange={e=>setNewSession({...newSession, fbEmail:e.target.value})} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 text-white rounded-xl focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">FB Password *</label>
                    <input type="password" value={newSession.fbPass} onChange={e=>setNewSession({...newSession, fbPass:e.target.value})} className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 text-white rounded-xl focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 text-sm" />
                  </div>
                  <p className="text-xs text-amber-400 sm:col-span-2">Use conta secundária. API não oficial pode gerar bloqueios.</p>
                </div>
              )}

              {newSession.channel === 'whatsapp' && newSession.library === 'baileys' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-slate-700/30 border border-slate-600/40 rounded-xl p-4">
                    <div>
                      <input
                        id="importAllChats"
                        type="checkbox"
                        checked={newSession.importAllChats}
                        onChange={(e) => setNewSession(prev => ({ ...prev, importAllChats: e.target.checked }))}
                        className="mt-1 w-4 h-4 text-yellow-500 rounded border-slate-500 bg-slate-800 focus:ring-yellow-500/60 focus:ring-offset-0"
                      />
                    </div>
                    <label htmlFor="importAllChats" className="flex-1 cursor-pointer">
                      <span className="block font-semibold text-sm text-gray-200">Importar histórico de chats</span>
                      <span className="block text-xs text-gray-400 mt-1 leading-relaxed">Ao conectar, cria tickets básicos para cada conversa 1:1 encontrada na conta. Não importa mensagens (apenas contatos) nesta versão. Pode aumentar o tempo de conexão.</span>
                    </label>
                  </div>
                  {newSession.importAllChats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">De (data inicial)</label>
                        <input
                          type="date"
                          value={newSession.importFromDate}
                          onChange={e => setNewSession(prev => ({ ...prev, importFromDate: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 text-white rounded-lg focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/50 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Até (data final)</label>
                        <input
                          type="date"
                          value={newSession.importToDate}
                          onChange={e => setNewSession(prev => ({ ...prev, importToDate: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 text-white rounded-lg focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/50 text-sm"
                        />
                      </div>
                      <p className="text-[10px] text-amber-400 sm:col-span-2">Se deixar em branco, importa sem limite de data correspondente. Datas são filtradas de forma aproximada (baseadas na última atividade da conversa).</p>
                    </div>
                  )}
                </div>
              )}

              {newSession.channel === 'whatsapp' && newSession.library === 'wwebjs' && (
                <div className="space-y-3">
                  <button onClick={() => initWwebjs()} disabled={actionLoading.wwebjsInit} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg disabled:opacity-50">
                    {actionLoading.wwebjsInit ? 'Preparando...' : 'Gerar QR (WWebJS)'}
                  </button>
                  {wjsStatus && <div className="text-xs text-gray-400">Status: {wjsStatus}</div>}
                  {wjsQr && (
                    <div className="mt-2 flex justify-center">
                      <img src={wjsQr} alt="QR" className="w-56 h-56 bg-white p-2 rounded"/>
                    </div>
                  )}
                  <p className="text-[10px] text-amber-400">Conector separado; não interfere nas sessões Baileys.</p>
                </div>
              )}


              {/* Nome da Sessão já definido acima como obrigatório */}
            </div>

            <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0 mt-6 sm:mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 border border-slate-600/50 text-gray-300 rounded-xl hover:bg-slate-700/50 transition-all duration-300 font-medium backdrop-blur-sm text-sm sm:text-base"
              >
                Cancelar
              </button>
              <button
                onClick={createSession}
                disabled={!newSession.name.trim() || actionLoading.create}
                className="w-full sm:flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-yellow-500/25 text-sm sm:text-base"
              >
                {actionLoading.create ? (
                  <div className="flex items-center justify-center">
                    <ClockIcon className="h-4 w-4 animate-spin mr-2" />
                    Criando...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Criar Sessão
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-md w-full p-4 md:p-8 border border-slate-700/50 shadow-2xl backdrop-blur-sm max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 md:p-3 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-xl border border-blue-500/30">
                  <QrCodeIcon className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white">QR Code</h2>
                  <p className="text-xs md:text-sm text-gray-400 truncate max-w-[150px] md:max-w-none">{selectedSession.whatsappId}</p>
                </div>
              </div>
              <button
                onClick={closeQRModal}
                className="text-gray-400 hover:text-white transition-colors p-1 md:p-2 hover:bg-slate-700/50 rounded-lg"
              >
                <XCircleIcon className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </div>
            
            {qrCode ? (
              <div className="space-y-4 md:space-y-6">
                <div className="flex justify-center bg-white p-4 md:p-6 rounded-2xl shadow-inner">
                  <img 
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                    alt="QR Code" 
                    className="max-w-full h-48 w-48 md:h-64 md:w-64 object-contain"
                    onError={(e) => {
                      console.error('Erro ao carregar QR Code:', e);
                      setError('Erro ao carregar QR Code');
                    }}
                  />
                </div>
                
                <div className="text-center space-y-3 md:space-y-4">
                  <div className="flex items-center justify-center space-x-3">
                    {qrStatus === 'qr_ready' || qrStatus === 'qr' ? (
                      <>
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <QrCodeIcon className="h-4 w-4 md:h-5 md:w-5 text-blue-400 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-xs md:text-sm font-semibold text-blue-400">Aguardando leitura</p>
                          <p className="text-[10px] md:text-xs text-blue-300">Escaneie o código com seu WhatsApp</p>
                        </div>
                      </>
                    ) : qrStatus === 'connecting' ? (
                      <>
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                          <ClockIcon className="h-4 w-4 md:h-5 md:w-5 text-yellow-400 animate-spin" />
                        </div>
                        <div>
                          <p className="text-xs md:text-sm font-semibold text-yellow-400">Conectando...</p>
                          <p className="text-xs text-yellow-300">Estabelecendo conexão</p>
                        </div>
                      </>
                    ) : qrStatus === 'connected' ? (
                      <>
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <CheckCircleIcon className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-green-400">Conectado!</p>
                          <p className="text-xs text-green-300">WhatsApp conectado com sucesso</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2 bg-gray-500/20 rounded-lg">
                          <QrCodeIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-400">Aguardando</p>
                          <p className="text-xs text-gray-300">{qrStatus || 'Preparando conexão...'}</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      1. Abra o WhatsApp no seu celular<br/>
                      2. Toque em <strong>Mais opções</strong> → <strong>Aparelhos conectados</strong><br/>
                      3. Toque em <strong>Conectar um aparelho</strong><br/>
                      4. Aponte a câmera para este código
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    if (selectedSession?.library === 'wwebjs' || selectedSession?.library === 'whatsappjs') {
                      return initWwebjsForModal(selectedSession.whatsappId);
                    }
                    return getQRCode(selectedSession.id);
                  }}
                  className="w-full px-4 py-3 bg-slate-700/50 text-gray-300 rounded-xl hover:bg-slate-600/50 transition-all duration-300 text-sm font-medium border border-slate-600/30 backdrop-blur-sm"
                >
                  <ArrowPathIcon className="h-4 w-4 inline mr-2" />
                  Atualizar QR Code
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center items-center bg-slate-700/30 p-12 rounded-2xl border border-slate-600/30">
                  <div className="text-center">
                    <div className="p-4 bg-yellow-500/20 rounded-full inline-block mb-4">
                      <ClockIcon className="h-12 w-12 text-yellow-400 animate-spin" />
                    </div>
                    <p className="text-gray-300 font-medium">Gerando QR Code...</p>
                    <p className="text-xs text-gray-400 mt-2">Isso pode levar alguns segundos</p>
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={closeQRModal}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-yellow-500/25"
            >
              Fechar
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
