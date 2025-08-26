import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  PencilIcon, 
  ClockIcon, 
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  UserIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { apiFetch, safeJson } from '../../utils/apiClient';

export default function ScheduleEditModal({ isOpen, item, onClose, onUpdated }) {
  const [form, setForm] = useState({ 
    sessionId: '', 
    to: '', 
    type: 'text', 
    text: '', 
    sendAt: '' 
  });
  const [sessions, setSessions] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen || !item) {
      setForm({ sessionId: '', to: '', type: 'text', text: '', sendAt: '' });
      setFile(null);
      setErrors({});
      return;
    }
    
    // Populate form with item data
    const sendDate = new Date(item.sendAt);
    const localDateTime = new Date(sendDate.getTime() - sendDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    
    setForm({
      sessionId: item.sessionId || '',
      to: item.to || '',
      type: item.type || 'text',
      text: item.text || '',
      sendAt: localDateTime
    });
    
    const load = async () => {
      try {
        const r = await apiFetch('/api/sessions');
        const data = await safeJson(r);
        setSessions(data || []);
      } catch (e) {
        console.error('Falha ao carregar sessões', e);
      }
    };
    load();
  }, [isOpen, item]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.sessionId) newErrors.sessionId = 'Selecione uma sessão';
    if (!form.to.trim()) newErrors.to = 'Digite o destinatário';
    if (!form.sendAt) newErrors.sendAt = 'Selecione data e hora';
    
    if (form.type === 'text' && !form.text.trim()) {
      newErrors.text = 'Digite a mensagem';
    }
    
    if (form.type === 'media' && !file && !item.filePath) {
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
      if (file) fd.append('file', file);
      
      const r = await apiFetch(`/api/schedules/${item.id}`, { 
        method: 'PUT', 
        headers: { Authorization: `Bearer ${token}` }, 
        body: fd 
      });
      
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.error || 'Falha ao atualizar agendamento');
      }
      
      const j = await r.json();
      onUpdated?.(j);
      onClose();
    } catch (e) {
      setErrors({ submit: e.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <PencilIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Editar Agendamento</h3>
                <p className="text-blue-100 text-sm">Modifique os detalhes do envio programado</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
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
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              Sessão WhatsApp
            </label>
            <select 
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.sessionId ? 'border-red-300' : 'border-gray-300'
              }`}
              value={form.sessionId} 
              onChange={e => setForm({ ...form, sessionId: e.target.value })}
            >
              <option value="">Selecione uma sessão</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.whatsappId} ({s.library}) - {s.status}
                </option>
              ))}
            </select>
            {errors.sessionId && <p className="text-red-600 text-xs mt-1">{errors.sessionId}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recipient */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <UserIcon className="w-4 h-4" />
                Destinatário
              </label>
              <input 
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.to ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="5511999999999@c.us"
                value={form.to} 
                onChange={e => setForm({ ...form, to: e.target.value })}
              />
              {errors.to && <p className="text-red-600 text-xs mt-1">{errors.to}</p>}
            </div>

            {/* Send Date */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <CalendarDaysIcon className="w-4 h-4" />
                Data e Hora de Envio
              </label>
              <input 
                type="datetime-local" 
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.sendAt ? 'border-red-300' : 'border-gray-300'
                }`}
                value={form.sendAt} 
                onChange={e => setForm({ ...form, sendAt: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.sendAt && <p className="text-red-600 text-xs mt-1">{errors.sendAt}</p>}
            </div>
          </div>

          {/* Type Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">Tipo de Conteúdo</label>
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
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{option.icon}</div>
                  <div className="text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {form.type === 'text' ? (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Mensagem</label>
              <textarea 
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  errors.text ? 'border-red-300' : 'border-gray-300'
                }`}
                rows={4} 
                placeholder="Digite sua mensagem aqui..."
                value={form.text} 
                onChange={e => setForm({ ...form, text: e.target.value })}
              />
              {errors.text && <p className="text-red-600 text-xs mt-1">{errors.text}</p>}
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Arquivo</label>
              {item.filePath && !file && (
                <div className="mb-3 p-3 bg-gray-50 border rounded-lg">
                  <p className="text-sm text-gray-600">
                    Arquivo atual: <span className="font-medium">{item.fileName || 'arquivo'}</span>
                  </p>
                </div>
              )}
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center ${
                  errors.file ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {file ? (
                  <div className="space-y-2">
                    <div className="text-green-600">✓ Novo arquivo selecionado</div>
                    <div className="text-sm text-gray-600">{file.name}</div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remover novo arquivo
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <ArrowUpTrayIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-600 mb-1">
                      {item.filePath ? 'Substituir arquivo' : 'Selecionar arquivo'}
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={e => setFile(e.target.files?.[0] || null)} 
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    />
                  </label>
                )}
              </div>
              {errors.file && <p className="text-red-600 text-xs mt-1">{errors.file}</p>}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={submit}
            disabled={loading} 
            className="px-6 py-2 bg-blue-500 hover:bg-blue-400 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Salvando...
              </>
            ) : (
              <>
                <PencilIcon className="w-4 h-4" />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
