import React, { useState, useEffect } from 'react';
import { XMarkIcon, PhotoIcon, UserGroupIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AuthService from '../../services/authService.js';

const CampaignModal = ({ isOpen, onClose, campaign = null, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    message: '',
    mediaUrl: '',
    mediaType: '',
    segmentationType: 'all',
    tagIds: [],
    contactIds: [],
    scheduledAt: '',
    intervalSeconds: 30,
    sessionId: ''
  });
  const [tags, setTags] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // 1: Básico, 2: Segmentação, 3: Agendamento
  const [showTagModal, setShowTagModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (campaign) {
        setFormData({
          name: campaign.name || '',
          description: campaign.description || '',
          message: campaign.message || '',
          mediaUrl: campaign.mediaUrl || '',
          mediaType: campaign.mediaType || '',
          segmentationType: campaign.segmentationType || 'all',
          tagIds: campaign.tagIds || [],
          contactIds: campaign.contactIds || [],
          scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16) : '',
          intervalSeconds: campaign.intervalSeconds || 30,
          sessionId: campaign.sessionId || ''
        });
      } else {
        setFormData({
          name: '',
          description: '',
          message: '',
          mediaUrl: '',
          mediaType: '',
          segmentationType: 'all',
          tagIds: [],
          contactIds: [],
          scheduledAt: '',
          intervalSeconds: 30,
          sessionId: ''
        });
      }
    }
  }, [isOpen, campaign]);

  const fetchData = async () => {
    try {
      const [tagsRes, contactsRes, sessionsRes] = await Promise.all([
        AuthService.get('/api/tags'),
        AuthService.get('/api/contacts'),
        AuthService.get('/api/sessions')
      ]);

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(tagsData.tags || tagsData);
      }

      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(contactsData.contacts || contactsData);
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.sessions || sessionsData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleTagSelection = (tagId) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }));
  };

  const handleContactSelection = (contactId) => {
    setFormData(prev => ({
      ...prev,
      contactIds: prev.contactIds.includes(contactId)
        ? prev.contactIds.filter(id => id !== contactId)
        : [...prev.contactIds, contactId]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Mensagem é obrigatória';
    }

    if (!formData.sessionId) {
      newErrors.sessionId = 'Sessão é obrigatória';
    }

    if (formData.segmentationType === 'tags' && formData.tagIds.length === 0) {
      newErrors.tagIds = 'Selecione pelo menos uma tag';
    }

    if (formData.segmentationType === 'manual' && formData.contactIds.length === 0) {
      newErrors.contactIds = 'Selecione pelo menos um contato';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const url = campaign ? `/api/campaigns/${campaign.id}` : '/api/campaigns';
      const data = {
        ...formData,
        scheduledAt: formData.scheduledAt || null
      };

      const response = campaign 
        ? await AuthService.put(url, data)
        : await AuthService.post(url, data);

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || 'Erro ao salvar campanha' });
      }
    } catch (error) {
      setErrors({ submit: 'Erro de conexão' });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.name.trim() || !formData.message.trim() || !formData.sessionId) {
        setErrors({
          name: !formData.name.trim() ? 'Nome é obrigatório' : null,
          message: !formData.message.trim() ? 'Mensagem é obrigatória' : null,
          sessionId: !formData.sessionId ? 'Sessão é obrigatória' : null
        });
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">
            {campaign ? 'Editar Campanha' : 'Nova Campanha'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 hover:bg-slate-700 rounded-lg p-1 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center">
            {[1, 2, 3].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step >= stepNumber 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-slate-600 text-gray-400'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step > stepNumber 
                      ? 'bg-yellow-600' 
                      : 'bg-slate-600'
                  }`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-400">
            <span>Informações Básicas</span>
            <span>Segmentação</span>
            <span>Agendamento</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Step 1: Informações Básicas */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nome da Campanha *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                    placeholder="Ex: Promoção Black Friday"
                  />
                  {errors.name && (
                    <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                    placeholder="Descrição da campanha..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Mensagem *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                    placeholder="Digite a mensagem que será enviada..."
                  />
                  {errors.message && (
                    <p className="text-red-400 text-sm mt-1">{errors.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Sessão do WhatsApp *
                  </label>
                  <select
                    name="sessionId"
                    value={formData.sessionId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                  >
                    <option value="">Selecione uma sessão</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.whatsappId} ({session.status})
                      </option>
                    ))}
                  </select>
                  {errors.sessionId && (
                    <p className="text-red-400 text-sm mt-1">{errors.sessionId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Intervalo entre Mensagens (segundos)
                  </label>
                  <input
                    type="number"
                    name="intervalSeconds"
                    value={formData.intervalSeconds}
                    onChange={handleInputChange}
                    min="10"
                    max="300"
                    className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Recomendado: 30-60 segundos para evitar bloqueios
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Mídia (opcional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      name="mediaUrl"
                      value={formData.mediaUrl}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                      placeholder="URL da imagem, vídeo ou documento"
                    />
                    <select
                      name="mediaType"
                      value={formData.mediaType}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                    >
                      <option value="">Tipo</option>
                      <option value="image">Imagem</option>
                      <option value="video">Vídeo</option>
                      <option value="audio">Áudio</option>
                      <option value="document">Documento</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Segmentação */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    Tipo de Segmentação
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, segmentationType: 'all' }))}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        formData.segmentationType === 'all'
                          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                          : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center">
                        <UserGroupIcon className={`w-6 h-6 mr-3 ${
                          formData.segmentationType === 'all' ? 'text-yellow-400' : 'text-blue-400'
                        }`} />
                        <div>
                          <div className="font-medium">Todos os contatos</div>
                          <div className="text-sm opacity-75">Enviar para todos os contatos disponíveis</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, segmentationType: 'tags' }))}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        formData.segmentationType === 'tags'
                          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                          : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className={`w-6 h-6 mr-3 rounded text-white text-sm flex items-center justify-center ${
                          formData.segmentationType === 'tags' ? 'bg-yellow-500' : 'bg-green-600'
                        }`}>#</span>
                        <div>
                          <div className="font-medium">Por tags</div>
                          <div className="text-sm opacity-75">Segmentar contatos por tags específicas</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, segmentationType: 'manual' }))}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        formData.segmentationType === 'manual'
                          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                          : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className={`w-6 h-6 mr-3 rounded text-white text-sm flex items-center justify-center ${
                          formData.segmentationType === 'manual' ? 'bg-yellow-500' : 'bg-purple-600'
                        }`}>✓</span>
                        <div>
                          <div className="font-medium">Seleção manual</div>
                          <div className="text-sm opacity-75">Escolher contatos individualmente</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {formData.segmentationType === 'tags' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-300">
                        Tags Selecionadas
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowTagModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg transition-all text-sm"
                      >
                        Selecionar Tags
                      </button>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 min-h-[60px]">
                      {formData.tagIds.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {formData.tagIds.map((tagId) => {
                            const tag = tags.find(t => t.id === tagId);
                            return tag ? (
                              <span 
                                key={tagId}
                                className="px-2 py-1 rounded text-xs text-white"
                                style={{ backgroundColor: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">Nenhuma tag selecionada</p>
                      )}
                    </div>
                    {errors.tagIds && (
                      <p className="text-red-400 text-sm mt-1">{errors.tagIds}</p>
                    )}
                  </div>
                )}

                {formData.segmentationType === 'manual' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-300">
                        Contatos Selecionados
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowContactModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg transition-all text-sm"
                      >
                        Selecionar Contatos
                      </button>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 min-h-[60px]">
                      {formData.contactIds.length > 0 ? (
                        <div className="space-y-2">
                          {formData.contactIds.slice(0, 3).map((contactId) => {
                            const contact = contacts.find(c => c.id === contactId);
                            return contact ? (
                              <div key={contactId} className="flex items-center text-white text-sm">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                <span className="font-medium mr-1">{contact.name}</span>
                                <span className="text-gray-400">({contact.phoneNumber})</span>
                              </div>
                            ) : null;
                          })}
                          {formData.contactIds.length > 3 && (
                            <p className="text-gray-400 text-xs">
                              +{formData.contactIds.length - 3} contatos a mais
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">Nenhum contato selecionado</p>
                      )}
                    </div>
                    {errors.contactIds && (
                      <p className="text-red-400 text-sm mt-1">{errors.contactIds}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Agendamento */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Agendamento (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduledAt"
                    value={formData.scheduledAt}
                    onChange={handleInputChange}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Deixe em branco para iniciar imediatamente
                  </p>
                </div>

                {/* Resumo da Campanha */}
                <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                  <h3 className="font-medium text-white mb-2">
                    Resumo da Campanha
                  </h3>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div>
                      <span className="font-medium text-yellow-400">Nome:</span> {formData.name}
                    </div>
                    <div>
                      <span className="font-medium text-yellow-400">Segmentação:</span>{' '}
                      {formData.segmentationType === 'all' && 'Todos os contatos'}
                      {formData.segmentationType === 'tags' && `${formData.tagIds.length} tag(s) selecionada(s)`}
                      {formData.segmentationType === 'manual' && `${formData.contactIds.length} contato(s) selecionado(s)`}
                    </div>
                    <div>
                      <span className="font-medium text-yellow-400">Intervalo:</span> {formData.intervalSeconds} segundos
                    </div>
                    {formData.scheduledAt && (
                      <div>
                        <span className="font-medium text-yellow-400">Agendado para:</span>{' '}
                        {new Date(formData.scheduledAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-800 text-red-400 rounded">
                {errors.submit}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t border-slate-700">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-2 text-gray-400 hover:text-gray-300 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Voltar
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-gray-300 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg transition-all"
                >
                  Próximo
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg disabled:opacity-50 transition-all"
                >
                  {loading ? 'Salvando...' : (campaign ? 'Atualizar' : 'Criar Campanha')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Seleção de Tags */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-slate-800 rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto border border-slate-700">
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Selecionar Tags</h3>
              <button
                onClick={() => setShowTagModal(false)}
                className="text-gray-400 hover:text-gray-300 hover:bg-slate-700 rounded-lg p-1"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                />
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tags
                  .filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((tag) => (
                  <label key={tag.id} className="flex items-center p-3 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.tagIds.includes(tag.id)}
                      onChange={() => handleTagSelection(tag.id)}
                      className="mr-3 text-yellow-500 focus:ring-yellow-500"
                    />
                    <span 
                      className="px-2 py-1 rounded text-xs text-white mr-2"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                    <span className="text-sm text-gray-400">
                      ({tag.category})
                    </span>
                  </label>
                ))}
              </div>
              
              <div className="flex justify-end mt-4 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setShowTagModal(false)}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg transition-all"
                >
                  Confirmar ({formData.tagIds.length} selecionadas)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Contatos */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-slate-800 rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto border border-slate-700">
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Selecionar Contatos</h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-gray-400 hover:text-gray-300 hover:bg-slate-700 rounded-lg p-1"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar contatos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                />
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {contacts
                  .filter(contact => 
                    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    contact.phoneNumber.includes(searchTerm)
                  )
                  .map((contact) => (
                  <label key={contact.id} className="flex items-center p-3 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.contactIds.includes(contact.id)}
                      onChange={() => handleContactSelection(contact.id)}
                      className="mr-3 text-yellow-500 focus:ring-yellow-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">
                        {contact.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {contact.phoneNumber}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="flex justify-end mt-4 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg transition-all"
                >
                  Confirmar ({formData.contactIds.length} selecionados)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignModal;
