import React, { useState, useEffect } from 'react';
import { 
  PlusIcon,
  QueueListIcon,
  UserGroupIcon,
  TicketIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function QueuesComponent() {
  const { user } = useAuth();
  const [queues, setQueues] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQueue, setEditingQueue] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editQueueName, setEditQueueName] = useState('');
  const [editSessionId, setEditSessionId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    greetingMessage: '',
    outOfHoursMessage: '',
    isActive: true,
    sessionId: ''
  });
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    fetchQueues();
    fetchUsers();
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
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
    }
  };

  const fetchQueues = async () => {
    try {
      setLoading(true);
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

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.sessionId) {
      alert('Selecione uma sessão para a fila.');
      return;
    }
    try {
      const url = editingQueue 
        ? `${API_URL}/api/queues/${editingQueue.id}`
        : `${API_URL}/api/queues`;
      const method = editingQueue ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        await fetchQueues();
        handleCloseModal();
      }
    } catch (error) {
      console.error('Erro ao salvar fila:', error);
    }
  };

  const handleDelete = async (queueId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta fila?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/queues/${queueId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await fetchQueues();
      }
    } catch (error) {
      console.error('Erro ao excluir fila:', error);
    }
  };

  const handleEdit = (queue) => {
    setEditingQueue(queue);
    setFormData({
      name: queue.name,
      color: queue.color || '#3B82F6',
      greetingMessage: queue.greetingMessage || '',
      outOfHoursMessage: queue.outOfHoursMessage || '',
      isActive: queue.isActive,
      sessionId: queue.sessionId || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingQueue(null);
    setFormData({
      name: '',
      color: '#3B82F6',
      greetingMessage: '',
      outOfHoursMessage: '',
      isActive: true,
      sessionId: ''
    });
  };

  const assignUserToQueue = async (queueId, userId) => {
    try {
      const response = await fetch(`${API_URL}/api/queues/${queueId}/assign-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        await fetchQueues();
      }
    } catch (error) {
      console.error('Erro ao vincular usuário à fila:', error);
    }
  };

  const removeUserFromQueue = async (queueId, userId) => {
    try {
      const response = await fetch(`${API_URL}/api/queues/${queueId}/remove-user`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        await fetchQueues();
      }
    } catch (error) {
      console.error('Erro ao remover usuário da fila:', error);
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

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Gerenciamento de Filas</h1>
            <p className="text-slate-400">Organize e distribua atendimentos por departamentos</p>
          </div>
          
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-yellow-500 text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nova Fila</span>
          </button>
        </div>

        {/* Queues Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {queues.map(queue => (
              <div key={queue.id} className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                {/* Queue Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: queue.color }}
                    ></div>
                    <h3 className="text-white font-semibold">{queue.name}</h3>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(queue)}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(queue.id)}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Queue Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-yellow-400 text-lg font-semibold">
                      {queue._count?.waitingTickets || 0}
                    </div>
                    <div className="text-slate-400 text-xs">Aguardando</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 text-lg font-semibold">
                      {queue._count?.activeTickets || 0}
                    </div>
                    <div className="text-slate-400 text-xs">Ativos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 text-lg font-semibold">
                      {queue._count?.resolvedTickets || 0}
                    </div>
                    <div className="text-slate-400 text-xs">Resolvidos</div>
                  </div>
                </div>

                {/* Queue Users */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <UsersIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300 text-sm">Agentes</span>
                  </div>
                  
                  <div className="space-y-2">
                    {queue.Users?.map(user => (
                      <div key={user.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{user.name}</span>
                        <button
                          onClick={() => removeUserFromQueue(queue.id, user.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Add User Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          assignUserToQueue(queue.id, parseInt(e.target.value));
                          e.target.value = '';
                        }
                      }}
                      className="w-full bg-slate-700 text-white text-sm px-2 py-1 rounded border border-slate-600 focus:outline-none focus:border-yellow-500"
                    >
                      <option value="">+ Adicionar agente</option>
                      {users
                        .filter(user => !queue.Users?.some(qu => qu.id === user.id))
                        .map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                {/* Queue Status */}
                <div className="flex items-center justify-between">
                  <div className={`flex items-center space-x-1 text-sm ${queue.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {queue.isActive ? (
                      <CheckCircleIcon className="w-4 h-4" />
                    ) : (
                      <XMarkIcon className="w-4 h-4" />
                    )}
                    <span>{queue.isActive ? 'Ativa' : 'Inativa'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && queues.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <QueueListIcon className="h-10 w-10 text-slate-900" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Nenhuma fila criada</h3>
            <p className="text-slate-400 mb-8">Comece criando sua primeira fila de atendimento.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-yellow-500 text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-yellow-400 transition-colors"
            >
              Criar primeira fila
            </button>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-lg font-semibold">
                  {editingQueue ? 'Editar Fila' : 'Nova Fila'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1">Sessão</label>
                  <select
                    value={formData.sessionId}
                    onChange={e => setFormData({ ...formData, sessionId: e.target.value })}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-yellow-500"
                    required
                  >
                    <option value="">Selecione uma sessão</option>
                    {sessions.map(session => (
                      <option key={session.id} value={session.id}>{session.name || session.id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1">Nome da Fila</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-yellow-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1">Cor</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 bg-slate-700 rounded border border-slate-600 focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1">Mensagem de Saudação</label>
                  <textarea
                    value={formData.greetingMessage}
                    onChange={(e) => setFormData({ ...formData, greetingMessage: e.target.value })}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-yellow-500"
                    rows="3"
                    placeholder="Mensagem enviada quando um cliente entra na fila..."
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1">Mensagem Fora do Horário</label>
                  <textarea
                    value={formData.outOfHoursMessage}
                    onChange={(e) => setFormData({ ...formData, outOfHoursMessage: e.target.value })}
                    className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-yellow-500"
                    rows="3"
                    placeholder="Mensagem enviada fora do horário de atendimento..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-slate-300 text-sm">Fila ativa</label>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-yellow-500 text-slate-900 rounded hover:bg-yellow-400 transition-colors font-medium"
                  >
                    {editingQueue ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
