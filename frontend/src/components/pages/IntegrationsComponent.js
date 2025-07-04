import React, { useState, useEffect } from 'react';
import { 
  PuzzlePieceIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  PlusIcon,
  TrashIcon,
  Cog6ToothIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function IntegrationsComponent() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    name: '',
    type: '',
    webhook_url: '',
    settings: {}
  });

  const integrationTypes = [
    { value: 'webhook', label: 'Webhook', description: 'Enviar dados para URL externa' },
    { value: 'api', label: 'API', description: 'Integração via API REST' },
    { value: 'zapier', label: 'Zapier', description: 'Conectar com Zapier' },
    { value: 'n8n', label: 'n8n', description: 'Automação com n8n' },
    { value: 'custom', label: 'Personalizada', description: 'Integração customizada' }
  ];

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/integrations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data);
      } else {
        setError('Erro ao carregar integrações');
      }
    } catch (error) {
      console.error('Erro ao buscar integrações:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const createIntegration = async () => {
    try {
      const response = await fetch(`${API_URL}/api/integrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newIntegration)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewIntegration({ name: '', type: '', webhook_url: '', settings: {} });
        fetchIntegrations();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erro ao criar integração');
      }
    } catch (error) {
      console.error('Erro ao criar integração:', error);
      setError('Erro ao conectar com o servidor');
    }
  };

  const deleteIntegration = async (integrationId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta integração?')) return;

    try {
      const response = await fetch(`${API_URL}/api/integrations/${integrationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchIntegrations();
      } else {
        setError('Erro ao excluir integração');
      }
    } catch (error) {
      console.error('Erro ao excluir integração:', error);
      setError('Erro ao conectar com o servidor');
    }
  };

  const toggleIntegration = async (integrationId, isActive) => {
    try {
      const response = await fetch(`${API_URL}/api/integrations/${integrationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: !isActive })
      });

      if (response.ok) {
        fetchIntegrations();
      } else {
        setError('Erro ao atualizar integração');
      }
    } catch (error) {
      console.error('Erro ao atualizar integração:', error);
      setError('Erro ao conectar com o servidor');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'webhook':
        return <ArrowTopRightOnSquareIcon className="h-6 w-6 text-blue-600" />;
      case 'api':
        return <Cog6ToothIcon className="h-6 w-6 text-green-600" />;
      case 'zapier':
        return <PuzzlePieceIcon className="h-6 w-6 text-orange-600" />;
      case 'n8n':
        return <PuzzlePieceIcon className="h-6 w-6 text-purple-600" />;
      default:
        return <PuzzlePieceIcon className="h-6 w-6 text-gray-600" />;
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
            <h1 className="text-3xl font-bold text-gray-900">Integrações</h1>
            <p className="text-gray-600 mt-1">Conecte o ZaZap com outras plataformas</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Nova Integração</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                {getTypeIcon(integration.type)}
                <div>
                  <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                  <p className="text-sm text-gray-600">{integration.type}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {integration.is_active ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  {integration.is_active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {integration.webhook_url && (
                <div className="text-sm text-gray-600">
                  <p><strong>URL:</strong></p>
                  <p className="truncate bg-gray-50 px-2 py-1 rounded text-xs">
                    {integration.webhook_url}
                  </p>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => toggleIntegration(integration.id, integration.is_active)}
                  className={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                    integration.is_active 
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {integration.is_active ? 'Desativar' : 'Ativar'}
                </button>
                
                <button
                  onClick={() => deleteIntegration(integration.id)}
                  className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {integrations.length === 0 && !loading && (
        <div className="text-center py-12">
          <PuzzlePieceIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma integração encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">Conecte o ZaZap com outras plataformas para automatizar processos.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar primeira integração
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Nova Integração</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Integração
                </label>
                <input
                  type="text"
                  value={newIntegration.name}
                  onChange={(e) => setNewIntegration({...newIntegration, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Webhook CRM"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Integração
                </label>
                <select
                  value={newIntegration.type}
                  onChange={(e) => setNewIntegration({...newIntegration, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione um tipo</option>
                  {integrationTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL do Webhook
                </label>
                <input
                  type="url"
                  value={newIntegration.webhook_url}
                  onChange={(e) => setNewIntegration({...newIntegration, webhook_url: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/webhook"
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
                onClick={createIntegration}
                disabled={!newIntegration.name || !newIntegration.type}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
