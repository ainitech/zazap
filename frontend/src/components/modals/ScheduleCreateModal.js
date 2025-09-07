import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Send, 
  Clock, 
  Upload,
  Calendar,
  User,
  MessageSquare,
  Search,
  Check,
  Users,
  Phone,
  CloudUpload,
  List,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { apiFetch, safeJson } from '../../utils/apiClient';
import AuthService from '../../services/authService.js';

export default function ScheduleCreateModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({
    sessionId: '',
    contactId: '',
    to: '',
    queueId: null,
    type: 'text',
    text: '',
    sendAt: '',
    isRecurring: false,
    recurringType: 'daily', // daily, weekly, monthly
    recurringInterval: 1,
    recurringEndDate: '',
    priority: 'normal' // low, normal, high
  });
  const [sessions, setSessions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [queues, setQueues] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Load contacts for a specific session (shared helper)
  const loadContactsForSession = useCallback(async (_sessionId, search = '') => {
    try {
      const params = new URLSearchParams();
      params.append('limit', 'all');
      if (search && search.trim()) params.append('search', search.trim());

      const res = await apiFetch(`/api/contacts?${params.toString()}`);
      const data = await safeJson(res);
      setContacts(data || []);
      setFilteredContacts(data || []);
    } catch (e) {
      console.error('Erro ao carregar contatos:', e);
      setContacts([]);
      setFilteredContacts([]);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setForm({ 
        sessionId: '', 
        contactId: '', 
        to: '', 
        queueId: null,
        type: 'text', 
        text: '', 
        sendAt: '',
        isRecurring: false,
        recurringType: 'daily',
        recurringInterval: 1,
        recurringEndDate: '',
        priority: 'normal'
      });
      setFile(null);
      setErrors({});
      setContactSearch('');
      setShowContactPicker(false);
      return;
    }
    
    const loadData = async () => {
      try {
        const [sessionsRes, queuesRes] = await Promise.all([
          apiFetch('/api/sessions'),
          apiFetch('/api/queues')
        ]);
        
        const sessionsData = await safeJson(sessionsRes);
        const queuesData = await safeJson(queuesRes);

        const activeSessions = (sessionsData || []).filter(s => 
          s.status === 'connected' || s.currentStatus === 'connected'
        );
        const sessionsToUse = activeSessions.length ? activeSessions : (sessionsData || []);

        setSessions(sessionsToUse);
        setQueues(queuesData || []);

        // If we have at least one session and none selected, select first and load its contacts
        if (sessionsToUse.length && !form.sessionId) {
          const firstId = sessionsToUse[0].id;
          setForm(f => ({ ...f, sessionId: firstId }));
          await loadContactsForSession(firstId);
        }
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
        setErrors(prev => ({ ...prev, submit: 'Falha ao carregar dados iniciais. Verifique o backend.' }));
      }
    };

    loadData();
  }, [isOpen]);

  // Search contacts in backend when contactSearch changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadContactsForSession(null, contactSearch);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [contactSearch, loadContactsForSession]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.sessionId) newErrors.sessionId = 'Selecione uma sessão ativa';
    if (!form.to.trim()) newErrors.to = 'Digite o destinatário ou selecione um contato';
    if (!form.sendAt) newErrors.sendAt = 'Selecione data e hora';
    
    if (form.type === 'text' && !form.text.trim()) {
      newErrors.text = 'Digite a mensagem';
    }
    
    if (form.type === 'media' && !file) {
      newErrors.file = 'Selecione um arquivo';
    }

    // Validate date is in the future
    if (form.sendAt) {
      const sendDate = new Date(form.sendAt);
      const now = new Date();
      if (sendDate <= now) {
        newErrors.sendAt = 'A data deve ser no futuro';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContactSelect = (contact) => {
    const to = contact.whatsappId || (contact.formattedNumber ? `${contact.formattedNumber.replace(/\D/g,'')}@c.us` : '');
    setForm(prev => ({ 
      ...prev, 
      contactId: contact.id,
      to
    }));
    setShowContactPicker(false);
    setContactSearch('');
  };

  const clearContactSelection = () => {
    setForm(prev => ({ ...prev, contactId: '', to: '' }));
    setShowContactPicker(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('sessionId', form.sessionId);
      fd.append('to', form.to);
      fd.append('type', form.type);
      fd.append('text', form.text);
      fd.append('sendAt', form.sendAt);
      
      // Optional fields
      if (form.contactId) fd.append('contactId', form.contactId);
      if (form.queueId) fd.append('queueId', form.queueId);
      if (form.priority) fd.append('priority', form.priority);
      
      // Recurring fields
      if (form.isRecurring) {
        fd.append('isRecurring', 'true');
        fd.append('recurringType', form.recurringType);
        fd.append('recurringInterval', form.recurringInterval.toString());
        if (form.recurringEndDate) fd.append('recurringEndDate', form.recurringEndDate);
      }
      
      if (file) fd.append('file', file);
      
      const r = await apiFetch('/api/schedules', { method: 'POST', body: fd });
      
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.error || 'Falha ao criar agendamento');
      }
      
      const j = await r.json();
      onCreated?.(j);
      onClose();
    } catch (e) {
      setErrors({ submit: e.message });
    } finally {
      setLoading(false);
    }
  };

  const normalizeRecipient = (value) => {
    if (!value) return '';
    if (value.includes('@')) return value.trim();
    const digits = value.replace(/\D/g, '');
    return digits ? `${digits}@c.us` : '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-yellow-500 to-yellow-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Novo Agendamento</h3>
                <p className="text-yellow-100 text-sm">Programe uma mensagem para envio automático</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={submit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Session Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <MessageSquare className="w-4 h-4" />
              Sessão WhatsApp
            </label>
            <select 
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
                errors.sessionId ? 'border-red-300' : 'border-slate-300'
              }`}
              value={form.sessionId}
              onChange={async e => {
                const newSessionId = e.target.value;
                setForm({ ...form, sessionId: newSessionId, contactId: '', to: '' });
                await loadContactsForSession(newSessionId);
              }}
            >
              <option value="">Selecione uma sessão ativa</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.whatsappId} ({s.library})
                </option>
              ))}
            </select>
            {errors.sessionId && <p className="text-red-600 text-xs mt-1">{errors.sessionId}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact/Recipient Selection */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Users className="w-4 h-4" />
                Destinatário
              </label>
              
              <div className="relative">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={form.to}
                    onChange={(e) => setForm(prev => ({ ...prev, to: e.target.value, contactId: '' }))}
                    onBlur={(e) => {
                      const normalized = normalizeRecipient(e.target.value);
                      if (normalized && normalized !== form.to) {
                        setForm(prev => ({ ...prev, to: normalized }));
                      }
                    }}
                    placeholder="Digite o número ou selecione um contato"
                    className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${errors.to ? 'border-red-300' : 'border-slate-300'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowContactPicker(!showContactPicker)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  {form.contactId && (
                    <button
                      type="button"
                      onClick={clearContactSelection}
                      className="px-3 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Contact Picker Dropdown */}
                {showContactPicker && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    <div className="p-3 border-b border-slate-200">
                      <input
                        type="text"
                        placeholder="Buscar contatos..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredContacts.length > 0 ? (
                        filteredContacts.map(contact => (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => handleContactSelect(contact)}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                                <Users className="w-4 h-4 text-slate-600" />
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{contact.name}</div>
                                <div className="text-sm text-slate-500">{contact.whatsappId}</div>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-slate-500 text-center">
                          {contacts.length === 0 ? 'Nenhum contato encontrado' : 'Nenhum resultado para a busca'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {form.contactId && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ Contato selecionado da agenda
                </div>
              )}
              
              {errors.to && <p className="text-red-600 text-xs mt-1">{errors.to}</p>}
              <p className="text-slate-500 text-xs mt-1">
                Use o botão para selecionar da agenda ou digite manualmente
              </p>
            </div>

            {/* Send Date */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4" />
                Data e Hora de Envio
              </label>
              <input 
                type="datetime-local" 
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent ${
                  errors.sendAt ? 'border-red-300' : 'border-slate-300'
                }`}
                value={form.sendAt} 
                onChange={e => setForm({ ...form, sendAt: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.sendAt && <p className="text-red-600 text-xs mt-1">{errors.sendAt}</p>}
            </div>

            {/* Priority */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Prioridade
              </label>
              <select 
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                value={form.priority} 
                onChange={e => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">🔵 Baixa</option>
                <option value="normal">⚪ Normal</option>
                <option value="high">🔴 Alta</option>
              </select>
              <p className="text-slate-500 text-xs mt-1">
                Mensagens de alta prioridade são processadas primeiro
              </p>
            </div>
          </div>

          {/* Recurring Options */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="isRecurring"
                checked={form.isRecurring}
                onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                className="w-4 h-4 text-yellow-600 border-slate-300 rounded focus:ring-yellow-500"
              />
              <label htmlFor="isRecurring" className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <RotateCcw className="w-4 h-4" />
                Agendamento Recorrente
              </label>
            </div>

            {form.isRecurring && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Repetir</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    value={form.recurringType} 
                    onChange={e => setForm({ ...form, recurringType: e.target.value })}
                  >
                    <option value="daily">Diariamente</option>
                    <option value="weekly">Semanalmente</option>
                    <option value="monthly">Mensalmente</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">A cada</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={form.recurringInterval}
                    onChange={(e) => setForm({ ...form, recurringInterval: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Até</label>
                  <input
                    type="date"
                    value={form.recurringEndDate}
                    onChange={(e) => setForm({ ...form, recurringEndDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Queue Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <List className="w-4 h-4" />
              Fila (Opcional)
            </label>
            <select 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              value={form.queueId || ''} 
              onChange={e => setForm({ ...form, queueId: e.target.value || null })}
            >
              <option value="">Nenhuma fila específica</option>
              {queues.map(queue => (
                <option key={queue.id} value={queue.id}>
                  {queue.name}
                </option>
              ))}
            </select>
            <p className="text-slate-500 text-xs mt-1">
              Opcional: associar o agendamento a uma fila específica
            </p>
          </div>

          {/* Type Selection */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-3 block">Tipo de Conteúdo</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'text', label: 'Mensagem de Texto', icon: '💬' },
                { value: 'media', label: 'Arquivo/Mídia', icon: '📎' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: option.value })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    form.type === option.value
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{option.icon}</div>
                  <div className="text-sm font-medium text-slate-700">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Templates */}
          {form.type === 'text' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-3 block">Templates Rápidos</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: '👋 Saudação', text: 'Olá! Como posso ajudá-lo hoje?' },
                  { label: '📅 Lembrete', text: 'Olá! Este é um lembrete sobre nosso compromisso.' },
                  { label: '🎉 Promoção', text: 'Oferta especial só para você! Não perca!' },
                  { label: '✅ Confirmação', text: 'Confirmamos seu agendamento. Obrigado!' },
                  { label: '❓ Dúvidas', text: 'Tem alguma dúvida? Estou aqui para ajudar!' },
                  { label: '🕒 Horário', text: 'Nosso horário de funcionamento é de segunda a sexta, das 8h às 18h.' },
                  { label: '📞 Contato', text: 'Para urgências, entre em contato pelo telefone.' },
                  { label: '🙏 Agradecimento', text: 'Obrigado por escolher nossos serviços!' }
                ].map((template, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setForm({ ...form, text: template.text })}
                    className="p-3 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors text-left"
                  >
                    <div className="font-medium text-slate-900">{template.label}</div>
                    <div className="text-slate-500 mt-1 truncate">{template.text.substring(0, 40)}...</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          {form.type === 'text' ? (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Mensagem</label>
              <textarea 
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none ${
                  errors.text ? 'border-red-300' : 'border-slate-300'
                }`}
                rows={4} 
                placeholder="Digite sua mensagem aqui..."
                value={form.text} 
                onChange={e => setForm({ ...form, text: e.target.value })}
              />
              {errors.text && <p className="text-red-600 text-xs mt-1">{errors.text}</p>}
              <p className="text-slate-500 text-xs mt-1">
                {form.text.length}/1000 caracteres
              </p>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Arquivo</label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center ${
                  errors.file ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                {file ? (
                  <div className="space-y-2">
                    <div className="text-green-600">✓ Arquivo selecionado</div>
                    <div className="text-sm text-slate-600">{file.name}</div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remover arquivo
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <CloudUpload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <div className="text-slate-600 mb-2">Clique para selecionar ou arraste um arquivo</div>
                    <div className="text-sm text-slate-500">PNG, JPG, GIF, PDF, DOC, MP4, MP3 até 10MB</div>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={e => setFile(e.target.files?.[0] || null)} 
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    />
                  </label>
                )}
              </div>
              {form.type === 'media' && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Legenda (Opcional)</label>
                  <textarea 
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                    rows={2} 
                    placeholder="Digite uma legenda para o arquivo..."
                    value={form.text} 
                    onChange={e => setForm({ ...form, text: e.target.value })}
                  />
                  <p className="text-slate-500 text-xs mt-1">
                    {form.text.length}/200 caracteres
                  </p>
                </div>
              )}
              {errors.file && <p className="text-red-600 text-xs mt-1">{errors.file}</p>}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={submit}
            disabled={loading} 
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full"></div>
                Agendando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Agendar Envio
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
