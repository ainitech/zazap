import React, { useState, useEffect } from 'react';
import { apiFetch, safeJson } from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

const AgentsComponent = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'attendant',
    isActive: true,
    queues: []
  });

  // Carregar agentes
  const loadAgents = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/users');
      const data = await safeJson(response);
      if (data.success) {
        setAgents(data.users || []);
      }
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  // Filtrar agentes por busca
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Abrir modal para criar/editar
  const openModal = (agent = null) => {
    if (agent) {
      setEditingAgent(agent);
      setFormData({
        name: agent.name,
        email: agent.email,
        password: '',
        role: agent.role || 'attendant',
        isActive: agent.isActive !== false,
        queues: agent.queues || []
      });
    } else {
      setEditingAgent(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'attendant',
        isActive: true,
        queues: []
      });
    }
    setShowModal(true);
  };

  // Fechar modal
  const closeModal = () => {
    setShowModal(false);
    setEditingAgent(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'attendant',
      isActive: true,
      queues: []
    });
  };

  // Salvar agente
  const saveAgent = async (e) => {
    e.preventDefault();

    try {
      const url = editingAgent ? `/api/users/${editingAgent.id}` : '/api/users';
      const method = editingAgent ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await safeJson(response);
      if (data.success) {
        await loadAgents();
        closeModal();
      } else {
        alert(data.message || 'Erro ao salvar agente');
      }
    } catch (error) {
      console.error('Erro ao salvar agente:', error);
      alert('Erro ao salvar agente');
    }
  };

  // Toggle status do agente
  const toggleAgentStatus = async (agentId, currentStatus) => {
    try {
      const response = await apiFetch(`/api/users/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      const data = await safeJson(response);
      if (data.success) {
        await loadAgents();
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  // Deletar agente
  const deleteAgent = async (agentId) => {
    if (!confirm('Tem certeza que deseja excluir este agente?')) return;

    try {
      const response = await apiFetch(`/api/users/${agentId}`, {
        method: 'DELETE'
      });

      const data = await safeJson(response);
      if (data.success) {
        await loadAgents();
      } else {
        alert(data.message || 'Erro ao excluir agente');
      }
    } catch (error) {
      console.error('Erro ao excluir agente:', error);
      alert('Erro ao excluir agente');
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'supervisor': return 'Supervisor';
      case 'attendant': return 'Atendente';
      default: return 'Atendente';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'supervisor': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'attendant': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      default: return 'bg-green-500/20 text-green-400 border border-green-500/30';
    }
  };

  const getRolePermissions = (role) => {
    switch (role) {
      case 'admin':
        return [
          'Gerenciar usuários',
          'Configurações completas',
          'Todas as permissões'
        ];
      case 'supervisor':
        return [
          'Supervisionar atendimentos',
          'Gerenciar filas',
          'Relatórios avançados'
        ];
      case 'attendant':
        return [
          'Atender conversas',
          'Usar ferramentas básicas',
          'Gerenciar contatos'
        ];
      default:
        return ['Permissões básicas'];
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="mt-3 text-sm text-gray-300 space-y-1">
            <p>✓ Responde às conversas que chegam</p>
            <p>✓ Pode assumir, transferir ou finalizar atendimentos</p>
            <p>✓ Usa tags, campanhas e agendamentos conforme a permissão</p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300"
        >
          <UserPlusIcon className="w-5 h-5" />
          Novo Agente
        </button>
      </div>

      {/* Barra de busca e filtros */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 text-gray-300 hover:text-white flex items-center gap-2 transition-all duration-300">
            <FunnelIcon className="w-5 h-5" />
            Filtros
          </button>
        </div>
      </div>

      {/* Lista de agentes */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="mt-2 text-gray-400">Carregando agentes...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700 border-b border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Agente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Permissões
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-slate-900 font-medium">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{agent.name}</div>
                          <div className="text-sm text-gray-400">{agent.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(agent.role)}`}>
                        {getRoleLabel(agent.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-300 space-y-0.5">
                        {getRolePermissions(agent.role).map((permission, index) => (
                          <div key={index} className="flex items-center">
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                              agent.role === 'admin' ? 'bg-red-400' :
                              agent.role === 'supervisor' ? 'bg-blue-400' : 'bg-green-400'
                            }`}></span>
                            {permission}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        agent.isActive !== false ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {agent.isActive !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(agent.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openModal(agent)}
                          className="text-blue-400 hover:text-blue-300 p-1"
                          title="Editar"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleAgentStatus(agent.id, agent.isActive)}
                          className={`p-1 ${agent.isActive !== false ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
                          title={agent.isActive !== false ? 'Desativar' : 'Ativar'}
                        >
                          {agent.isActive !== false ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteAgent(agent.id)}
                          className="text-red-400 hover:text-red-300 p-1"
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
        )}
      </div>

      {/* Informações sobre roles */}
      <div className="mt-8 bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Tipos de Usuário</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center mb-2">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              <h4 className="text-green-400 font-medium">Atendente</h4>
            </div>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Responde às conversas que chegam</li>
              <li>• Pode assumir, transferir ou finalizar atendimentos</li>
              <li>• Usa tags e ferramentas básicas</li>
            </ul>
          </div>
          
          <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center mb-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              <h4 className="text-blue-400 font-medium">Supervisor</h4>
            </div>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Todas as permissões de Atendente</li>
              <li>• Supervisiona outros atendentes</li>
              <li>• Gerencia filas e campanhas</li>
            </ul>
          </div>
          
          <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center mb-2">
              <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
              <h4 className="text-red-400 font-medium">Administrador</h4>
            </div>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Todas as permissões do sistema</li>
              <li>• Gerencia usuários e configurações</li>
              <li>• Acesso completo a todas as funcionalidades</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de criação/edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <div className="mb-4 p-3 bg-slate-700 rounded-lg border border-slate-600">
              <p className="text-sm text-gray-300 text-center">
                <strong>Permissões do Agente:</strong><br />
                • Responde às conversas que chegam<br />
                • Pode assumir, transferir ou finalizar atendimentos<br />
                • Usa tags, campanhas e agendamentos conforme a permissão
              </p>
            </div>
            
            <h3 className="text-lg font-semibold mb-4 text-white text-center">
              {editingAgent ? 'Editar Agente' : 'Novo Agente'}
            </h3>

            <form onSubmit={saveAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                />
              </div>

              {!editingAgent && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required={!editingAgent}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Função
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="attendant">Atendente</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  {formData.role === 'admin' && 'Acesso completo ao sistema'}
                  {formData.role === 'supervisor' && 'Supervisiona atendimentos e filas'}
                  {formData.role === 'attendant' && 'Atende conversas e usa ferramentas básicas'}
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="h-4 w-4 text-yellow-500 focus:ring-yellow-500 border-slate-600 rounded bg-slate-700"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-300">
                  Ativo
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300"
                >
                  {editingAgent ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentsComponent;
