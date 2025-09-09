import React, { useState } from 'react';
import { apiUrl, apiFetch } from '../../utils/apiClient';
import { 
  ExclamationTriangleIcon,
  FlagIcon,
  ClockIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

// API base is resolved via apiUrl helper

export default function PriorityModal({ 
  isOpen, 
  onClose, 
  ticket, 
  onPriorityChange 
}) {
  const [selectedPriority, setSelectedPriority] = useState(ticket?.priority || 'normal');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const priorities = [
    {
      value: 'urgent',
      label: 'Urgente',
      color: 'text-red-400',
      bgColor: 'bg-red-900/30',
      borderColor: 'border-red-400',
      icon: '🔴',
      description: 'Requer atenção imediata'
    },
    {
      value: 'high',
      label: 'Alta',
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/30',
      borderColor: 'border-orange-400',
      icon: '🟠',
      description: 'Importante, resolver rapidamente'
    },
    {
      value: 'normal',
      label: 'Normal',
      color: 'text-gray-400',
      bgColor: 'bg-gray-900/30',
      borderColor: 'border-gray-400',
      icon: '⚪',
      description: 'Prioridade padrão'
    },
    {
      value: 'low',
      label: 'Baixa',
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/30',
      borderColor: 'border-blue-400',
      icon: '🔵',
      description: 'Não urgente'
    }
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/tickets/${ticket.id}/priority`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: selectedPriority, reason: reason.trim() })
      });

      if (response.ok) {
        onPriorityChange(selectedPriority);
        handleClose();
      }
    } catch (error) {
      console.error('Erro ao alterar prioridade:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPriority(ticket?.priority || 'normal');
    setReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] backdrop-blur-sm">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md shadow-2xl border border-slate-700/70">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FlagIcon className="w-5 h-5 text-primary-light" />
            <h2 className="text-white text-lg font-semibold">Definir Prioridade</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Informações do Ticket */}
        <div className="bg-slate-700 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-slate-300 text-sm font-medium">Ticket #{ticket?.id}</span>
          </div>
          <p className="text-slate-400 text-sm">{ticket?.contact}</p>
          <p className="text-slate-500 text-xs mt-1">
            Prioridade atual: {priorities.find(p => p.value === ticket?.priority)?.label || 'Normal'}
          </p>
        </div>

        {/* Seleção de Prioridade */}
        <div className="mb-4">
          <label className="block text-slate-300 text-sm font-medium mb-3">Nova Prioridade</label>
          <div className="space-y-2">
            {priorities.map(priority => (
              <label
                key={priority.value}
                className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors border ${
                  selectedPriority === priority.value
                    ? `${priority.bgColor} ${priority.borderColor}`
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                }`}
              >
                <input
                  type="radio"
                  value={priority.value}
                  checked={selectedPriority === priority.value}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center flex-1">
                  <span className="text-lg mr-3">{priority.icon}</span>
                  <div className="flex-1">
                    <div className={`font-medium ${priority.color}`}>
                      {priority.label}
                    </div>
                    <div className="text-slate-400 text-xs">
                      {priority.description}
                    </div>
                  </div>
                  {selectedPriority === priority.value && (
                    <CheckIcon className="w-5 h-5 text-primary-light" />
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Motivo */}
        <div className="mb-6">
          <label className="block text-slate-300 text-sm font-medium mb-1">
            Motivo da Alteração
            <span className="text-slate-500 font-normal"> (opcional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-primary"
            rows="3"
            placeholder="Explique o motivo da alteração de prioridade..."
          />
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-slate-900 rounded hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
            ) : (
              <>
                <FlagIcon className="w-4 h-4" />
                <span>Salvar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
