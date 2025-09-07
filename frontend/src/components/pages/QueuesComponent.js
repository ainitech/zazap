import React, { useState, useEffect } from 'react';
import { apiUrl, API_BASE_URL, apiFetch, safeJson } from '../../utils/apiClient';
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
  ClipboardDocumentListIcon,
  BoltIcon,
  StarIcon,
  InboxIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

// Import dos novos modais
import QueueTransferModal from '../modals/QueueTransferModal';
import QueueDuplicateModal from '../modals/QueueDuplicateModal';
import QueuePerformanceModal from '../modals/QueuePerformanceModal';
import QueueAdvancedSettingsModal from '../modals/QueueAdvancedSettingsModal';
import QueueActivityPanel from '../panels/QueueActivityPanel';
import QueueMetricsBar from '../metrics/QueueMetricsBar';

// API base is resolved via apiUrl helper

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
    autoReceiveMessages: false,
    autoAssignment: false,
    autoReply: false,
    autoClose: false,
    autoCloseTime: 60,
    feedbackCollection: false,
    feedbackMessage: '',
    fileList: [],
    options: {
      autoAssign: true,
      maxTicketsPerUser: 5,
      workingHours: {
        start: '08:00',
        end: '18:00'
      },
      transferToHuman: true,
      collectFeedback: false,
      responseTimeLimit: 30,
      priority: 'normal',
      notifyNewTicket: true,
      notifyTimeouts: true,
      allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'txt', 'mp3', 'mp4', 'avi', 'zip', 'xlsx', 'csv']
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
      const res = await apiFetch('/api/sessions');
      if (res.ok) {
        const data = await safeJson(res);
        setSessions(Array.isArray(data) ? data : []);
      } else {
        console.error('Erro na resposta da API de sessões:', res.status);
        setSessions([]);
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      setSessions([]);
    }
  };

  const fetchQueues = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/queues');
      if (res.ok) {
        const data = await safeJson(res);
        setQueues(Array.isArray(data) ? data : []);
      } else {
        console.error('Erro na resposta da API de filas:', res.status);
        setQueues([]);
      }
    } catch (error) {
      console.error('Erro ao buscar filas:', error);
      setQueues([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/api/users');
      if (res.ok) {
        const data = await safeJson(res);
        const usersArray = Array.isArray(data) ? data : (data.users || []);
        setUsers(usersArray);
      } else if (res.status === 403) {
        console.warn('Usuário não tem permissão para listar usuários');
        setUsers([]);
      } else {
        console.error('Erro na resposta da API de usuários:', res.status);
        setUsers([]);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setUsers([]);
    }
  };

  // Novas funções de gerenciamento avançado
  const fetchQueueStats = async (queueId) => {
    try {
      const res = await apiFetch(`/api/queues/${queueId}/stats`);
      if (res.ok) {
        const data = await safeJson(res);
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
      const res = await apiFetch('/api/queues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedData)
      });
      if (res.ok) {
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
      const res = await apiFetch(`/api/queues/${queueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) await fetchQueues();
    } catch (error) {
      console.error('Erro ao alterar status da fila:', error);
    }
  };

  const archiveQueue = async (queueId) => {
    if (!window.confirm('Tem certeza que deseja arquivar esta fila? Ela ficará inativa e oculta da lista principal.')) return;
    
    try {
  const res = await apiFetch(`/api/queues/${queueId}/archive`, { method: 'POST' });
      
  if (res.ok) {
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
      const res = await apiFetch('/api/queues/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, queueIds: selectedQueues })
      });

      if (res.ok) {
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
    
    console.log('Dados sendo enviados:', formData);
    
    try {
      const url = editingQueue 
        ? apiUrl(`/api/queues/${editingQueue.id}`)
        : apiUrl('/api/queues');
      const method = editingQueue ? 'PUT' : 'POST';
      
      console.log(`Enviando ${method} para ${url}`);
      
      const res = await apiFetch(url.replace(API_BASE_URL, ''), { // apiFetch já aplica base
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const responseData = await safeJson(res).catch(() => ({}));
      console.log('Resposta do servidor:', responseData);
      
      if (res.ok) {
        await fetchQueues();
        handleCloseModal();
        console.log('Fila salva com sucesso!');
      } else {
        console.error('Erro na resposta:', responseData);
        alert('Erro ao salvar fila: ' + (responseData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao salvar fila:', error);
      alert('Erro ao salvar fila: ' + error.message);
    }
  };

  const handleDelete = async (queueId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta fila?')) return;
    
    try {
  const res = await apiFetch(`/api/queues/${queueId}`, { method: 'DELETE' });
  if (res.ok) {
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
      autoReceiveMessages: queue.autoReceiveMessages || false,
      autoAssignment: queue.autoAssignment || false,
      autoReply: queue.autoReply || false,
      autoClose: queue.autoClose || false,
      autoCloseTime: queue.autoCloseTime || 60,
      feedbackCollection: queue.feedbackCollection || false,
      feedbackMessage: queue.feedbackMessage || '',
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
      autoReceiveMessages: false,
      autoAssignment: false,
      autoReply: false,
      autoClose: false,
      autoCloseTime: 60,
      feedbackCollection: false,
      feedbackMessage: '',
      fileList: [],
      options: {
        maxTicketsPerUser: 5,
        workingHours: {
          start: '08:00',
          end: '18:00'
        },
        transferToHuman: true,
        responseTimeLimit: 30,
        priority: 'normal',
        notifyNewTicket: true,
        notifyTimeouts: true,
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'txt', 'mp3', 'mp4', 'avi', 'zip', 'xlsx', 'csv']
      }
    });
  };

  const assignUserToQueue = async (queueId, userId) => {
    try {
      const res = await apiFetch('/api/queues/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId, userId })
      });
      if (res.ok) {
        await fetchQueues();
      }
    } catch (error) {
      console.error('Erro ao vincular usuário à fila:', error);
    }
  };

  const removeUserFromQueue = async (queueId, userId) => {
    try {
      const res = await apiFetch('/api/queues/remove-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId, userId })
      });
      if (res.ok) {
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
      const res = await apiFetch(`/api/queues/${selectedQueue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editQueueName.trim(), sessionId: editSessionId || null })
      });
      if (res.ok) {
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
  const res = await apiFetch(`/api/queues/${selectedQueueForAction.id}/transfer-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Ticket transferido com sucesso!');
        setShowTransferModal(false);
        setSelectedQueueForAction(null);
      } else {
        const error = await safeJson(res).catch(() => ({}));
        alert(`Erro: ${error.error}`);
      }
    } catch (error) {
      console.error('Erro ao transferir ticket:', error);
      alert('Erro ao transferir ticket');
    }
  };

  const handleDuplicateQueue = async (data) => {
    try {
      const res = await apiFetch(`/api/queues/${selectedQueueForAction.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Fila duplicada com sucesso!');
        setShowDuplicateModal(false);
        setSelectedQueueForAction(null);
        fetchQueues();
      } else {
        const error = await safeJson(res).catch(() => ({}));
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
      const res = await apiFetch(`/api/queues/${selectedQueueForAction.id}/advanced-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert('Configurações salvas com sucesso!');
        setShowAdvancedSettingsModal(false);
        setSelectedQueueForAction(null);
        fetchQueues();
      } else {
        const error = await safeJson(res).catch(() => ({}));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl shadow-lg">
              <QueueListIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Gerenciamento de Filas
              </h1>
              <p className="text-slate-400 text-sm">Organize e distribua atendimentos por departamentos</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowHelpModal(true)}
              className="flex items-center space-x-2 bg-slate-700/50 text-slate-300 px-3 py-2 rounded-lg font-medium hover:bg-slate-600/50 transition-all duration-200 backdrop-blur-sm border border-slate-600/30"
            >
              <QuestionMarkCircleIcon className="w-4 h-4" />
              <span className="text-sm">Ajuda</span>
            </button>
            <button
              onClick={() => setShowActivityPanel(true)}
              className="flex items-center space-x-2 bg-slate-700/50 text-slate-300 px-3 py-2 rounded-lg font-medium hover:bg-slate-600/50 transition-all duration-200 backdrop-blur-sm border border-slate-600/30"
            >
              <BellIcon className="w-4 h-4" />
              <span className="text-sm">Atividades</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-2 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 shadow-lg"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="text-sm">Nova Fila</span>
            </button>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="mb-4">
          <QueueMetricsBar queues={filteredQueues} />
        </div>

        {/* Toolbar */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar filas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-slate-700/70 text-white rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 backdrop-blur-sm w-full sm:w-56 text-sm"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-700/70 text-white rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 backdrop-blur-sm text-sm"
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
                  className="px-3 py-2 bg-slate-700/70 text-white rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 backdrop-blur-sm text-sm"
                >
                  <option value="name">Ordenar por nome</option>
                  <option value="botOrder">Ordenar por ordem</option>
                  <option value="createdAt">Ordenar por data</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 bg-slate-700/70 text-white rounded-lg border border-slate-700/50 hover:bg-slate-600/70 transition-all duration-200"
                >
                  <ArrowsUpDownIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center space-x-2">
              {selectedQueues.length > 0 && (
                <div className="flex items-center space-x-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
                  <span className="text-yellow-400 text-sm font-medium">
                    {selectedQueues.length} selecionada(s)
                  </span>
                  
                  <button
                    onClick={() => bulkAction('activate')}
                    className="p-1 text-green-400 hover:text-green-300 transition-colors"
                  >
                    <PlayIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => bulkAction('deactivate')}
                    className="p-1 text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    <PauseIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => bulkAction('archive')}
                    className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ArchiveBoxIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => bulkAction('delete')}
                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                onClick={selectAllQueues}
                className="flex items-center space-x-2 px-3 py-2 bg-slate-700/70 text-white rounded-lg border border-slate-700/50 hover:bg-slate-600/70 transition-all duration-200 text-sm"
              >
                <ClipboardDocumentListIcon className="w-4 h-4" />
                <span>{selectedQueues.length === sortedQueues.length ? 'Desmarcar' : 'Selecionar'} todas</span>
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{queues.length}</div>
                <div className="text-xs text-slate-400">Total de Filas</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">{queues.filter(q => q.isActive).length}</div>
                <div className="text-xs text-slate-400">Filas Ativas</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-400">
                  {queues.reduce((acc, q) => acc + (q._count?.waitingTickets || 0), 0)}
                </div>
                <div className="text-xs text-slate-400">Tickets Aguardando</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">
                  {queues.reduce((acc, q) => acc + (q.Users?.length || 0), 0)}
                </div>
                <div className="text-xs text-slate-400">Agentes Vinculados</div>
              </div>
            </div>
          </div>
        </div>

        {/* Queues Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          <div className="grid-auto-fit">
            {sortedQueues.map(queue => (
              <div key={queue.id} className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-yellow-500/50 transition-all duration-200 card-hover fade-in relative">
                {/* Selection Checkbox */}
                <div className="absolute top-3 right-3">
                  <input
                    type="checkbox"
                    checked={selectedQueues.includes(queue.id)}
                    onChange={() => toggleQueueSelection(queue.id)}
                    className="custom-checkbox"
                  />
                </div>

                {/* Queue Header */}
                <div className="flex items-center justify-between mb-3 mr-6">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white/20 shadow-lg"
                      style={{ backgroundColor: queue.color || '#0420BF' }}
                    ></div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">{queue.name}</h3>
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
                      className="p-1 text-slate-400 hover:text-yellow-400 hover:bg-slate-700/50 rounded-lg transition-all"
                    >
                      <ChartBarIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => duplicateQueue(queue)}
                      className="p-1 text-slate-400 hover:text-orange-400 hover:bg-slate-700/50 rounded-lg transition-all"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openTransferModal(queue)}
                      className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded transition-all"
                    >
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openPerformanceModal(queue)}
                      className="p-1 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded transition-all"
                    >
                      <ChartBarIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openAdvancedSettingsModal(queue)}
                      className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-all"
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleQueueStatus(queue.id, queue.isActive)}
                      className="p-1 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 rounded transition-all"
                    >
                      {queue.isActive ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(queue)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => archiveQueue(queue.id)}
                      className="p-1 text-slate-400 hover:text-orange-400 hover:bg-slate-700 rounded transition-all"
                    >
                      <ArchiveBoxIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(queue.id)}
                      className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-all"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Integration Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="badge badge-primary text-xs">
                      {queue.integration || 'WhatsApp'}
                    </span>
                    {queue.closeTicket && (
                      <span className="badge badge-success text-xs">
                        Auto-close
                      </span>
                    )}
                  </div>
                  
                  <div className={`flex items-center space-x-1 text-xs ${queue.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {queue.isActive ? (
                      <CheckCircleIcon className="w-3 h-3" />
                    ) : (
                      <XMarkIcon className="w-3 h-3" />
                    )}
                    <span>{queue.isActive ? 'Ativa' : 'Inativa'}</span>
                  </div>
                </div>

                {/* Queue Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-yellow-500/30 transition-colors">
                    <div className="text-yellow-400 text-sm font-semibold">
                      {queue._count?.waitingTickets || 0}
                    </div>
                    <div className="text-slate-400 text-xs">Aguardando</div>
                  </div>
                  <div className="text-center p-2 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-green-500/30 transition-colors">
                    <div className="text-green-400 text-sm font-semibold">
                      {queue._count?.activeTickets || 0}
                    </div>
                    <div className="text-slate-400 text-xs">Ativos</div>
                  </div>
                  <div className="text-center p-2 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-blue-500/30 transition-colors">
                    <div className="text-blue-400 text-sm font-semibold">
                      {queue._count?.resolvedTickets || 0}
                    </div>
                    <div className="text-slate-400 text-xs">Resolvidos</div>
                  </div>
                </div>

                {/* Configuration Info */}
                {(queue.options?.maxTicketsPerUser || queue.fileList?.length > 0) && (
                  <div className="mb-3 p-2 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <div className="flex items-center space-x-2 mb-1">
                      <AdjustmentsHorizontalIcon className="w-3 h-3 text-yellow-500" />
                      <span className="text-slate-300 text-xs font-medium">Configurações</span>
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
                      {(users || [])
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
            <div className="p-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl inline-flex items-center justify-center mx-auto mb-6">
              <QueueListIcon className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Nenhuma fila criada</h3>
            <p className="text-slate-400 mb-8">Comece criando sua primeira fila de atendimento.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all duration-200"
            >
              Criar primeira fila
            </button>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm modal-backdrop flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl p-0 w-full max-w-5xl max-h-[95vh] overflow-hidden fade-in">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 border-b border-slate-700/50 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl">
                      <QueueListIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        {editingQueue ? 'Editar Fila de Atendimento' : 'Nova Fila de Atendimento'}
                      </h2>
                      <p className="text-slate-400 text-sm mt-1">
                        {editingQueue ? 'Modifique as configurações da fila' : 'Configure uma nova fila para organizar seu atendimento'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-white transition-all duration-200 p-2 rounded-xl hover:bg-slate-700/50 group"
                    data-tooltip="Fechar"
                  >
                    <XMarkIcon className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)] custom-scrollbar">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Informações Básicas e Configurações - Grid de 2 Colunas */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Informações Básicas */}
                    <div className="space-y-4">
                      <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                        <div className="text-center mb-4">
                          <div className="inline-flex items-center justify-center p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl mb-3">
                            <QueueListIcon className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="text-lg font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                            Informações Básicas
                          </h3>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">
                              Sessão *
                            </label>
                            <select
                              value={formData.sessionId}
                              onChange={e => setFormData({ ...formData, sessionId: e.target.value })}
                              className="w-full bg-slate-700/70 text-white px-3 py-2 rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                              required
                            >
                              <option value="">Selecione uma sessão</option>
                              {sessions.map(session => (
                                <option key={session.id} value={session.id}>{session.name || session.id}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">
                              Nome da Fila *
                            </label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full bg-slate-700/70 text-white px-3 py-2 rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                              placeholder="Ex: Suporte Técnico"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">
                              Cor da Fila
                            </label>
                            <div className="flex items-center space-x-3">
                              <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="w-10 h-10 rounded-lg border-2 border-slate-700 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="flex-1 bg-slate-700/70 text-white px-3 py-2 rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 font-mono text-sm"
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
                              className="w-full bg-slate-700/70 text-white px-3 py-2 rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                              min="0"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Configurações Avançadas */}
                    <div className="space-y-4">
                      <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                        <div className="text-center mb-4">
                          <div className="inline-flex items-center justify-center p-2 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl mb-3">
                            <Cog6ToothIcon className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="text-lg font-bold bg-gradient-to-r from-slate-300 to-slate-400 bg-clip-text text-transparent">
                            Configurações
                          </h3>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">
                              Tipo de Rodízio
                            </label>
                            <select
                              value={formData.rotation}
                              onChange={e => setFormData({ ...formData, rotation: e.target.value })}
                              className="w-full bg-slate-700/70 text-white px-3 py-2 rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                            >
                              {rotationOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-300 text-sm font-medium mb-2">
                              Integração
                            </label>
                            <select
                              value={formData.integration}
                              onChange={e => setFormData({ ...formData, integration: e.target.value })}
                              className="w-full bg-slate-700/70 text-white px-3 py-2 rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
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
                              className="w-full bg-slate-700/70 text-white px-3 py-2 rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                              min="1"
                              max="20"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Configurações de Automação - Seção Completa */}
                  <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
                    <div className="text-center mb-5">
                      <div className="inline-flex items-center justify-center p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl mb-3">
                        <BoltIcon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent mb-2">
                        Configurações de Automação
                      </h3>
                      <p className="text-slate-400 text-sm">Configure as funcionalidades automáticas da sua fila</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Fila Ativa */}
                      <div className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                        formData.isActive 
                          ? 'border-green-500/50 bg-green-500/10' 
                          : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500/50'
                      }`}
                      onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              formData.isActive ? 'bg-green-500' : 'bg-slate-600'
                            }`}>
                              <CheckCircleIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              formData.isActive 
                                ? 'border-green-500 bg-green-500' 
                                : 'border-slate-400 bg-transparent'
                            }`}>
                              {formData.isActive && <CheckIcon className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <h4 className="text-white font-medium mb-1 text-sm">Fila Ativa</h4>
                          <p className="text-slate-400 text-xs">
                            Habilita funcionamento da fila
                          </p>
                        </div>
                      </div>

                      {/* Atribuição Automática */}
                      <div className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                        formData.autoAssignment 
                          ? 'border-blue-500/50 bg-blue-500/10' 
                          : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500/50'
                      }`}
                      onClick={() => {
                        console.log('Clicando em autoAssignment, valor atual:', formData.autoAssignment);
                        const newValue = !formData.autoAssignment;
                        console.log('Novo valor será:', newValue);
                        setFormData({ ...formData, autoAssignment: newValue });
                      }}
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              formData.autoAssignment ? 'bg-blue-500' : 'bg-slate-600'
                            }`}>
                              <UserGroupIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              formData.autoAssignment 
                                ? 'border-blue-500 bg-blue-500' 
                                : 'border-slate-400 bg-transparent'
                            }`}>
                              {formData.autoAssignment && <CheckIcon className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <h4 className="text-white font-medium mb-1 text-sm">Atribuição Auto</h4>
                          <p className="text-slate-400 text-xs">
                            Tickets atribuídos automaticamente
                          </p>
                        </div>
                      </div>

                      {/* Resposta Automática */}
                      <div className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                        formData.autoReply 
                          ? 'border-purple-500/50 bg-purple-500/10' 
                          : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500/50'
                      }`}
                      onClick={() => {
                        console.log('Clicando em autoReply, valor atual:', formData.autoReply);
                        const newValue = !formData.autoReply;
                        console.log('Novo valor será:', newValue);
                        setFormData({ ...formData, autoReply: newValue });
                      }}
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              formData.autoReply ? 'bg-purple-500' : 'bg-slate-600'
                            }`}>
                              <ChatBubbleLeftRightIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              formData.autoReply 
                                ? 'border-purple-500 bg-purple-500' 
                                : 'border-slate-400 bg-transparent'
                            }`}>
                              {formData.autoReply && <CheckIcon className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <h4 className="text-white font-medium mb-1 text-sm">Resposta Auto</h4>
                          <p className="text-slate-400 text-xs">
                            Mensagem de saudação automática
                          </p>
                        </div>
                      </div>

                      {/* Fechamento Automático */}
                      <div className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                        formData.autoClose 
                          ? 'border-orange-500/50 bg-orange-500/10' 
                          : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500/50'
                      }`}
                      onClick={() => {
                        console.log('Clicando em autoClose, valor atual:', formData.autoClose);
                        const newValue = !formData.autoClose;
                        console.log('Novo valor será:', newValue);
                        setFormData({ ...formData, autoClose: newValue });
                      }}
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              formData.autoClose ? 'bg-orange-500' : 'bg-slate-600'
                            }`}>
                              <ClockIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              formData.autoClose 
                                ? 'border-orange-500 bg-orange-500' 
                                : 'border-slate-400 bg-transparent'
                            }`}>
                              {formData.autoClose && <CheckIcon className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <h4 className="text-white font-medium mb-1 text-sm">Fechar Auto</h4>
                          <p className="text-slate-400 text-xs">
                            Fecha por inatividade
                          </p>
                          {formData.autoClose && (
                            <div className="mt-2 pt-2 border-t border-orange-500/20">
                              <input
                                type="number"
                                value={formData.autoCloseTime || 60}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setFormData({ ...formData, autoCloseTime: parseInt(e.target.value) || 60 });
                                }}
                                className="w-full bg-orange-500/20 text-white px-2 py-1 rounded text-xs"
                                min="5"
                                max="1440"
                                placeholder="60 min"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Coletar Feedback */}
                      <div className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                        formData.feedbackCollection 
                          ? 'border-yellow-500/50 bg-yellow-500/10' 
                          : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500/50'
                      }`}
                      onClick={() => setFormData({ ...formData, feedbackCollection: !formData.feedbackCollection })}
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              formData.feedbackCollection ? 'bg-yellow-500' : 'bg-slate-600'
                            }`}>
                              <StarIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              formData.feedbackCollection 
                                ? 'border-yellow-500 bg-yellow-500' 
                                : 'border-slate-400 bg-transparent'
                            }`}>
                              {formData.feedbackCollection && <CheckIcon className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <h4 className="text-white font-medium mb-1 text-sm">Feedback</h4>
                          <p className="text-slate-400 text-xs">
                            Coleta avaliação do cliente
                          </p>
                        </div>
                      </div>

                      {/* Receber Mensagens */}
                      <div className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                        formData.autoReceiveMessages 
                          ? 'border-cyan-500/50 bg-cyan-500/10' 
                          : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500/50'
                      }`}
                      onClick={() => {
                        console.log('Clicando em autoReceiveMessages, valor atual:', formData.autoReceiveMessages);
                        const newValue = !formData.autoReceiveMessages;
                        console.log('Novo valor será:', newValue);
                        setFormData({ ...formData, autoReceiveMessages: newValue });
                      }}
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              formData.autoReceiveMessages ? 'bg-cyan-500' : 'bg-slate-600'
                            }`}>
                              <InboxIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              formData.autoReceiveMessages 
                                ? 'border-cyan-500 bg-cyan-500' 
                                : 'border-slate-400 bg-transparent'
                            }`}>
                              {formData.autoReceiveMessages && <CheckIcon className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <h4 className="text-white font-medium mb-1 text-sm">Receber Auto</h4>
                          <p className="text-slate-400 text-xs">
                            Mensagens diretas para fila
                          </p>
                        </div>
                      </div>

                      {/* Fechar Ticket */}
                      <div className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                        formData.closeTicket 
                          ? 'border-red-500/50 bg-red-500/10' 
                          : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500/50'
                      }`}
                      onClick={() => setFormData({ ...formData, closeTicket: !formData.closeTicket })}
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              formData.closeTicket ? 'bg-red-500' : 'bg-slate-600'
                            }`}>
                              <XMarkIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              formData.closeTicket 
                                ? 'border-red-500 bg-red-500' 
                                : 'border-slate-400 bg-transparent'
                            }`}>
                              {formData.closeTicket && <CheckIcon className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <h4 className="text-white font-medium mb-1 text-sm">Fechar Ticket</h4>
                          <p className="text-slate-400 text-xs">
                            Permite fechamento automático
                          </p>
                        </div>
                      </div>

                      {/* Transferir para Humano */}
                      <div className={`relative overflow-hidden rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                        formData.options.transferToHuman 
                          ? 'border-indigo-500/50 bg-indigo-500/10' 
                          : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500/50'
                      }`}
                      onClick={() => setFormData({ 
                        ...formData, 
                        options: { 
                          ...formData.options, 
                          transferToHuman: !formData.options.transferToHuman 
                        } 
                      })}
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              formData.options.transferToHuman ? 'bg-indigo-500' : 'bg-slate-600'
                            }`}>
                              <ArrowRightIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              formData.options.transferToHuman 
                                ? 'border-indigo-500 bg-indigo-500' 
                                : 'border-slate-400 bg-transparent'
                            }`}>
                              {formData.options.transferToHuman && <CheckIcon className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <h4 className="text-white font-medium mb-1 text-sm">Transfer Humano</h4>
                          <p className="text-slate-400 text-xs">
                            Permite transferir para humano
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mensagens e Horários */}
                  <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-xl mb-3">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                        Mensagens e Horários
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                          Mensagem de Saudação
                        </label>
                        <textarea
                          value={formData.greetingMessage}
                          onChange={(e) => setFormData({ ...formData, greetingMessage: e.target.value })}
                          className="w-full bg-slate-700/70 text-white px-3 py-2 rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 resize-none"
                          rows="3"
                          placeholder="Olá! Bem-vindo ao nosso atendimento."
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                          Mensagem Fora do Horário
                        </label>
                        <textarea
                          value={formData.outOfHoursMessage}
                          onChange={(e) => setFormData({ ...formData, outOfHoursMessage: e.target.value })}
                          className="w-full bg-slate-700/70 text-white px-3 py-2 rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200 resize-none"
                          rows="3"
                          placeholder="Estamos fora do horário de atendimento."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                          className="w-full bg-slate-700/70 text-white px-3 py-2 rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
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
                          className="w-full bg-slate-700/70 text-white px-3 py-2 rounded-lg border border-slate-700/50 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tipos de Arquivo */}
                  <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl mb-3">
                        <DocumentTextIcon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                        Tipos de Arquivo Permitidos
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                          <label htmlFor={`fileType-${fileType}`} className="text-slate-300 text-xs uppercase font-medium">
                            {fileType}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-700/50">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-slate-700/70 text-slate-300 rounded-lg hover:bg-slate-600/70 transition-all duration-200 font-medium border border-slate-600/50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 font-semibold"
                    >
                      {editingQueue ? 'Salvar Alterações' : 'Criar Fila'}
                    </button>
                  </div>
                </form>
              </div>
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
