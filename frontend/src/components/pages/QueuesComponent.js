import React, { useState, useEffect } from 'react';
import { 
  PlusIcon,
  QueueListIcon,
  UserGroupIcon,
  TicketIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function QueuesComponent() {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editQueueName, setEditQueueName] = useState('');
  const [editSessionId, setEditSessionId] = useState('');

  useEffect(() => {
    fetchQueues();
    fetchSessions();
  }, []);

  const fetchQueues = async () => {
    try {
      const response = await fetch(`${API_URL}/api/queues`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setQueues(data);
      }
    } catch (error) {
      console.error('Erro ao buscar filas:', error);
    } finally {
      setLoading(false);
    }
  };

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
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
    }
  };

  const createQueue = async () => {
    if (!newQueueName.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/queues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: newQueueName.trim(),
          sessionId: selectedSessionId || null
        })
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewQueueName('');
        setSelectedSessionId('');
        fetchQueues();
      }
    } catch (error) {
      console.error('Erro ao criar fila:', error);
    }
  };

  const deleteQueue = async (queueId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta fila?')) return;

    try {
      const response = await fetch(`${API_URL}/api/queues/${queueId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchQueues();
      }
    } catch (error) {
      console.error('Erro ao excluir fila:', error);
    }
  };

  const handleManageQueue = (queue) => {
    setSelectedQueue(queue);
    setShowManageModal(true);
  };

  const handleEditQueue = (queue) => {
    setSelectedQueue(queue);
    setEditQueueName(queue.name);
    setEditSessionId(queue.sessionId || '');
    setShowEditModal(true);
  };

  const updateQueue = async () => {
    if (!editQueueName.trim() || !selectedQueue) return;

    try {
      const response = await fetch(`${API_URL}/api/queues/${selectedQueue.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: editQueueName.trim(),
          sessionId: editSessionId || null
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedQueue(null);
        setEditQueueName('');
        setEditSessionId('');
        fetchQueues();
      }
    } catch (error) {
      console.error('Erro ao atualizar fila:', error);
    }
  };

  const handleViewTickets = (queue) => {
    // Implementar navegação para tickets da fila
    console.log('Ver tickets da fila:', queue.name);
    // Aqui você pode implementar a navegação para uma página de tickets filtrados por fila
    // navigate(`/tickets?queue=${queue.id}`);
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Filas de Atendimento</h1>
          <p className="text-gray-400">Organize o atendimento em filas especializadas</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 px-6 py-3 rounded-xl flex items-center space-x-2 hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-lg font-semibold"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nova Fila</span>
        </button>
      </div>

      {/* Queues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {queues.map((queue) => (
          <div key={queue.id} className="bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700 hover:border-yellow-500 transition-all duration-200">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                  <QueueListIcon className="h-6 w-6 text-gray-900" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">{queue.name}</h3>
                  <p className="text-sm text-gray-400">
                    Criada em {new Date(queue.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleEditQueue(queue)}
                  className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-gray-700 rounded-lg transition-all duration-200"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => deleteQueue(queue.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-lg transition-all duration-200"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-700 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {queue.ticketCount || 0}
                </div>
                <div className="text-xs text-gray-400 font-medium">Tickets</div>
              </div>
              <div className="bg-gray-700 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {queue.userCount || 0}
                </div>
                <div className="text-xs text-gray-400 font-medium">Usuários</div>
              </div>
            </div>

            {queue.session && (
              <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 p-4 rounded-xl mb-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-yellow-400">
                    Sessão: {queue.session.name}
                  </span>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button 
                onClick={() => handleManageQueue(queue)}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 py-3 px-4 rounded-xl font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
              >
                <UserGroupIcon className="h-5 w-5" />
                <span>Gerenciar</span>
              </button>
              <button 
                onClick={() => handleViewTickets(queue)}
                className="flex-1 bg-gray-700 text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-600 transition-all duration-200 flex items-center justify-center space-x-2 border border-gray-600"
              >
                <TicketIcon className="h-5 w-5" />
                <span>Tickets</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {queues.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <QueueListIcon className="h-10 w-10 text-gray-900" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">Nenhuma fila criada</h3>
          <p className="text-gray-400 mb-8">Comece criando sua primeira fila de atendimento.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 px-6 py-3 rounded-xl font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-lg"
          >
            Criar primeira fila
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-8 border border-gray-700 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-white">Nova Fila</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome da Fila
                </label>
                <input
                  type="text"
                  value={newQueueName}
                  onChange={(e) => setNewQueueName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  placeholder="Ex: Suporte Técnico"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sessão WhatsApp (opcional)
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Selecione uma sessão</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={createQueue}
                disabled={!newQueueName.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 rounded-xl font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Modal */}
      {showManageModal && selectedQueue && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl max-w-2xl w-full p-8 border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Gerenciar Fila: {selectedQueue.name}</h2>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-700 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-yellow-500 mb-2">
                  {selectedQueue.ticketCount || 0}
                </div>
                <div className="text-gray-300 font-medium">Total de Tickets</div>
              </div>
              <div className="bg-gray-700 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-yellow-500 mb-2">
                  {selectedQueue.userCount || 0}
                </div>
                <div className="text-gray-300 font-medium">Usuários Ativos</div>
              </div>
              <div className="bg-gray-700 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-yellow-500 mb-2">
                  {selectedQueue.session ? 'Ativa' : 'Inativa'}
                </div>
                <div className="text-gray-300 font-medium">Sessão WhatsApp</div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Ações da Fila</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => handleEditQueue(selectedQueue)}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 py-3 px-6 rounded-xl font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <PencilIcon className="h-5 w-5" />
                  <span>Editar Fila</span>
                </button>
                
                <button 
                  onClick={() => handleViewTickets(selectedQueue)}
                  className="bg-gray-700 text-white py-3 px-6 rounded-xl font-medium hover:bg-gray-600 transition-all duration-200 flex items-center justify-center space-x-2 border border-gray-600"
                >
                  <TicketIcon className="h-5 w-5" />
                  <span>Ver Tickets</span>
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700">
              <button
                onClick={() => setShowManageModal(false)}
                className="w-full px-6 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-8 border border-gray-700 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-white">Editar Fila</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome da Fila
                </label>
                <input
                  type="text"
                  value={editQueueName}
                  onChange={(e) => setEditQueueName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  placeholder="Ex: Suporte Técnico"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sessão WhatsApp
                </label>
                <select
                  value={editSessionId}
                  onChange={(e) => setEditSessionId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Nenhuma sessão</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-6 py-3 border border-gray-600 text-gray-300 rounded-xl hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={updateQueue}
                disabled={!editQueueName.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 rounded-xl font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
