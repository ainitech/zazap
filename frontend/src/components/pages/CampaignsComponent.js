import React, { useState, useEffect } from 'react';
import { apiFetch, safeJson } from '../../utils/apiClient';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  PauseIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ChartBarIcon,
  ClockIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  EyeIcon,
  ArrowPathIcon,
  FunnelIcon,
  CalendarDaysIcon,
  UsersIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import CampaignModal from '../modals/CampaignModal';
import CampaignStatsModal from '../modals/CampaignStatsModal';

const CampaignsComponent = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // table or cards
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [creatorFilter, setCreatorFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchCampaigns();
  }, [pagination.page, searchTerm, statusFilter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await apiFetch(`/api/campaigns?${params}`);
      if (response.ok) {
        const data = await safeJson(response);
        setCampaigns(data.campaigns);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft':
        return <ClockIcon className="w-5 h-5 text-slate-500" />;
      case 'scheduled':
        return <CalendarDaysIcon className="w-5 h-5 text-indigo-500" />;
      case 'sending':
        return <PaperAirplaneIcon className="w-5 h-5 text-amber-500 animate-pulse" />;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-emerald-500" />;
      case 'paused':
        return <PauseIcon className="w-5 h-5 text-orange-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-rose-500" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      draft: 'Rascunho',
      scheduled: 'Agendado',
      sending: 'Enviando',
      completed: 'Concluído',
      paused: 'Pausado',
      failed: 'Falhou'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-700 text-gray-300 border-slate-600';
      case 'scheduled':
        return 'bg-blue-900/30 text-blue-400 border-blue-800';
      case 'sending':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
      case 'completed':
        return 'bg-green-900/30 text-green-400 border-green-800';
      case 'paused':
        return 'bg-orange-900/30 text-orange-400 border-orange-800';
      case 'failed':
        return 'bg-red-900/30 text-red-400 border-red-800';
      default:
        return 'bg-slate-700 text-gray-300 border-slate-600';
    }
  };

  const getProgressColor = (status) => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'failed') return 'bg-red-500';
    if (status === 'paused') return 'bg-orange-500';
    if (status === 'sending') return 'bg-yellow-500 animate-pulse';
    return 'bg-blue-500';
  };

  const handleStartCampaign = async (campaignId) => {
    try {
  const response = await apiFetch(`/api/campaigns/${campaignId}/start`, { method: 'POST' });

      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error);
    }
  };

  const handlePauseCampaign = async (campaignId) => {
    try {
  const response = await apiFetch(`/api/campaigns/${campaignId}/pause`, { method: 'POST' });

      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Erro ao pausar campanha:', error);
    }
  };

  const handleResumeCampaign = async (campaignId) => {
    try {
  const response = await apiFetch(`/api/campaigns/${campaignId}/resume`, { method: 'POST' });

      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Erro ao retomar campanha:', error);
    }
  };

  const handleDuplicateCampaign = async (campaignId) => {
    try {
  const response = await apiFetch(`/api/campaigns/${campaignId}/duplicate`, { method: 'POST' });

      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Erro ao duplicar campanha:', error);
    }
  };

  // Função para obter o progresso
  const getProgress = (campaign) => {
    if (!campaign.totalContacts || campaign.totalContacts === 0) return 0;
    return Math.round((campaign.sentMessages / campaign.totalContacts) * 100);
  };

  // Função para visualizar detalhes da campanha
  const handleViewCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setShowStatsModal(true);
  };

  // Função para atualizar a lista
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCampaigns();
    } catch (error) {
      console.error('Erro ao atualizar campanhas:', error);
      toast.error('Erro ao atualizar a lista de campanhas');
    } finally {
      setRefreshing(false);
    }
  };

  // Filtros de campanha
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    const matchesDate = dateFilter === 'all' || (() => {
      const campaignDate = new Date(campaign.createdAt);
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          return campaignDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return campaignDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return campaignDate >= monthAgo;
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calcular estatísticas
  const stats = React.useMemo(() => {
    return {
      total: campaigns.length,
      completed: campaigns.filter(c => c.status === 'completed').length,
      sending: campaigns.filter(c => c.status === 'sending').length,
      totalSent: campaigns.reduce((sum, c) => sum + (c.sentMessages || 0), 0)
    };
  }, [campaigns]);

  const handleDeleteCampaign = async (campaignId) => {
    if (window.confirm('Tem certeza que deseja excluir esta campanha?')) {
      try {
        const response = await apiFetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' });
        if (response.ok) {
          fetchCampaigns();
        }
      } catch (error) {
        console.error('Erro ao excluir campanha:', error);
      }
    }
  };

  const showStats = async (campaign) => {
    try {
      const response = await apiFetch(`/api/campaigns/${campaign.id}/stats`);
      if (response.ok) {
        const stats = await safeJson(response);
        setSelectedCampaign({ ...campaign, stats });
        setShowStatsModal(true);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getProgressPercentage = (campaign) => {
    if (campaign.totalContacts === 0) return 0;
    return Math.round((campaign.sentCount / campaign.totalContacts) * 100);
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingCampaign(null);
  };

  const handleSaveCampaign = () => {
    fetchCampaigns();
    handleCloseModal();
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen space-y-8">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-800 rounded-xl shadow-xl p-6 border border-slate-700 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">Total de Campanhas</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
              <p className="text-yellow-400 text-xs mt-1">Campanhas criadas</p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <SparklesIcon className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-xl p-6 border border-slate-700 hover:border-green-500/50 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">Concluídas</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.completed}</p>
              <p className="text-green-400 text-xs mt-1">Com sucesso</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-xl p-6 border border-slate-700 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">Em Andamento</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.sending}</p>
              <p className="text-yellow-400 text-xs mt-1">Sendo enviadas</p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <PaperAirplaneIcon className="w-8 h-8 text-yellow-500 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-xl p-6 border border-slate-700 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">Mensagens Enviadas</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalSent.toLocaleString()}</p>
              <p className="text-blue-400 text-xs mt-1">Total processadas</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <UsersIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Controles e Filtros */}
      <div className="bg-slate-800 rounded-xl shadow-xl p-6 border border-slate-700">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar campanhas por nome ou mensagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200"
              />
            </div>
            
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-slate-600 rounded-lg bg-slate-700 text-white focus:ring-2 focus:ring-yellow-500 transition-all duration-200"
              >
                <option value="all">🏷️ Todos os Status</option>
                <option value="draft">📝 Rascunho</option>
                <option value="scheduled">⏰ Agendado</option>
                <option value="sending">🚀 Enviando</option>
                <option value="completed">✅ Concluído</option>
                <option value="paused">⏸️ Pausado</option>
                <option value="failed">❌ Falhou</option>
              </select>

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-3 border rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  showAdvancedFilters 
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' 
                    : 'border-slate-600 text-gray-400 hover:bg-slate-700 bg-slate-700'
                }`}
              >
                <FunnelIcon className="w-4 h-4" />
                Filtros
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-3 border border-slate-600 rounded-lg text-gray-400 hover:bg-slate-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 bg-slate-700"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
            >
              <PlusIcon className="w-5 h-5" />
              Nova Campanha
            </button>
          </div>
        </div>

        {/* Filtros Avançados */}
        {showAdvancedFilters && (
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  📅 Data de Criação
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-600 rounded-lg bg-slate-700 text-white"
                >
                  <option value="all">Todas as datas</option>
                  <option value="today">Hoje</option>
                  <option value="week">Esta semana</option>
                  <option value="month">Este mês</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  👤 Criado por
                </label>
                <select
                  value={creatorFilter}
                  onChange={(e) => setCreatorFilter(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-600 rounded-lg bg-slate-700 text-white"
                >
                  <option value="all">Todos os usuários</option>
                  <option value="me">Minhas campanhas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  👁️ Visualização
                </label>
                <div className="flex rounded-lg border border-slate-600 overflow-hidden">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex-1 px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      viewMode === 'table'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                    }`}
                  >
                    📊 Tabela
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex-1 px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      viewMode === 'cards'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                    }`}
                  >
                    🃏 Cards
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Campanhas */}
      {loading ? (
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            <span className="ml-3 text-gray-400">Carregando campanhas...</span>
          </div>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <SparklesIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchTerm || statusFilter !== 'all' ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha criada'}
          </h3>
          <p className="text-gray-400 mb-6">
            {searchTerm || statusFilter !== 'all' 
              ? 'Tente ajustar os filtros de busca para encontrar campanhas.'
              : 'Comece criando sua primeira campanha para enviar mensagens em massa.'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              Criar primeira campanha
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-slate-800 rounded-xl border border-slate-700 hover:border-yellow-500/50 transition-all duration-200 hover:shadow-xl"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg mb-1">
                      {campaign.name}
                    </h3>
                    <p className="text-gray-400 text-sm line-clamp-2">
                      {campaign.message}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                    {getStatusText(campaign.status)}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Progresso</span>
                    <span className="font-medium text-white">
                      {campaign.sentMessages || 0} / {campaign.totalContacts || 0}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(campaign.status)}`}
                      style={{ width: `${getProgress(campaign)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-400">Sessão:</span>
                    <p className="font-medium text-white truncate">
                      {campaign.Session?.whatsappId || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Criado em:</span>
                    <p className="font-medium text-white">
                      {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewCampaign(campaign)}
                    className="flex-1 px-3 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-all text-sm font-medium flex items-center justify-center gap-2 border border-slate-600"
                  >
                    <EyeIcon className="w-4 h-4" />
                    Ver Detalhes
                  </button>
                  <button
                    onClick={() => handleEditCampaign(campaign)}
                    className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-all flex items-center justify-center"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center justify-center"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Campanha
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Progresso
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Sessão
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-white">
                          {campaign.name}
                        </div>
                        <div className="text-sm text-gray-400 line-clamp-1">
                          {campaign.message}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {getStatusText(campaign.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">
                              {campaign.sentMessages || 0} / {campaign.totalContacts || 0}
                            </span>
                            <span className="font-medium text-white">
                              {getProgress(campaign)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(campaign.status)}`}
                              style={{ width: `${getProgress(campaign)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">
                        {campaign.Session?.whatsappId || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-400">
                        {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewCampaign(campaign)}
                          className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-all"
                          title="Ver detalhes"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditCampaign(campaign)}
                          className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-all"
                          title="Editar"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      <CampaignModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        campaign={editingCampaign}
        onSave={handleSaveCampaign}
      />

      {/* Modal de Estatísticas */}
      {showStatsModal && selectedCampaign && (
        <CampaignStatsModal
          campaign={selectedCampaign}
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
        />
      )}
    </div>
  );
};

export default CampaignsComponent;
