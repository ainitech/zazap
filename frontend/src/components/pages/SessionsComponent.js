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
  const [newSession, setNewSession] = useState({ name: '', number: '' });
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
        setNewSession({ name: '', number: '' });
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
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'disconnected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'connecting':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircleIcon className="h-5 w-5 text-gray-400" />;
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
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sessões WhatsApp</h1>
            <p className="text-gray-600 mt-1">Gerencie suas conexões WhatsApp</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Nova Sessão</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <div key={session.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <PhoneIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">{session.name}</h3>
                  <p className="text-sm text-gray-600">{session.number}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(session.status)}
                <span className="text-sm font-medium">{getStatusText(session.status)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <p><strong>Criado em:</strong> {new Date(session.createdAt).toLocaleDateString()}</p>
                {session.lastActivity && (
                  <p><strong>Última atividade:</strong> {new Date(session.lastActivity).toLocaleDateString()}</p>
                )}
              </div>

              <div className="flex space-x-2">
                {session.status === 'disconnected' && (
                  <button
                    onClick={() => getQRCode(session.id)}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors flex items-center justify-center space-x-1"
                  >
                    <QrCodeIcon className="h-4 w-4" />
                    <span>Conectar</span>
                  </button>
                )}
                <button
                  onClick={() => deleteSession(session.id)}
                  className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors flex items-center space-x-1"
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
          <PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma sessão encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">Comece criando uma nova sessão WhatsApp.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar primeira sessão
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Nova Sessão WhatsApp</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Sessão
                </label>
                <input
                  type="text"
                  value={newSession.name}
                  onChange={(e) => setNewSession({...newSession, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Atendimento Principal"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número (opcional)
                </label>
                <input
                  type="text"
                  value={newSession.number}
                  onChange={(e) => setNewSession({...newSession, number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: +55 11 99999-9999"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createSession}
                disabled={!newSession.name}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
            <h2 className="text-xl font-bold mb-4">Scan QR Code</h2>
            <div className="flex justify-center mb-4">
              <img src={qrCode} alt="QR Code" className="max-w-full" />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Escaneie este código QR com seu WhatsApp para conectar a sessão.
            </p>
            <button
              onClick={() => setQrCode('')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
