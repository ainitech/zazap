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
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  ColorSwatchIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  InboxStackIcon,
  AdjustmentsHorizontalIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckIcon,
  PowerIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  EllipsisVerticalIcon,
  DocumentDuplicateIcon,
  ArrowRightIcon,
  EyeIcon,
  BellIcon,
  PauseIcon,
  PlayIcon,
  ArrowsUpDownIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

// Import dos novos modais
import QueueTransferModal from '../modals/QueueTransferModal';
import QueueDuplicateModal from '../modals/QueueDuplicateModal';
import QueuePerformanceModal from '../modals/QueuePerformanceModal';
import QueueAdvancedSettingsModal from '../modals/QueueAdvancedSettingsModal';
import QueueActivityPanel from '../panels/QueueActivityPanel';
import QueueMetricsBar from '../metrics/QueueMetricsBar';

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
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  
  // Novos estados para modais avançados
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showAdvancedSettingsModal, setShowAdvancedSettingsModal] = useState(false);
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [selectedQueueForAction, setSelectedQueueForAction] = useState(null);
  
  const [editQueueName, setEditQueueName] = useState('');
  const [editSessionId, setEditSessionId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedQueues, setSelectedQueues] = useState([]);
  const [queueStats, setQueueStats] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#0420BF',
    greetingMessage: '',
    outOfHoursMessage: '',
    isActive: true,
    sessionId: '',
    botOrder: 0,
    closeTicket: false,
    rotation: 'round-robin',
    integration: 'whatsapp',
    fileList: [],
    options: {
      autoAssign: true,
      maxTicketsPerUser: 5,
      workingHours: {
        start: '08:00',
        end: '18:00'
      },
      autoReply: false,
      transferToHuman: true,
      collectFeedback: false
    }
  });
  const [sessions, setSessions] = useState([]);

  const rotationOptions = [
    { value: 'round-robin', label: 'Round Robin', description: 'Distribui tickets igualmente entre agentes' },
    { value: 'random', label: 'Aleatório', description: 'Escolhe agente aleatoriamente' },
    { value: 'fifo', label: 'Primeiro a chegar', description: 'Primeiro agente disponível recebe ticket' },
    { value: 'load-based', label: 'Baseado em carga', description: 'Agente com menos tickets ativos' }
  ];

  const integrationOptions = [
    { value: 'whatsapp', label: 'WhatsApp', description: 'Integração com WhatsApp Business' },
    { value: 'telegram', label: 'Telegram', description: 'Bot do Telegram' },
    { value: 'facebook', label: 'Facebook', description: 'Facebook Messenger' },
    { value: 'instagram', label: 'Instagram', description: 'Instagram Direct' },
    { value: 'webchat', label: 'Web Chat', description: 'Chat integrado no site' }
  ];

  const allowedFileTypes = [
    'pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'txt', 'mp3', 'mp4', 'avi', 'zip', 'xlsx', 'csv'
  ];

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

  // Novas funções de gerenciamento avançado
  const fetchQueueStats = async (queueId) => {
    try {
      const response = await fetch(`${API_URL}/api/queues/${queueId}/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setQueueStats(data);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const duplicateQueue = async (queue) => {
    try {
      const duplicatedData = {
        ...queue,
        name: `${queue.name} (Cópia)`,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined
      };
      
      const response = await fetch(`${API_URL}/api/queues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(duplicatedData)
      });
      
      if (response.ok) {
        await fetchQueues();
        alert('Fila duplicada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao duplicar fila:', error);
      alert('Erro ao duplicar fila');
    }
  };

  const toggleQueueStatus = async (queueId, currentStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/queues/${queueId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      
      if (response.ok) {
        await fetchQueues();
      }
    } catch (error) {
      console.error('Erro ao alterar status da fila:', error);
    }
  };

  const archiveQueue = async (queueId) => {
    if (!window.confirm('Tem certeza que deseja arquivar esta fila? Ela ficará inativa e oculta da lista principal.')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/queues/${queueId}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        await fetchQueues();
        alert('Fila arquivada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao arquivar fila:', error);
      alert('Erro ao arquivar fila');
    }
  };

  const bulkAction = async (action) => {
    if (selectedQueues.length === 0) {
      alert('Selecione pelo menos uma fila para executar a ação.');
      return;
    }

    const confirmMessage = {
      'activate': 'Ativar filas selecionadas?',
      'deactivate': 'Desativar filas selecionadas?',
      'delete': 'Excluir filas selecionadas? Esta ação não pode ser desfeita.',
      'archive': 'Arquivar filas selecionadas?'
    };

    if (!window.confirm(confirmMessage[action])) return;

    try {
      const response = await fetch(`${API_URL}/api/queues/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action,
          queueIds: selectedQueues
        })
      });

      if (response.ok) {
        await fetchQueues();
        setSelectedQueues([]);
        alert(`Ação executada com sucesso em ${selectedQueues.length} fila(s)!`);
      }
    } catch (error) {
      console.error('Erro na ação em lote:', error);
      alert('Erro ao executar ação em lote');
    }
  };

  // Funções de filtro e ordenação
  const filteredQueues = queues.filter(queue => {
    const matchesSearch = queue.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && queue.isActive) ||
      (filterStatus === 'inactive' && !queue.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const sortedQueues = [...filteredQueues].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    if (sortBy === 'name') {
      aValue = aValue?.toLowerCase() || '';
      bValue = bValue?.toLowerCase() || '';
    }

    if (sortBy === 'botOrder') {
      aValue = aValue || 0;
      bValue = bValue || 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleQueueSelection = (queueId) => {
    setSelectedQueues(prev => 
      prev.includes(queueId) 
        ? prev.filter(id => id !== queueId)
        : [...prev, queueId]
    );
  };

  const selectAllQueues = () => {
    if (selectedQueues.length === sortedQueues.length) {
      setSelectedQueues([]);
    } else {
      setSelectedQueues(sortedQueues.map(q => q.id));
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
      color: queue.color || '#0420BF',
      greetingMessage: queue.greetingMessage || '',
      outOfHoursMessage: queue.outOfHoursMessage || '',
      isActive: queue.isActive,
      sessionId: queue.sessionId || '',
      botOrder: queue.botOrder || 0,
      closeTicket: queue.closeTicket || false,
      rotation: queue.rotation || 'round-robin',
      integration: queue.integration || 'whatsapp',
      fileList: queue.fileList || [],
      options: queue.options || {
        autoAssign: true,
        maxTicketsPerUser: 5,
        workingHours: {
          start: '08:00',
          end: '18:00'
        }
      }
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingQueue(null);
    setFormData({
      name: '',
      color: '#0420BF',
      greetingMessage: '',
      outOfHoursMessage: '',
      isActive: true,
      sessionId: '',
      botOrder: 0,
      closeTicket: false,
      rotation: 'round-robin',
      integration: 'whatsapp',
      fileList: [],
      options: {
        autoAssign: true,
        maxTicketsPerUser: 5,
        workingHours: {
          start: '08:00',
          end: '18:00'
        },
        autoReply: false,
        transferToHuman: true,
        collectFeedback: false
      }
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

  // Novas funções para funcionalidades avançadas
  const handleTransferTicket = async (data) => {
    try {
      const response = await fetch(`${API_URL}/api/queues/${selectedQueueForAction.id}/transfer-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        alert('Ticket transferido com sucesso!');
        setShowTransferModal(false);
        setSelectedQueueForAction(null);
      } else {
        const error = await response.json();
        alert(`Erro: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao transferir ticket:', error);
      alert('Erro ao transferir ticket');
    }
  };

  const handleDuplicateQueue = async (data) => {
    try {
      const response = await fetch(`${API_URL}/api/queues/${selectedQueueForAction.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        alert('Fila duplicada com sucesso!');
        setShowDuplicateModal(false);
        setSelectedQueueForAction(null);
        fetchQueues();
      } else {
        const error = await response.json();
        alert(`Erro: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao duplicar fila:', error);
      alert('Erro ao duplicar fila');
    }
  };

  const openTransferModal = (queue) => {
    setSelectedQueueForAction(queue);
    setShowTransferModal(true);
  };

  const openDuplicateModal = (queue) => {
    setSelectedQueueForAction(queue);
    setShowDuplicateModal(true);
  };

  const openPerformanceModal = (queue) => {
    setSelectedQueueForAction(queue);
    setShowPerformanceModal(true);
  };

  const openAdvancedSettingsModal = (queue) => {
    setSelectedQueueForAction(queue);
    setShowAdvancedSettingsModal(true);
  };

  const handleAdvancedSettingsSave = async (settings) => {
    try {
      const response = await fetch(`${API_URL}/api/queues/${selectedQueueForAction.id}/advanced-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        alert('Configurações salvas com sucesso!');
        setShowAdvancedSettingsModal(false);
        setSelectedQueueForAction(null);
        fetchQueues();
      } else {
        const error = await response.json();
        alert(`Erro: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
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
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowHelpModal(true)}
              className="flex items-center space-x-2 bg-slate-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-600 transition-colors"
            >
              <QuestionMarkCircleIcon className="w-5 h-5" />
              <span>Ajuda</span>
            </button>
            <button
              onClick={() => setShowActivityPanel(true)}
              className="flex items-center space-x-2 bg-slate-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-600 transition-colors"
            >
              <BellIcon className="w-5 h-5" />
              <span>Atividades</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 bg-yellow-500 text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Nova Fila</span>
            </button>
          </div>
        </div>

        {/* Metrics Bar */}
        <QueueMetricsBar queues={filteredQueues} />

        {/* Toolbar */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar filas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 custom-input w-full sm:w-64"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 custom-input"
              >
                <option value="all">Todas as filas</option>
                <option value="active">Apenas ativas</option>
                <option value="inactive">Apenas inativas</option>
              </select>

              <div className="flex items-center space-x-2">
                <FunnelIcon className="w-4 h-4 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 custom-input"
                >
                  <option value="name">Ordenar por nome</option>
                  <option value="botOrder">Ordenar por ordem</option>
                  <option value="createdAt">Ordenar por data</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 bg-slate-700 text-white rounded-lg border border-slate-600 hover:bg-slate-600 transition-colors"
                >
                  <ArrowsUpDownIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center space-x-3">
              {selectedQueues.length > 0 && (
                <div className="flex items-center space-x-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
                  <span className="text-yellow-400 text-sm font-medium">
                    {selectedQueues.length} selecionada(s)
                  </span>
                  
                  <button
                    onClick={() => bulkAction('activate')}
                    className="p-1 text-green-400 hover:text-green-300 transition-colors tooltip"
                    data-tooltip="Ativar selecionadas"
                  >
                    <PlayIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => bulkAction('deactivate')}
                    className="p-1 text-orange-400 hover:text-orange-300 transition-colors tooltip"
                    data-tooltip="Desativar selecionadas"
                  >
                    <PauseIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => bulkAction('archive')}
                    className="p-1 text-blue-400 hover:text-blue-300 transition-colors tooltip"
                    data-tooltip="Arquivar selecionadas"
                  >
                    <ArchiveBoxIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => bulkAction('delete')}
                    className="p-1 text-red-400 hover:text-red-300 transition-colors tooltip"
                    data-tooltip="Excluir selecionadas"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                onClick={selectAllQueues}
                className="flex items-center space-x-2 px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 hover:bg-slate-600 transition-colors"
              >
                <ClipboardDocumentListIcon className="w-4 h-4" />
                <span>{selectedQueues.length === sortedQueues.length ? 'Desmarcar' : 'Selecionar'} todas</span>
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{queues.length}</div>
                <div className="text-sm text-slate-400">Total de Filas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{queues.filter(q => q.isActive).length}</div>
                <div className="text-sm text-slate-400">Filas Ativas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {queues.reduce((acc, q) => acc + (q._count?.waitingTickets || 0), 0)}
                </div>
                <div className="text-sm text-slate-400">Tickets Aguardando</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {queues.reduce((acc, q) => acc + (q.Users?.length || 0), 0)}
                </div>
                <div className="text-sm text-slate-400">Agentes Vinculados</div>
              </div>
            </div>
          </div>
        </div>

        {/* Queues Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          <div className="grid-auto-fit">
            {sortedQueues.map(queue => (
              <div key={queue.id} className="bg-slate-800 rounded-lg border border-slate-700 p-6 card-hover fade-in relative">
                {/* Selection Checkbox */}
                <div className="absolute top-4 right-4">
                  <input
                    type="checkbox"
                    checked={selectedQueues.includes(queue.id)}
                    onChange={() => toggleQueueSelection(queue.id)}
                    className="custom-checkbox"
                  />
                </div>

                {/* Queue Header */}
                <div className="flex items-center justify-between mb-4 mr-8">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-5 h-5 rounded-full border-2 border-white/20 shadow-lg"
                      style={{ backgroundColor: queue.color || '#0420BF' }}
                    ></div>
                    <div>
                      <h3 className="text-white font-semibold">{queue.name}</h3>
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <span>Ordem: {queue.botOrder || 0}</span>
                        <span>•</span>
                        <span className="capitalize">{queue.rotation || 'round-robin'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setSelectedQueue(queue);
                        fetchQueueStats(queue.id);
                        setShowStatsModal(true);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-all tooltip"
                      data-tooltip="Ver estatísticas"
                    >
                      <ChartBarIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => duplicateQueue(queue)}
                      className="p-2 text-slate-400 hover:text-purple-400 hover:bg-slate-700 rounded transition-all tooltip"
                      data-tooltip="Duplicar fila"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openTransferModal(queue)}
                      className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded transition-all tooltip"
                      data-tooltip="Transferir ticket"
                    >
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openPerformanceModal(queue)}
                      className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded transition-all tooltip"
                      data-tooltip="Performance detalhada"
                    >
                      <ChartBarIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openAdvancedSettingsModal(queue)}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-all tooltip"
                      data-tooltip="Configurações avançadas"
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleQueueStatus(queue.id, queue.isActive)}
                      className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 rounded transition-all tooltip"
                      data-tooltip={queue.isActive ? 'Desativar' : 'Ativar'}
                    >
                      {queue.isActive ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(queue)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all tooltip"
                      data-tooltip="Editar fila"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => archiveQueue(queue.id)}
                      className="p-2 text-slate-400 hover:text-orange-400 hover:bg-slate-700 rounded transition-all tooltip"
                      data-tooltip="Arquivar fila"
                    >
                      <ArchiveBoxIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(queue.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-all tooltip"
                      data-tooltip="Excluir fila"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Integration Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="badge badge-primary">
                      {queue.integration || 'WhatsApp'}
                    </span>
                    {queue.closeTicket && (
                      <span className="badge badge-success">
                        Auto-close
                      </span>
                    )}
                  </div>
                  
                  <div className={`flex items-center space-x-1 text-sm ${queue.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {queue.isActive ? (
                      <CheckCircleIcon className="w-4 h-4" />
                    ) : (
                      <XMarkIcon className="w-4 h-4" />
                    )}
                    <span>{queue.isActive ? 'Ativa' : 'Inativa'}</span>
                  </div>
                </div>

                {/* Queue Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-yellow-500/30 transition-colors">
                    <div className="text-yellow-400 text-lg font-semibold">
                      {queue._count?.waitingTickets || 0}
                    </div>
                    <div className="text-slate-400 text-xs">Aguardando</div>
                  </div>
                  <div className="text-center p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-green-500/30 transition-colors">
                    <div className="text-green-400 text-lg font-semibold">
                      {queue._count?.activeTickets || 0}
                    </div>
                    <div className="text-slate-400 text-xs">Ativos</div>
                  </div>
                  <div className="text-center p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-blue-500/30 transition-colors">
                    <div className="text-blue-400 text-lg font-semibold">
                      {queue._count?.resolvedTickets || 0}
                    </div>
                    <div className="text-slate-400 text-xs">Resolvidos</div>
                  </div>
                </div>

                {/* Configuration Info */}
                {(queue.options?.maxTicketsPerUser || queue.fileList?.length > 0) && (
                  <div className="mb-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <div className="flex items-center space-x-2 mb-2">
                      <AdjustmentsHorizontalIcon className="w-4 h-4 text-yellow-500" />
                      <span className="text-slate-300 text-sm font-medium">Configurações</span>
                    </div>
                    
                    {queue.options?.maxTicketsPerUser && (
                      <div className="text-xs text-slate-400 mb-1">
                        <span className="font-medium">Máx. {queue.options.maxTicketsPerUser}</span> tickets/agente
                      </div>
                    )}
                    
                    {queue.options?.workingHours && (
                      <div className="text-xs text-slate-400 mb-1">
                        <span className="font-medium">Horário:</span> {queue.options.workingHours.start} - {queue.options.workingHours.end}
                      </div>
                    )}
                    
                    {queue.fileList?.length > 0 && (
                      <div className="text-xs text-slate-400">
                        <span className="font-medium">Arquivos:</span> {queue.fileList.slice(0, 3).join(', ')}
                        {queue.fileList.length > 3 && ` +${queue.fileList.length - 3}`}
                      </div>
                    )}
                  </div>
                )}

                {/* Greeting Message Preview */}
                {queue.greetingMessage && (
                  <div className="mb-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <div className="flex items-center space-x-2 mb-2">
                      <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-400" />
                      <span className="text-slate-300 text-sm font-medium">Saudação</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      "{queue.greetingMessage}"
                    </p>
                  </div>
                )}

                {/* Queue Users */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <UsersIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300 text-sm font-medium">
                      Agentes ({queue.Users?.length || 0})
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {queue.Users?.slice(0, 3).map(user => (
                      <div key={user.id} className="flex items-center justify-between text-sm bg-slate-700/40 rounded px-2 py-1">
                        <span className="text-slate-300">{user.name}</span>
                        <button
                          onClick={() => removeUserFromQueue(queue.id, user.id)}
                          className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-red-900/20 tooltip"
                          data-tooltip="Remover agente"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    
                    {queue.Users?.length > 3 && (
                      <div className="text-xs text-slate-400 text-center py-1">
                        +{queue.Users.length - 3} agente(s)
                      </div>
                    )}
                    
                    {/* Add User Dropdown */}
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          assignUserToQueue(queue.id, parseInt(e.target.value));
                          e.target.value = '';
                        }
                      }}
                      className="w-full bg-slate-700 text-white text-sm px-2 py-2 rounded border border-slate-600 custom-input transition-colors"
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

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <button
                    onClick={() => handleViewTickets(queue)}
                    className="flex items-center space-x-1 text-yellow-400 hover:text-yellow-300 transition-colors text-sm px-2 py-1 rounded hover:bg-yellow-900/20"
                  >
                    <TicketIcon className="w-4 h-4" />
                    <span>Ver Tickets</span>
                  </button>
                  
                  <button
                    onClick={() => handleEdit(queue)}
                    className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors text-sm px-2 py-1 rounded hover:bg-blue-900/20"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>Configurar</span>
                  </button>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-xl font-semibold">
                  {editingQueue ? 'Editar Fila' : 'Nova Fila'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
                  data-tooltip="Fechar"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informações Básicas */}
                  <div className="space-y-4">
                    <h3 className="text-white text-lg font-medium flex items-center">
                      <QueueListIcon className="w-5 h-5 mr-2 text-yellow-500" />
                      Informações Básicas
                    </h3>

                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Sessão *</label>
                      <select
                        value={formData.sessionId}
                        onChange={e => setFormData({ ...formData, sessionId: e.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 custom-input transition-colors"
                        required
                      >
                        <option value="">Selecione uma sessão</option>
                        {sessions.map(session => (
                          <option key={session.id} value={session.id}>{session.name || session.id}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Nome da Fila *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 custom-input transition-colors"
                        placeholder="Ex: Suporte Técnico"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Cor da Fila</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="color-picker"
                        />
                        <input
                          type="text"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="flex-1 bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 custom-input transition-colors"
                          placeholder="#0420BF"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Ordem no Bot</label>
                      <input
                        type="number"
                        value={formData.botOrder}
                        onChange={(e) => setFormData({ ...formData, botOrder: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 custom-input transition-colors"
                        min="0"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Configurações Avançadas */}
                  <div className="space-y-4">
                    <h3 className="text-white text-lg font-medium flex items-center">
                      <Cog6ToothIcon className="w-5 h-5 mr-2 text-yellow-500" />
                      Configurações
                    </h3>

                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Tipo de Rodízio</label>
                      <select
                        value={formData.rotation}
                        onChange={e => setFormData({ ...formData, rotation: e.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 custom-input transition-colors"
                      >
                        {rotationOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Integração</label>
                      <select
                        value={formData.integration}
                        onChange={e => setFormData({ ...formData, integration: e.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 custom-input transition-colors"
                      >
                        {integrationOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Máximo de Tickets por Usuário</label>
                      <input
                        type="number"
                        value={formData.options.maxTicketsPerUser}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          options: { 
                            ...formData.options, 
                            maxTicketsPerUser: parseInt(e.target.value) || 5 
                          } 
                        })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 custom-input transition-colors"
                        min="1"
                        max="20"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="custom-checkbox mr-3"
                        />
                        <label htmlFor="isActive" className="text-slate-300 text-sm">Fila ativa</label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="closeTicket"
                          checked={formData.closeTicket}
                          onChange={(e) => setFormData({ ...formData, closeTicket: e.target.checked })}
                          className="custom-checkbox mr-3"
                        />
                        <label htmlFor="closeTicket" className="text-slate-300 text-sm">Fechar ticket automaticamente</label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="autoAssign"
                          checked={formData.options.autoAssign}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            options: { 
                              ...formData.options, 
                              autoAssign: e.target.checked 
                            } 
                          })}
                          className="custom-checkbox mr-3"
                        />
                        <label htmlFor="autoAssign" className="text-slate-300 text-sm">Atribuição automática</label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="autoReply"
                          checked={formData.options.autoReply}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            options: { 
                              ...formData.options, 
                              autoReply: e.target.checked 
                            } 
                          })}
                          className="custom-checkbox mr-3"
                        />
                        <label htmlFor="autoReply" className="text-slate-300 text-sm">Resposta automática ativa</label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="transferToHuman"
                          checked={formData.options.transferToHuman}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            options: { 
                              ...formData.options, 
                              transferToHuman: e.target.checked 
                            } 
                          })}
                          className="custom-checkbox mr-3"
                        />
                        <label htmlFor="transferToHuman" className="text-slate-300 text-sm">Permitir transferência para humano</label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="collectFeedback"
                          checked={formData.options.collectFeedback}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            options: { 
                              ...formData.options, 
                              collectFeedback: e.target.checked 
                            } 
                          })}
                          className="custom-checkbox mr-3"
                        />
                        <label htmlFor="collectFeedback" className="text-slate-300 text-sm">Coletar feedback do cliente</label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configurações de Notificação */}
                <div className="space-y-4">
                  <h3 className="text-white text-lg font-medium flex items-center">
                    <BellIcon className="w-5 h-5 mr-2 text-yellow-500" />
                    Notificações e Alertas
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Tempo Limite de Resposta (minutos)</label>
                      <input
                        type="number"
                        value={formData.options.responseTimeLimit || 30}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          options: { 
                            ...formData.options, 
                            responseTimeLimit: parseInt(e.target.value) || 30 
                          } 
                        })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 custom-input transition-colors"
                        min="5"
                        max="240"
                        placeholder="30"
                      />
                      <p className="text-xs text-slate-400 mt-1">Tempo para alertar sobre tickets sem resposta</p>
                    </div>

                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Prioridade da Fila</label>
                      <select
                        value={formData.options.priority || 'normal'}
                        onChange={e => setFormData({ 
                          ...formData, 
                          options: { 
                            ...formData.options, 
                            priority: e.target.value 
                          } 
                        })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 custom-input transition-colors"
                      >
                        <option value="low">Baixa</option>
                        <option value="normal">Normal</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="notifyNewTicket"
                        checked={formData.options.notifyNewTicket !== false}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          options: { 
                            ...formData.options, 
                            notifyNewTicket: e.target.checked 
                          } 
                        })}
                        className="custom-checkbox mr-3"
                      />
                      <label htmlFor="notifyNewTicket" className="text-slate-300 text-sm">Notificar novos tickets</label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="notifyTimeouts"
                        checked={formData.options.notifyTimeouts !== false}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          options: { 
                            ...formData.options, 
                            notifyTimeouts: e.target.checked 
                          } 
                        })}
                        className="custom-checkbox mr-3"
                      />
                      <label htmlFor="notifyTimeouts" className="text-slate-300 text-sm">Alertar sobre timeouts</label>
                    </div>
                  </div>
                </div>

                {/* Mensagens e Horários */}
                <div className="space-y-4">
                  <h3 className="text-white text-lg font-medium flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-yellow-500" />
                    Mensagens e Horários
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Mensagem de Saudação</label>
                      <textarea
                        value={formData.greetingMessage}
                        onChange={(e) => setFormData({ ...formData, greetingMessage: e.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 custom-input transition-colors resize-none"
                        rows="3"
                        placeholder="Olá! Bem-vindo ao nosso atendimento. Como posso ajudá-lo?"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Mensagem Fora do Horário</label>
                      <textarea
                        value={formData.outOfHoursMessage}
                        onChange={(e) => setFormData({ ...formData, outOfHoursMessage: e.target.value })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 custom-input transition-colors resize-none"
                        rows="3"
                        placeholder="Nosso horário de atendimento é das 08h às 18h. Deixe sua mensagem que retornaremos em breve."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Horário de Início</label>
                      <input
                        type="time"
                        value={formData.options.workingHours.start}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          options: { 
                            ...formData.options, 
                            workingHours: { 
                              ...formData.options.workingHours, 
                              start: e.target.value 
                            } 
                          } 
                        })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 custom-input transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Horário de Fim</label>
                      <input
                        type="time"
                        value={formData.options.workingHours.end}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          options: { 
                            ...formData.options, 
                            workingHours: { 
                              ...formData.options.workingHours, 
                              end: e.target.value 
                            } 
                          } 
                        })}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 custom-input transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Tipos de Arquivo Permitidos */}
                <div className="space-y-4">
                  <h3 className="text-white text-lg font-medium flex items-center">
                    <DocumentTextIcon className="w-5 h-5 mr-2 text-yellow-500" />
                    Tipos de Arquivo Permitidos
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {allowedFileTypes.map(fileType => (
                      <div key={fileType} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`fileType-${fileType}`}
                          checked={formData.fileList.includes(fileType)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ 
                                ...formData, 
                                fileList: [...formData.fileList, fileType] 
                              });
                            } else {
                              setFormData({ 
                                ...formData, 
                                fileList: formData.fileList.filter(type => type !== fileType) 
                              });
                            }
                          }}
                          className="custom-checkbox mr-2"
                        />
                        <label htmlFor={`fileType-${fileType}`} className="text-slate-300 text-sm uppercase font-medium">
                          {fileType}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-700 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-yellow-500 text-slate-900 rounded-lg hover:bg-yellow-400 transition-colors font-medium"
                  >
                    {editingQueue ? 'Salvar Alterações' : 'Criar Fila'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Ajuda */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-xl font-semibold flex items-center">
                  <QuestionMarkCircleIcon className="w-6 h-6 mr-2 text-yellow-500" />
                  Guia de Gerenciamento de Filas
                </h2>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Seção: Conceitos Básicos */}
                <div className="space-y-4">
                  <h3 className="text-white text-lg font-medium flex items-center">
                    <QueueListIcon className="w-5 h-5 mr-2 text-blue-400" />
                    Conceitos Básicos
                  </h3>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-slate-300 mb-3">
                      <strong>O que são Filas?</strong><br/>
                      Filas são departamentos virtuais que organizam o atendimento ao cliente. Cada fila pode ter configurações específicas, agentes dedicados e regras de funcionamento únicas.
                    </p>
                    <ul className="text-slate-300 text-sm space-y-2 ml-4 list-disc">
                      <li><strong>Sessão:</strong> Conexão do WhatsApp/Telegram onde a fila será utilizada</li>
                      <li><strong>Cor:</strong> Identificação visual da fila na interface</li>
                      <li><strong>Ordem:</strong> Sequência de apresentação no menu do bot</li>
                      <li><strong>Status:</strong> Ativa/Inativa - controla se a fila aceita novos tickets</li>
                    </ul>
                  </div>
                </div>

                {/* Seção: Tipos de Rodízio */}
                <div className="space-y-4">
                  <h3 className="text-white text-lg font-medium flex items-center">
                    <ArrowPathIcon className="w-5 h-5 mr-2 text-green-400" />
                    Tipos de Rodízio
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rotationOptions.map(option => (
                      <div key={option.value} className="bg-slate-700/50 rounded-lg p-4">
                        <h4 className="text-white font-medium mb-2">{option.label}</h4>
                        <p className="text-slate-300 text-sm">{option.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seção: Integrações */}
                <div className="space-y-4">
                  <h3 className="text-white text-lg font-medium flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-purple-400" />
                    Tipos de Integração
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {integrationOptions.map(option => (
                      <div key={option.value} className="bg-slate-700/50 rounded-lg p-4">
                        <h4 className="text-white font-medium mb-2">{option.label}</h4>
                        <p className="text-slate-300 text-sm">{option.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seção: Configurações Avançadas */}
                <div className="space-y-4">
                  <h3 className="text-white text-lg font-medium flex items-center">
                    <Cog6ToothIcon className="w-5 h-5 mr-2 text-orange-400" />
                    Configurações Avançadas
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">Mensagens Automáticas</h4>
                      <ul className="text-slate-300 text-sm space-y-1 ml-4 list-disc">
                        <li><strong>Saudação:</strong> Enviada quando cliente entra na fila</li>
                        <li><strong>Fora do Horário:</strong> Enviada quando fila está fechada</li>
                      </ul>
                    </div>
                    
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">Controles de Fluxo</h4>
                      <ul className="text-slate-300 text-sm space-y-1 ml-4 list-disc">
                        <li><strong>Fechar Ticket Automaticamente:</strong> Fecha tickets resolvidos automaticamente</li>
                        <li><strong>Atribuição Automática:</strong> Distribui tickets automaticamente para agentes</li>
                        <li><strong>Máx. Tickets/Agente:</strong> Limite de tickets simultâneos por agente</li>
                      </ul>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">Tipos de Arquivo</h4>
                      <p className="text-slate-300 text-sm mb-2">
                        Configure quais tipos de arquivo os clientes podem enviar nesta fila:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {allowedFileTypes.map(type => (
                          <span key={type} className="badge badge-primary text-xs">{type.toUpperCase()}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção: Ações Rápidas */}
                <div className="space-y-4">
                  <h3 className="text-white text-lg font-medium flex items-center">
                    <BellIcon className="w-5 h-5 mr-2 text-red-400" />
                    Ações Disponíveis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">Ações Individuais</h4>
                      <ul className="text-slate-300 text-sm space-y-2">
                        <li className="flex items-center"><ChartBarIcon className="w-4 h-4 mr-2 text-blue-400" /> Ver estatísticas detalhadas</li>
                        <li className="flex items-center"><DocumentDuplicateIcon className="w-4 h-4 mr-2 text-purple-400" /> Duplicar fila com configurações</li>
                        <li className="flex items-center"><PlayIcon className="w-4 h-4 mr-2 text-green-400" /> Ativar/Desativar fila</li>
                        <li className="flex items-center"><ArchiveBoxIcon className="w-4 h-4 mr-2 text-orange-400" /> Arquivar fila</li>
                      </ul>
                    </div>
                    
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <h4 className="text-white font-medium mb-2">Ações em Lote</h4>
                      <ul className="text-slate-300 text-sm space-y-2">
                        <li className="flex items-center"><ClipboardDocumentListIcon className="w-4 h-4 mr-2 text-yellow-400" /> Selecionar múltiplas filas</li>
                        <li className="flex items-center"><PlayIcon className="w-4 h-4 mr-2 text-green-400" /> Ativar/Desativar em lote</li>
                        <li className="flex items-center"><ArchiveBoxIcon className="w-4 h-4 mr-2 text-orange-400" /> Arquivar múltiplas filas</li>
                        <li className="flex items-center"><TrashIcon className="w-4 h-4 mr-2 text-red-400" /> Excluir múltiplas filas</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Seção: Dicas */}
                <div className="space-y-4">
                  <h3 className="text-white text-lg font-medium flex items-center">
                    <ClockIcon className="w-5 h-5 mr-2 text-yellow-400" />
                    Dicas e Boas Práticas
                  </h3>
                  <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <ul className="text-slate-300 text-sm space-y-2">
                      <li>• <strong>Nomeação:</strong> Use nomes claros e descritivos para as filas (ex: "Suporte Técnico", "Vendas")</li>
                      <li>• <strong>Cores:</strong> Utilize cores consistentes para facilitar identificação visual</li>
                      <li>• <strong>Ordem:</strong> Organize as filas por prioridade ou frequência de uso</li>
                      <li>• <strong>Horários:</strong> Configure horários de funcionamento adequados para cada departamento</li>
                      <li>• <strong>Capacidade:</strong> Ajuste o limite de tickets por agente conforme a complexidade do atendimento</li>
                      <li>• <strong>Backup:</strong> Sempre duplique filas antes de fazer mudanças importantes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6 border-t border-slate-700">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-6 py-2 bg-yellow-500 text-slate-900 rounded-lg hover:bg-yellow-400 transition-colors font-medium"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Estatísticas */}
        {showStatsModal && selectedQueue && (
          <div className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-xl font-semibold flex items-center">
                  <ChartBarIcon className="w-6 h-6 mr-2 text-blue-400" />
                  Estatísticas - {selectedQueue.name}
                </h2>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Resumo Geral */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {selectedQueue._count?.waitingTickets || 0}
                    </div>
                    <div className="text-sm text-slate-400">Aguardando</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {selectedQueue._count?.activeTickets || 0}
                    </div>
                    <div className="text-sm text-slate-400">Em Andamento</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {selectedQueue._count?.resolvedTickets || 0}
                    </div>
                    <div className="text-sm text-slate-400">Resolvidos</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {selectedQueue.Users?.length || 0}
                    </div>
                    <div className="text-sm text-slate-400">Agentes</div>
                  </div>
                </div>

                {/* Configurações da Fila */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h3 className="text-white text-lg font-medium mb-4">Configurações Atuais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-400">Integração</div>
                      <div className="text-white font-medium capitalize">{selectedQueue.integration || 'WhatsApp'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Tipo de Rodízio</div>
                      <div className="text-white font-medium capitalize">{selectedQueue.rotation || 'Round Robin'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Ordem no Bot</div>
                      <div className="text-white font-medium">{selectedQueue.botOrder || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Status</div>
                      <div className={`font-medium ${selectedQueue.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedQueue.isActive ? 'Ativa' : 'Inativa'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Fechar Ticket Auto</div>
                      <div className={`font-medium ${selectedQueue.closeTicket ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedQueue.closeTicket ? 'Sim' : 'Não'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Máx. Tickets/Agente</div>
                      <div className="text-white font-medium">{selectedQueue.options?.maxTicketsPerUser || 5}</div>
                    </div>
                  </div>
                </div>

                {/* Agentes */}
                {selectedQueue.Users && selectedQueue.Users.length > 0 && (
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <h3 className="text-white text-lg font-medium mb-4">Agentes da Fila</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedQueue.Users.map(user => (
                        <div key={user.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                          <span className="text-white">{user.name}</span>
                          <span className="text-sm text-slate-400">{user.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tipos de Arquivo */}
                {selectedQueue.fileList && selectedQueue.fileList.length > 0 && (
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <h3 className="text-white text-lg font-medium mb-4">Tipos de Arquivo Permitidos</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedQueue.fileList.map(type => (
                        <span key={type} className="badge badge-primary">{type.toUpperCase()}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mensagens */}
                {(selectedQueue.greetingMessage || selectedQueue.outOfHoursMessage) && (
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <h3 className="text-white text-lg font-medium mb-4">Mensagens Configuradas</h3>
                    <div className="space-y-3">
                      {selectedQueue.greetingMessage && (
                        <div>
                          <div className="text-sm text-slate-400 mb-1">Mensagem de Saudação</div>
                          <div className="text-white bg-slate-700/50 rounded p-3 text-sm">
                            "{selectedQueue.greetingMessage}"
                          </div>
                        </div>
                      )}
                      {selectedQueue.outOfHoursMessage && (
                        <div>
                          <div className="text-sm text-slate-400 mb-1">Mensagem Fora do Horário</div>
                          <div className="text-white bg-slate-700/50 rounded p-3 text-sm">
                            "{selectedQueue.outOfHoursMessage}"
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700">
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="px-6 py-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-700 rounded-lg"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setShowStatsModal(false);
                    handleEdit(selectedQueue);
                  }}
                  className="px-6 py-2 bg-yellow-500 text-slate-900 rounded-lg hover:bg-yellow-400 transition-colors font-medium"
                >
                  Editar Fila
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Novos Modais Avançados */}
      <QueueTransferModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setSelectedQueueForAction(null);
        }}
        onTransfer={handleTransferTicket}
        queues={queues}
        currentQueueId={selectedQueueForAction?.id}
      />

      <QueueDuplicateModal
        isOpen={showDuplicateModal}
        onClose={() => {
          setShowDuplicateModal(false);
          setSelectedQueueForAction(null);
        }}
        onDuplicate={handleDuplicateQueue}
        queueName={selectedQueueForAction?.name}
      />

      <QueuePerformanceModal
        isOpen={showPerformanceModal}
        onClose={() => {
          setShowPerformanceModal(false);
          setSelectedQueueForAction(null);
        }}
        queueId={selectedQueueForAction?.id}
        queueName={selectedQueueForAction?.name}
      />

      <QueueAdvancedSettingsModal
        isOpen={showAdvancedSettingsModal}
        onClose={() => {
          setShowAdvancedSettingsModal(false);
          setSelectedQueueForAction(null);
        }}
        queue={selectedQueueForAction}
        onSave={handleAdvancedSettingsSave}
      />

      {/* Painel de Atividades */}
      <QueueActivityPanel
        isOpen={showActivityPanel}
        onClose={() => setShowActivityPanel(false)}
      />
    </div>
  );
}
