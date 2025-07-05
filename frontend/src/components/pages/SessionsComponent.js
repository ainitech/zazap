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
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import { useSocket } from '../../context/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function SessionsComponent() {
  const { socket, isConnected } = useSocket();
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

  useEffect(() => {
    // Buscar sessões iniciais apenas uma vez
    fetchSessions();
  }, []);

  // Setup WebSocket listeners quando socket está disponível
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('🔗 Configurando listeners WebSocket para sessões...');
    
    // Listener para atualizações de sessões
    const handleSessionsUpdate = (sessionsData) => {
      console.log('🔄 Atualização de sessões recebida via WebSocket:', sessionsData.length);
      setSessions(sessionsData);
      
      // Atualizar status em tempo real
      const statusMap = {};
      sessionsData.forEach(session => {
        statusMap[session.id] = session.currentStatus || session.status;
      });
      setRealTimeStatus(statusMap);
    };
    
    // Listener para status de sessão individual
    const handleSessionStatusUpdate = ({ sessionId, status }) => {
      console.log('🔄 Status de sessão atualizado via WebSocket:', { sessionId, status });
      setRealTimeStatus(prev => ({ 
        ...prev, 
        [sessionId]: status 
      }));
    };

    // Listener para QR Code updates
    const handleQRCodeUpdate = ({ sessionId, qrCode, status }) => {
      console.log('🔄 QR Code atualizado via WebSocket:', { sessionId, status });
      
      // Se for a sessão selecionada no modal, atualizar o QR
      if (showQRModal && selectedSession?.id === sessionId) {
        setQrCode(qrCode || '');
        setQrStatus(status || '');
        
        // Se conectou, fechar modal
        if (status === 'connected') {
          setShowQRModal(false);
          setQrCode('');
          setQrStatus('');
          setSuccessMessage(`Sessão ${selectedSession.whatsappId} conectada com sucesso!`);
          setTimeout(() => setSuccessMessage(''), 5000);
        }
      }
      
      // Atualizar status da sessão
      setRealTimeStatus(prev => ({ 
        ...prev, 
        [sessionId]: status || 'disconnected' 
      }));
    };

    socket.on('sessions-update', handleSessionsUpdate);
    socket.on('session-status-update', handleSessionStatusUpdate);
    socket.on('qr-code-update', handleQRCodeUpdate);

    return () => {
      socket.off('sessions-update', handleSessionsUpdate);
      socket.off('session-status-update', handleSessionStatusUpdate);
      socket.off('qr-code-update', handleQRCodeUpdate);
    };
  }, [socket, isConnected, showQRModal, selectedSession]);

  const fetchSessions = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const response = await fetch(`${API_URL}/api/sessions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        
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

  const syncSessions = async () => {
    try {
      setActionLoading(prev => ({ ...prev, sync: true }));
      
      const response = await fetch(`${API_URL}/api/sessions/sync`, {
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
      
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          whatsappId: newSession.whatsappId.trim(),
          library: newSession.library
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
      
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/start`, {
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
      
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/shutdown`, {
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
      
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/restart`, {
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
    if (!window.confirm('Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita.')) return;

    try {
      setActionLoading(prev => ({ ...prev, [sessionId]: 'deleting' }));
      
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setError('');
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
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/qr`, {
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
    
    // Buscar QR inicial
    const qrData = await getQRCode(session.id);
    if (qrData && qrData.qrCode) {
      setQrCode(qrData.qrCode);
      setQrStatus(qrData.status || 'qr_ready');
    }
    
    // WebSocket irá manter o QR atualizado automaticamente
  };

  const closeQRModal = () => {
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
      <div className="flex space-x-2">
        {/* Botão Iniciar/Parar */}
        {currentStatus === 'disconnected' || currentStatus === 'error' ? (
          <button
            onClick={() => startSession(session.id)}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading === 'starting' ? (
              <ClockIcon className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <PlayIcon className="h-4 w-4 mr-1" />
            )}
            {isLoading === 'starting' ? 'Iniciando...' : 'Iniciar'}
          </button>
        ) : (
          <button
            onClick={() => stopSession(session.id)}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading === 'stopping' ? (
              <ClockIcon className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <StopIcon className="h-4 w-4 mr-1" />
            )}
            {isLoading === 'stopping' ? 'Parando...' : 'Parar'}
          </button>
        )}

        {/* Botão QR Code - Mostrar quando connecting, qr_ready, qr ou starting */}
        {(currentStatus === 'connecting' || 
          currentStatus === 'qr_ready' || 
          currentStatus === 'qr' || 
          currentStatus === 'starting') && (
          <button
            onClick={() => showQRCode(session)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <QrCodeIcon className="h-4 w-4 mr-1" />
            QR Code
          </button>
        )}

        {/* Botão Reiniciar */}
        <button
          onClick={() => restartSession(session.id)}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading === 'restarting' ? (
            <ClockIcon className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <ArrowPathIcon className="h-4 w-4 mr-1" />
          )}
          {isLoading === 'restarting' ? 'Reiniciando...' : 'Reiniciar'}
        </button>

        {/* Botão Excluir */}
        <button
          onClick={() => deleteSession(session.id)}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading === 'deleting' ? (
            <ClockIcon className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <TrashIcon className="h-4 w-4 mr-1" />
          )}
          {isLoading === 'deleting' ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
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
    <div className="p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-white">Sessões WhatsApp</h1>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? 'WebSocket conectado' : 'WebSocket desconectado'}
                </span>
              </div>
            </div>
            <p className="text-gray-400">Gerencie suas conexões WhatsApp em tempo real</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchSessions()}
              disabled={!isConnected}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Atualizar sessões manualmente"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              onClick={syncSessions}
              disabled={!isConnected || actionLoading.sync}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sincronizar e reconectar sessões automaticamente"
            >
              {actionLoading.sync ? (
                <ClockIcon className="h-4 w-4 animate-spin" />
              ) : (
                <WifiIcon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {actionLoading.sync ? 'Sincronizando...' : 'Sincronizar'}
              </span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 px-6 py-3 rounded-xl flex items-center space-x-2 hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Nova Sessão</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-900/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl backdrop-blur-sm">
          {successMessage}
        </div>
      )}

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <div key={session.id} className="bg-slate-800 rounded-xl shadow-xl p-6 border border-slate-700 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <PhoneIcon className="h-8 w-8 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{session.whatsappId}</h3>
                  <p className="text-sm text-gray-400">ID: {session.id}</p>
                  <div className="flex items-center mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      session.library === 'baileys' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {session.library === 'baileys' ? 'Baileys' : 'WhatsApp.js'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-slate-700 px-3 py-1 rounded-full">
                {getStatusIcon(session.id, session.status)}
                {getStatusText(session.id, session.status)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-gray-400 bg-slate-700/50 p-3 rounded-lg space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-300 font-medium">Biblioteca:</span>
                  <span className={`font-medium ${
                    session.library === 'baileys' ? 'text-blue-400' : 'text-green-400'
                  }`}>
                    {session.library === 'baileys' ? 'Baileys' : 'WhatsApp.js'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 font-medium">Status Atual:</span>
                  <span className="font-medium">{getStatusText(session.id, session.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 font-medium">Criado em:</span>
                  <span>{new Date(session.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                {session.updatedAt && session.updatedAt !== session.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-300 font-medium">Última atualização:</span>
                    <span>{new Date(session.updatedAt).toLocaleString('pt-BR')}</span>
                  </div>
                )}
              </div>

              {getActionButtons(session)}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sessions.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <PhoneIcon className="h-10 w-10 text-yellow-500" />
          </div>
          <h3 className="mt-2 text-lg font-semibold text-white">Nenhuma sessão encontrada</h3>
          <p className="mt-1 text-sm text-gray-400">Comece criando uma nova sessão WhatsApp.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 px-6 py-3 rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 font-semibold shadow-lg"
            >
              Criar primeira sessão
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full p-6 border border-slate-700 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-white">Nova Sessão WhatsApp</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ID da Sessão *
                </label>
                <input
                  type="text"
                  value={newSession.whatsappId}
                  onChange={(e) => setNewSession({...newSession, whatsappId: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
                  placeholder="Ex: atendimento_01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Biblioteca WhatsApp
                </label>
                <select
                  value={newSession.library}
                  onChange={(e) => setNewSession({...newSession, library: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="baileys">Baileys (Recomendado)</option>
                  <option value="whatsappjs">WhatsApp.js</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {newSession.library === 'baileys' 
                    ? 'Baileys: Mais estável e com melhor suporte a recursos' 
                    : 'WhatsApp.js: Baseado no navegador, mais simples'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome da Sessão (opcional)
                </label>
                <input
                  type="text"
                  value={newSession.name}
                  onChange={(e) => setNewSession({...newSession, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
                  placeholder="Ex: Atendimento Principal"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 border border-slate-600 text-gray-300 rounded-xl hover:bg-slate-700 transition-all duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={createSession}
                disabled={!newSession.whatsappId.trim() || actionLoading.create}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {actionLoading.create ? (
                  <div className="flex items-center justify-center">
                    <ClockIcon className="h-4 w-4 animate-spin mr-2" />
                    Criando...
                  </div>
                ) : (
                  'Criar Sessão'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full p-6 text-center border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">QR Code - {selectedSession.whatsappId}</h2>
              <button
                onClick={closeQRModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            {qrCode ? (
              <div className="space-y-4">
                <div className="flex justify-center bg-white p-4 rounded-xl">
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
                <p className="text-sm text-gray-400">
                  Escaneie este código QR com seu WhatsApp para conectar a sessão.
                </p>
                <div className="flex items-center justify-center space-x-2">
                  {qrStatus === 'qr_ready' || qrStatus === 'qr' ? (
                    <>
                      <QrCodeIcon className="h-5 w-5 text-blue-400 animate-pulse" />
                      <span className="text-sm font-medium text-blue-400">Aguardando leitura do QR...</span>
                    </>
                  ) : qrStatus === 'connecting' ? (
                    <>
                      <ClockIcon className="h-5 w-5 text-yellow-400 animate-spin" />
                      <span className="text-sm font-medium text-yellow-400">Conectando...</span>
                    </>
                  ) : qrStatus === 'connected' ? (
                    <>
                      <CheckCircleIcon className="h-5 w-5 text-green-400" />
                      <span className="text-sm font-medium text-green-400">Conectado com sucesso!</span>
                    </>
                  ) : (
                    <>
                      <QrCodeIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-400">{qrStatus || 'Aguardando conexão...'}</span>
                    </>
                  )}
                </div>
                
                {/* Botão para atualizar QR manualmente */}
                <button
                  onClick={() => getQRCode(selectedSession.id)}
                  className="w-full px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-all duration-300 text-sm"
                >
                  <ArrowPathIcon className="h-4 w-4 inline mr-2" />
                  Atualizar QR Code
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center items-center bg-slate-700 p-8 rounded-xl h-64">
                  <div className="text-center">
                    <ClockIcon className="h-12 w-12 text-yellow-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Gerando QR Code...</p>
                    <p className="text-xs text-gray-500 mt-2">Isso pode levar alguns segundos</p>
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={closeQRModal}
              className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
