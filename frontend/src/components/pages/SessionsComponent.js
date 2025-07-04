import React, { useState, useEffect } from 'react';
import { 
  PhoneIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  PlusIcon,
  TrashIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function SessionsComponent() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', number: '', type: 'baileys' });
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      } else {
        setError('Erro ao carregar sessões');
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newSession)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewSession({ name: '', number: '', type: 'baileys' });
        fetchSessions();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erro ao criar sessão');
      }
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      setError('Erro ao conectar com o servidor');
    }
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta sessão?')) return;

    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchSessions();
      } else {
        setError('Erro ao excluir sessão');
      }
    } catch (error) {
      console.error('Erro ao excluir sessão:', error);
      setError('Erro ao conectar com o servidor');
    }
  };

  const getQRCode = async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/qr`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
      } else {
        setError('Erro ao obter QR Code');
      }
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      setError('Erro ao conectar com o servidor');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'disconnected':
        return <XCircleIcon className="h-5 w-5 text-red-400" />;
      case 'connecting':
        return <ClockIcon className="h-5 w-5 text-yellow-400" />;
      default:
        return <XCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'disconnected':
        return 'Desconectado';
      case 'connecting':
        return 'Conectando';
      default:
        return 'Desconhecido';
    }
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
            <h1 className="text-3xl font-bold text-white">Sessões WhatsApp</h1>
            <p className="text-gray-400 mt-1">Gerencie suas conexões WhatsApp</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 px-6 py-3 rounded-xl flex items-center space-x-2 hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Nova Sessão</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl backdrop-blur-sm">
          {error}
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
                  <h3 className="font-semibold text-white">{session.name}</h3>
                  <p className="text-sm text-gray-400">{session.number}</p>
                  <div className="flex items-center mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      session.type === 'baileys' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {session.type === 'baileys' ? 'Baileys' : 'WhatsApp.js'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-slate-700 px-3 py-1 rounded-full">
                {getStatusIcon(session.status)}
                <span className="text-sm font-medium text-white">{getStatusText(session.status)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-gray-400 bg-slate-700/50 p-3 rounded-lg">
                <p><strong className="text-gray-300">Tipo:</strong> {session.type === 'baileys' ? 'Baileys' : 'WhatsApp.js'}</p>
                <p><strong className="text-gray-300">Criado em:</strong> {new Date(session.createdAt).toLocaleDateString()}</p>
                {session.lastActivity && (
                  <p><strong className="text-gray-300">Última atividade:</strong> {new Date(session.lastActivity).toLocaleDateString()}</p>
                )}
              </div>

              <div className="flex space-x-2">
                {session.status === 'disconnected' && (
                  <button
                    onClick={() => getQRCode(session.id)}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-2 rounded-lg text-sm hover:from-green-700 hover:to-green-800 transition-all duration-300 flex items-center justify-center space-x-1 shadow-lg"
                  >
                    <QrCodeIcon className="h-4 w-4" />
                    <span>Conectar</span>
                  </button>
                )}
                <button
                  onClick={() => deleteSession(session.id)}
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 py-2 rounded-lg text-sm hover:from-red-700 hover:to-red-800 transition-all duration-300 flex items-center space-x-1 shadow-lg"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Excluir</span>
                </button>
              </div>
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
                  Nome da Sessão
                </label>
                <input
                  type="text"
                  value={newSession.name}
                  onChange={(e) => setNewSession({...newSession, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
                  placeholder="Ex: Atendimento Principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo de Conexão
                </label>
                <select
                  value={newSession.type}
                  onChange={(e) => setNewSession({...newSession, type: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="baileys">Baileys (Recomendado)</option>
                  <option value="whatsappjs">WhatsApp.js</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {newSession.type === 'baileys' 
                    ? 'Baileys: Mais estável e com melhor suporte a recursos' 
                    : 'WhatsApp.js: Baseado no navegador, mais simples'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Número (opcional)
                </label>
                <input
                  type="text"
                  value={newSession.number}
                  onChange={(e) => setNewSession({...newSession, number: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-300"
                  placeholder="Ex: +55 11 99999-9999"
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
                disabled={!newSession.name}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrCode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl max-w-md w-full p-6 text-center border border-slate-700 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-white">Scan QR Code</h2>
            <div className="flex justify-center mb-6 bg-white p-4 rounded-xl">
              <img src={qrCode} alt="QR Code" className="max-w-full" />
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Escaneie este código QR com seu WhatsApp para conectar a sessão.
            </p>
            <button
              onClick={() => setQrCode('')}
              className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
