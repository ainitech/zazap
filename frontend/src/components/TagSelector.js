import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  TagIcon,
  XMarkIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { apiFetch } from '../utils/apiClient';
import AuthService from '../services/authService.js';

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

export default function TagSelector({ 
  ticketId, 
  selectedTags = [], 
  onTagsChange,
  className = "",
  compact = false,
  readOnly = false 
}) {
  const [availableTags, setAvailableTags] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagForm, setNewTagForm] = useState({
    name: '',
    color: 'bg-blue-500',
    category: ''
  });

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const { apiUrl } = require('../utils/apiClient');

  useEffect(() => {
    if (isOpen) {
      fetchAvailableTags();
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowCreateForm(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchAvailableTags = async () => {
    try {
      setLoading(true);
      const response = await AuthService.get(apiUrl('/api/tags?limit=100'));
      
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.tags || []);
      }
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = availableTags.filter(tag => 
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedTags.some(selectedTag => selectedTag.id === tag.id)
  );

  const addTagToTicket = async (tag) => {
    if (!ticketId) return;

    try {
      const response = await AuthService.post(apiUrl(`/api/tags/ticket/${ticketId}/tag/${tag.id}`));

      if (response.ok) {
        const updatedTags = [...selectedTags, tag];
        onTagsChange?.(updatedTags);
        setSearchQuery('');
      } else {
        const error = await response.json();
        console.error('Erro ao adicionar tag:', error.error);
      }
    } catch (error) {
      console.error('Erro ao adicionar tag:', error);
    }
  };

  const removeTagFromTicket = async (tag) => {
    if (!ticketId) return;

    try {
      const response = await AuthService.delete(apiUrl(`/api/tags/ticket/${ticketId}/tag/${tag.id}`));

      if (response.ok) {
        const updatedTags = selectedTags.filter(t => t.id !== tag.id);
        onTagsChange?.(updatedTags);
      } else {
        const error = await response.json();
        console.error('Erro ao remover tag:', error.error);
      }
    } catch (error) {
      console.error('Erro ao remover tag:', error);
    }
  };

  const createNewTag = async () => {
    if (!newTagForm.name.trim()) return;

    try {
      const response = await AuthService.post(apiUrl('/api/tags'), newTagForm);

      if (response.ok) {
        const newTag = await response.json();
        setAvailableTags([...availableTags, newTag]);
        
        // Adicionar automaticamente ao ticket se tiver ticketId
        if (ticketId) {
          await addTagToTicket(newTag);
        }
        
        setNewTagForm({ name: '', color: 'bg-blue-500', category: '' });
        setShowCreateForm(false);
        setSearchQuery('');
      } else {
        const error = await response.json();
        console.error('Erro ao criar tag:', error.error);
      }
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    }
  };

  const getColorClasses = (color) => {
    const colorMap = predefinedColors.find(c => c.value === color);
    return colorMap || predefinedColors[0];
  };

  if (compact) {
    const modal = isOpen ? createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
        {/* Modal */}
        <div
          ref={dropdownRef}
          className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 sm:p-5 max-w-md w-full max-h-[80vh] overflow-y-auto animate-fade-in"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Adicionar Tags</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-800 rounded transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Buscar tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {showCreateForm ? (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4 animate-fade-in">
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nome da tag"
                    value={newTagForm.name}
                    onChange={(e) => setNewTagForm({ ...newTagForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Categoria (opcional)"
                    value={newTagForm.category}
                    onChange={(e) => setNewTagForm({ ...newTagForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <div className="flex flex-wrap gap-2">
                    {predefinedColors.map((color, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewTagForm({ ...newTagForm, color: color.value })}
                        className={`w-7 h-7 rounded-full ring-2 transition ${
                          newTagForm.color === color.value
                            ? 'ring-yellow-400 scale-105'
                            : 'ring-transparent hover:ring-slate-600'
                        } ${color.value}`}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={createNewTag}
                      className="flex-1 px-3 py-2 bg-yellow-500 text-slate-900 font-medium rounded hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!newTagForm.name.trim()}
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCreateForm(false); setNewTagForm({ name: '', color: 'bg-blue-500', category: '' }); }}
                      className="flex-1 px-3 py-2 border border-slate-600 text-slate-300 rounded hover:bg-slate-700"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Available tags */}
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredTags.map(tag => {
                    const colorClasses = getColorClasses(tag.color);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => addTagToTicket(tag)}
                        className="w-full flex items-center gap-2 p-2 hover:bg-slate-800 rounded-lg transition-colors text-left"
                      >
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${colorClasses.bg} ${colorClasses.text}`}>
                          <TagIcon className="w-3 h-3" />
                          {tag.name}
                        </div>
                        {tag.category && (
                          <span className="text-xs text-slate-400">({tag.category})</span>
                        )}
                      </button>
                    );
                  })}
                  {filteredTags.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-sm">
                      {searchQuery ? 'Nenhuma tag encontrada' : 'Digite para buscar ou criar nova tag'}
                    </div>
                  )}
                </div>
                {/* Create new tag */}
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center gap-2 p-2 text-yellow-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Criar nova tag
                </button>
              </>
            )}
          </div>
        </div>
      </div>,
      document.body
    ) : null;

    return (
      <div className={`flex flex-wrap gap-1 justify-center ${className}`}>
        {selectedTags.map(tag => {
          const colorClasses = getColorClasses(tag.color);
          return (
            <div
              key={tag.id}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} border`}
            >
              <TagIcon className="w-3 h-3" />
              {tag.name}
              {!readOnly && (
                <button
                  onClick={() => removeTagFromTicket(tag)}
                  className="ml-1 hover:bg-red-100 rounded-full p-0.5 transition-colors"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        {!readOnly && (
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 border border-slate-600 text-slate-300 rounded-full text-xs hover:bg-slate-600 transition-colors"
          >
            <PlusIcon className="w-3 h-3" />
            Tag
          </button>
        )}
        {modal}
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center ${className}`} ref={dropdownRef}>
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 justify-center">
          {selectedTags.map(tag => {
            const colorClasses = getColorClasses(tag.color);
            return (
              <div
                key={tag.id}
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} border`}
              >
                <TagIcon className="w-4 h-4" />
                {tag.name}
                {!readOnly && (
                  <button
                    onClick={() => removeTagFromTicket(tag)}
                    className="ml-1 hover:bg-red-100 rounded-full p-1 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Tag Button */}
      {!readOnly && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
        >
          <TagIcon className="w-5 h-5" />
          Adicionar Tag
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          <div className="p-4">
            {/* Search */}
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Buscar tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Create new tag form */}
            {showCreateForm && (
              <div className="mb-3 p-3 bg-slate-700 rounded-lg border border-slate-600">
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nome da tag"
                    value={newTagForm.name}
                    onChange={(e) => setNewTagForm({ ...newTagForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-white placeholder-slate-400 rounded focus:ring-2 focus:ring-yellow-500"
                  />
                  
                  <input
                    type="text"
                    placeholder="Categoria (opcional)"
                    value={newTagForm.category}
                    onChange={(e) => setNewTagForm({ ...newTagForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-white placeholder-slate-400 rounded focus:ring-2 focus:ring-yellow-500"
                  />

                  <div className="flex gap-1 flex-wrap">
                    {predefinedColors.slice(0, 6).map((color, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setNewTagForm({ ...newTagForm, color: color.value })}
                        className={`w-6 h-6 rounded border-2 ${color.value} ${
                          newTagForm.color === color.value
                            ? 'border-white'
                            : 'border-slate-500'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={createNewTag}
                      className="flex-1 px-3 py-1 bg-yellow-500 text-slate-900 rounded hover:bg-yellow-600 text-sm"
                    >
                      Criar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 px-3 py-1 border border-slate-600 text-slate-300 rounded hover:bg-slate-600 text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Available tags */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {loading ? (
                <div className="text-center py-4 text-slate-400">Carregando...</div>
              ) : filteredTags.length > 0 ? (
                filteredTags.map(tag => {
                  const colorClasses = getColorClasses(tag.color);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => addTagToTicket(tag)}
                      className="w-full flex items-center justify-between p-2 hover:bg-slate-700 rounded-lg transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${colorClasses.bg} ${colorClasses.text}`}>
                          <TagIcon className="w-3 h-3" />
                          {tag.name}
                        </div>
                        {tag.category && (
                          <span className="text-xs text-slate-400">({tag.category})</span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : searchQuery ? (
                <div className="text-center py-4 text-slate-400">
                  Nenhuma tag encontrada
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400">
                  Digite para buscar tags
                </div>
              )}
            </div>

            {/* Create new tag button */}
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center gap-2 p-2 text-yellow-400 hover:bg-slate-700 rounded-lg transition-colors mt-2"
              >
                <PlusIcon className="w-4 h-4" />
                Criar nova tag
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
