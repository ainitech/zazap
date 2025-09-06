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
import { apiUrl } from '../../utils/apiClient';
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
    whatsappId: '', 
    library: 'baileys',
    name: ''
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

    console.log('✅ Listeners WebSocket configurados com sucesso');

    return () => {
      console.log('🔌 Removendo listeners WebSocket...');
      socket.off('sessions-update', handleSessionsUpdate);
      socket.off('session-status-update', handleSessionStatusUpdate);
      socket.off('session-qr-update', handleQRCodeUpdate);
      console.log('✅ Listeners WebSocket removidos');
    };
  }, [socket, isConnected, showQRModal, selectedSession]);

  const fetchSessions = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
  const response = await fetch(apiUrl('/api/sessions'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
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

  const openEditModal = async (session) => {
    setEditSession({ ...session, defaultQueueId: session.defaultQueueId || '' });
    setShowEditModal(true);
    await fetchQueues();
  };

  const fetchQueues = async () => {
    try {
      setLoadingQueues(true);
      const resp = await fetch(apiUrl('/api/queues'), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
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
      const resp = await fetch(apiUrl(`/api/sessions/${editSession.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
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
      
  const response = await fetch(apiUrl('/api/sessions/sync'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

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
    if (!newSession.whatsappId.trim()) {
      setError('ID da sessão é obrigatório');
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, create: true }));
      
  const response = await fetch(apiUrl('/api/sessions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          whatsappId: newSession.whatsappId.trim(),
          library: 'baileys'
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
  setNewSession({ whatsappId: '', library: 'baileys', name: '' });
        setError('');
        // Não buscar sessões manualmente - WebSocket irá atualizar
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
      
  const response = await fetch(apiUrl(`/api/sessions/${sessionId}/start`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

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
      
  const response = await fetch(apiUrl(`/api/sessions/${sessionId}/shutdown`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

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
      
  const response = await fetch(apiUrl(`/api/sessions/${sessionId}/restart`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

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
      
  const response = await fetch(apiUrl(`/api/sessions/${sessionId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

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
  const response = await fetch(apiUrl(`/api/sessions/${sessionId}/qr`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

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
      // Primeiro verificar se a sessão está ativa
      const qrData = await getQRCode(session.id, true); // silent = true
      
      if (qrData && qrData.qrCode && qrData.status !== 'disconnected') {
        // QR code já existe, usar ele
        setQrCode(qrData.qrCode);
        setQrStatus(qrData.status || 'qr_ready');
      } else {
        // Sessão não está ativa ou não tem QR, iniciar ela
        console.log('🔄 Sessão não ativa, iniciando...');
        await startSession(session.id);
        
        // Aguardar um pouco para o QR ser gerado
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
    
    switch (currentStatus) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
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
    
    switch (currentStatus) {
      case 'connected':
        return <span className="text-green-600 font-medium">Conectado</span>;
      case 'connecting':
        return <span className="text-yellow-600 font-medium">Conectando...</span>;
      case 'qr_ready':
      case 'qr':
        return <span className="text-blue-600 font-medium">Aguardando QR</span>;
      case 'disconnected':
        return <span className="text-red-600 font-medium">Desconectado</span>;
      case 'error':
        return <span className="text-red-700 font-medium">Erro</span>;
      case 'restarting':
        return <span className="text-orange-600 font-medium">Reiniciando...</span>;
      case 'starting':
        return <span className="text-blue-600 font-medium">Iniciando...</span>;
      case 'stopping':
        return <span className="text-orange-600 font-medium">Parando...</span>;
      default:
        return <span className="text-gray-600 font-medium">Desconhecido</span>;
    }
  };

  const getActionButtons = (session) => {
    const currentStatus = realTimeStatus[session.id] || session.status;
    const isLoading = actionLoading[session.id];
    
    return (
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-1"
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
            className="bg-slate-600 hover:bg-slate-700 disabled:bg-gray-700 text-white px-2 py-2 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center"
            title="Reiniciar"
          >
            {isLoading === 'restarting' ? (
              <ClockIcon className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowPathIcon className="h-3 w-3" />
            )}
          </button>

          <button
            onClick={() => deleteSession(session.id)}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-2 py-2 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center"
            title="Remover"
          >
            {isLoading === 'deleting' ? (
              <ClockIcon className="h-3 w-3 animate-spin" />
            ) : (
              <TrashIcon className="h-3 w-3" />
            )}
          </button>
        </div>
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
    <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen relative">
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Sessões WhatsApp
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
                <span className="text-xs text-gray-400">
                  {sessions.length} sessão{sessions.length !== 1 ? 'ões' : ''}
                </span>
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
        {sessions.map((session) => (
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
                Baileys
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
        ))}
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
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-md w-full p-8 border border-slate-700/50 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
                  <PlusIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Nova Sessão</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  ID da Sessão *
                </label>
                <input
                  type="text"
                  value={newSession.whatsappId}
                  onChange={(e) => setNewSession({...newSession, whatsappId: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-white rounded-xl focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all duration-300 backdrop-blur-sm"
                  placeholder="Ex: atendimento_01"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Use apenas letras, números e underline
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Biblioteca WhatsApp
                </label>
                <div className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-white rounded-xl">
                  Baileys (única suportada)
                </div>
                <div className="mt-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <p className="text-xs text-gray-300">
                    ✅ Baileys: Mais estável, melhor performance e suporte completo a recursos
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Nome da Sessão (opcional)
                </label>
                <input
                  type="text"
                  value={newSession.name}
                  onChange={(e) => setNewSession({...newSession, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-white rounded-xl focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all duration-300 backdrop-blur-sm"
                  placeholder="Ex: Atendimento Principal"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Nome amigável para identificar a sessão
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 border border-slate-600/50 text-gray-300 rounded-xl hover:bg-slate-700/50 transition-all duration-300 font-medium backdrop-blur-sm"
              >
                Cancelar
              </button>
              <button
                onClick={createSession}
                disabled={!newSession.whatsappId.trim() || actionLoading.create}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-yellow-500/25"
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
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-md w-full p-8 border border-slate-700/50 shadow-2xl backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-xl border border-blue-500/30">
                  <QrCodeIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">QR Code</h2>
                  <p className="text-sm text-gray-400">{selectedSession.whatsappId}</p>
                </div>
              </div>
              <button
                onClick={closeQRModal}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            {qrCode ? (
              <div className="space-y-6">
                <div className="flex justify-center bg-white p-6 rounded-2xl shadow-inner">
                  <img 
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                    alt="QR Code" 
                    className="max-w-full h-64 w-64 object-contain"
                    onError={(e) => {
                      console.error('Erro ao carregar QR Code:', e);
                      setError('Erro ao carregar QR Code');
                    }}
                  />
                </div>
                
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center space-x-3">
                    {qrStatus === 'qr_ready' || qrStatus === 'qr' ? (
                      <>
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <QrCodeIcon className="h-5 w-5 text-blue-400 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-400">Aguardando leitura</p>
                          <p className="text-xs text-blue-300">Escaneie o código com seu WhatsApp</p>
                        </div>
                      </>
                    ) : qrStatus === 'connecting' ? (
                      <>
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                          <ClockIcon className="h-5 w-5 text-yellow-400 animate-spin" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-yellow-400">Conectando...</p>
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
                  onClick={() => getQRCode(selectedSession.id)}
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
