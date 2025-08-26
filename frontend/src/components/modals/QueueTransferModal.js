import React, { useState, useEffect } from 'react';
import { ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

const QueueTransferModal = ({ isOpen, onClose, onTransfer, queues, currentQueueId }) => {
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const availableQueues = queues.filter(queue => 
    queue.id !== currentQueueId && queue.isActive
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQueueId || !ticketId) return;

    setIsLoading(true);
    try {
      await onTransfer({
        ticketId,
        targetQueueId: selectedQueueId,
        reason
      });
      
      // Reset form
      setSelectedQueueId('');
      setTicketId('');
      setReason('');
      onClose();
    } catch (error) {
      console.error('Erro ao transferir ticket:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md">
        <div className="modal-header">
          <h3 className="modal-title">
            <ArrowRightIcon className="h-5 w-5" />
            Transferir Ticket
          </h3>
          <button onClick={onClose} className="modal-close-btn">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID do Ticket
            </label>
            <input
              type="text"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="Digite o ID do ticket"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fila de Destino
            </label>
            <select
              value={selectedQueueId}
              onChange={(e) => setSelectedQueueId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecione uma fila</option>
              {availableQueues.map(queue => (
                <option key={queue.id} value={queue.id}>
                  {queue.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo da Transferência (opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da transferência"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedQueueId || !ticketId}
              className="btn-primary flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Transferindo...
                </>
              ) : (
                <>
                  <ArrowRightIcon className="h-4 w-4" />
                  Transferir
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QueueTransferModal;
