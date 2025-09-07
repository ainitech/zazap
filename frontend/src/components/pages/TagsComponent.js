import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TagIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ChartBarIcon,
  FunnelIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { apiFetch, safeJson, apiUrl } from '../../utils/apiClient';

const predefinedColors = [
  { name: 'Azul', value: 'bg-blue-500', text: 'text-blue-500', bg: 'bg-blue-100', border: 'border-blue-200' },
  { name: 'Verde', value: 'bg-green-500', text: 'text-green-500', bg: 'bg-green-100', border: 'border-green-200' },
  { name: 'Amarelo', value: 'bg-yellow-500', text: 'text-yellow-500', bg: 'bg-yellow-100', border: 'border-yellow-200' },
  { name: 'Vermelho', value: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-100', border: 'border-red-200' },
  { name: 'Roxo', value: 'bg-purple-500', text: 'text-purple-500', bg: 'bg-purple-100', border: 'border-purple-200' },
  { name: 'Rosa', value: 'bg-pink-500', text: 'text-pink-500', bg: 'bg-pink-100', border: 'border-pink-200' },
  { name: 'Laranja', value: 'bg-orange-500', text: 'text-orange-500', bg: 'bg-orange-100', border: 'border-orange-200' },
  { name: 'Cinza', value: 'bg-gray-500', text: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200' },
  { name: 'Índigo', value: 'bg-indigo-500', text: 'text-indigo-500', bg: 'bg-indigo-100', border: 'border-indigo-200' },
  { name: 'Teal', value: 'bg-teal-500', text: 'text-teal-500', bg: 'bg-teal-100', border: 'border-teal-200' }
];

const predefinedTags = [
  { name: 'Cliente Novo', color: 'bg-green-500', category: 'Status' },
  { name: 'Suporte Técnico', color: 'bg-blue-500', category: 'Departamento' },
  { name: 'Financeiro', color: 'bg-yellow-500', category: 'Departamento' },
  { name: 'Venda Concluída', color: 'bg-purple-500', category: 'Status' },
  { name: 'Follow-up', color: 'bg-orange-500', category: 'Ação' },
  { name: 'Urgente', color: 'bg-red-500', category: 'Prioridade' },
  { name: 'VIP', color: 'bg-pink-500', category: 'Tipo Cliente' },
  { name: 'Reclamação', color: 'bg-gray-500', category: 'Tipo' },
  { name: 'Dúvida', color: 'bg-indigo-500', category: 'Tipo' },
  { name: 'Interessado', color: 'bg-teal-500', category: 'Status' }
];

export default function TagsComponent() {
  const { token, user } = useAuth();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showCreateModal, setShowCreateModal] = useState(false);

  console.log('🏷️ TagsComponent: Inicializando, user:', user, 'token:', !!token);
  const [editingTag, setEditingTag] = useState(null);
  const [showPredefinedModal, setShowPredefinedModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'bg-blue-500',
    category: '',
    priority: 1
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // API base is resolved via apiUrl helper

  const fetchTags = async () => {
    console.log('🏷️ TagsComponent: Carregando tags...');
    setLoading(true);
    try {
  const res = await fetch(apiUrl('/api/tags'), {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
      });
      console.log('🏷️ TagsComponent: Resposta da API:', res.status, res.statusText);
      if (!res.ok) throw new Error('Erro ao carregar tags');
      const data = await res.json();
      console.log('🏷️ TagsComponent: Dados carregados:', data?.length || 0, 'tags');
      setTags(Array.isArray(data) ? data : (data.tags || []));
    } catch (e) {
      console.error('🏷️ TagsComponent: Erro ao carregar tags:', e);
      setError('Erro ao carregar tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const categories = [...new Set(tags.map(tag => tag.category).filter(Boolean))];

  const filteredTags = tags.filter(tag => {
    const matchesQuery = query === '' || 
      tag.name.toLowerCase().includes(query.toLowerCase()) ||
      (tag.description && tag.description.toLowerCase().includes(query.toLowerCase()));
    
    const matchesCategory = selectedCategory === '' || tag.category === selectedCategory;
    
    return matchesQuery && matchesCategory;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: 'bg-blue-500',
      category: '',
      priority: 1
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Nome da tag é obrigatório');
      return;
    }

    try {
      const url = editingTag 
        ? apiUrl(`/api/tags/${editingTag.id}`)
        : apiUrl('/api/tags');
      
      const method = editingTag ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao salvar tag');
      }

      setSuccess(editingTag ? 'Tag atualizada com sucesso!' : 'Tag criada com sucesso!');
      resetForm();
      setEditingTag(null);
      setShowCreateModal(false);
      await fetchTags();
    } catch (e) {
      setError(e.message || 'Erro ao salvar tag');
    }
  };

  const handleEdit = (tag) => {
    setFormData({
      name: tag.name,
      description: tag.description || '',
      color: tag.color,
      category: tag.category || '',
      priority: tag.priority || 1
    });
    setEditingTag(tag);
    setShowCreateModal(true);
  };

  const handleDelete = async (tagId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta tag?')) return;

    try {
  const res = await fetch(apiUrl(`/api/tags/${tagId}`), {
        method: 'DELETE',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) throw new Error('Erro ao excluir tag');

      setSuccess('Tag excluída com sucesso!');
      await fetchTags();
    } catch (e) {
      setError(e.message || 'Erro ao excluir tag');
    }
  };

  const handleAddPredefined = async (predefinedTag) => {
    try {
  const res = await fetch(apiUrl('/api/tags'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: predefinedTag.name,
          color: predefinedTag.color,
          category: predefinedTag.category,
          priority: 1
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.error && errorData.error.includes('already exists')) {
          setError(`A tag "${predefinedTag.name}" já existe`);
          return;
        }
        throw new Error(errorData.error || 'Erro ao criar tag');
      }

      setSuccess(`Tag "${predefinedTag.name}" adicionada com sucesso!`);
      await fetchTags();
    } catch (e) {
      setError(e.message || 'Erro ao adicionar tag');
    }
  };

  const getColorClasses = (color) => {
    const colorMap = predefinedColors.find(c => c.value === color);
    return colorMap || predefinedColors[0];
  };

  const getTagStats = () => {
    const stats = {
      total: tags.length,
      categories: categories.length,
      byCategory: {}
    };

    categories.forEach(category => {
      stats.byCategory[category] = tags.filter(tag => tag.category === category).length;
    });

    return stats;
  };

  const stats = getTagStats();

  return (
    <div className="p-6 min-h-screen bg-slate-900">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Tags</h1>
            <p className="text-slate-400 mt-1">Organize e classifique seus atendimentos</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPredefinedModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
            >
              <Squares2X2Icon className="w-5 h-5" />
              Tags Pré-definidas
            </button>
            <button
              onClick={() => {
                resetForm();
                setEditingTag(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200"
            >
              <PlusIcon className="w-5 h-5" />
              Nova Tag
            </button>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-900/20 rounded-lg">
              <TagIcon className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-slate-400">Total de Tags</div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-900/20 rounded-lg">
              <FunnelIcon className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.categories}</div>
              <div className="text-sm text-slate-400">Categorias</div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-900/20 rounded-lg">
              <ChartBarIcon className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{filteredTags.length}</div>
              <div className="text-sm text-slate-400">Tags Filtradas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Buscar por nome ou descrição..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="lg:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="">Todas as categorias</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-700 border border-slate-600 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-yellow-500 text-slate-900' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Squares2X2Icon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-yellow-500 text-slate-900' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tags Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTags.map(tag => {
            const colorClasses = getColorClasses(tag.color);
            return (
              <div key={tag.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} border`}>
                    <TagIcon className="w-4 h-4" />
                    {tag.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(tag)}
                      className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {tag.description && (
                  <p className="text-sm text-slate-400 mb-3">{tag.description}</p>
                )}
                
                <div className="flex items-center justify-between text-xs text-slate-500">
                  {tag.category && (
                    <span className="px-2 py-1 bg-slate-700 rounded">{tag.category}</span>
                  )}
                  <span>Prioridade: {tag.priority || 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-700 border-b border-slate-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Tag</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Prioridade</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredTags.map(tag => {
                  const colorClasses = getColorClasses(tag.color);
                  return (
                    <tr key={tag.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} border`}>
                          <TagIcon className="w-4 h-4" />
                          {tag.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {tag.category && (
                          <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm">{tag.category}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {tag.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {tag.priority || 1}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(tag)}
                            className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tag.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTags.length === 0 && (
        <div className="text-center py-12">
          <TagIcon className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-medium text-white">Nenhuma tag encontrada</h3>
          <p className="mt-2 text-sm text-slate-400">
            {query || selectedCategory
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece criando sua primeira tag para organizar os atendimentos.'
            }
          </p>
          {!query && !selectedCategory && (
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200"
            >
              <PlusIcon className="w-5 h-5" />
              Criar Primeira Tag
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingTag ? 'Editar Tag' : 'Nova Tag'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTag(null);
                  resetForm();
                }}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome da Tag *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Ex: Cliente VIP"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Descrição opcional da tag"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Categoria
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Ex: Status, Departamento, Prioridade"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cor
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {predefinedColors.map((color, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${color.value} ${
                        formData.color === color.value
                          ? 'border-white scale-110'
                          : 'border-slate-600 hover:border-slate-400'
                      }`}
                      title={color.name}
                    >
                      {formData.color === color.value && (
                        <CheckIcon className="w-5 h-5 text-white mx-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Prioridade
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value={1}>1 - Baixa</option>
                  <option value={2}>2 - Normal</option>
                  <option value={3}>3 - Alta</option>
                  <option value={4}>4 - Urgente</option>
                  <option value={5}>5 - Crítica</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTag(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200"
                >
                  {editingTag ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Predefined Tags Modal */}
      {showPredefinedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Tags Pré-definidas</h2>
              <button
                onClick={() => setShowPredefinedModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {predefinedTags.map((tag, index) => {
                const colorClasses = getColorClasses(tag.color);
                const tagExists = tags.some(existingTag => existingTag.name === tag.name);
                
                return (
                  <div key={index} className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} border`}>
                        <TagIcon className="w-4 h-4" />
                        {tag.name}
                      </div>
                      <button
                        onClick={() => handleAddPredefined(tag)}
                        disabled={tagExists}
                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                          tagExists
                            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                            : 'bg-yellow-500 text-slate-900 hover:bg-yellow-600'
                        }`}
                      >
                        {tagExists ? 'Já existe' : 'Adicionar'}
                      </button>
                    </div>
                    <div className="text-xs text-slate-400">
                      Categoria: {tag.category}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
