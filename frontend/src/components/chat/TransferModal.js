import React, { useState, useEffect } from 'react';
import { apiUrl, apiFetch, safeJson } from '../../utils/apiClient';
import { 
  ArrowRightIcon,
  UserIcon,
  QueueListIcon,
  XMarkIcon,
  CheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// API base is resolved via apiUrl helper

export default function TransferModal({ 
  isOpen, 
  onClose, 
  ticket, 
  onTransfer 
}) {
  const [users, setUsers] = useState([]);
  const [queues, setQueues] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedQueue, setSelectedQueue] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferType, setTransferType] = useState('user'); // 'user' ou 'queue'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchQueues();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const response = await apiFetch('/api/users');
      if (response.ok) {
        const data = await safeJson(response);
        let normalized = [];
        if (Array.isArray(data)) {
          normalized = data;
        } else if (Array.isArray(data?.rows)) {
          normalized = data.rows;
        } else if (Array.isArray(data?.users)) {
          normalized = data.users;
        } else {
          console.warn('⚠️ /api/users retornou formato inesperado:', data);
        }
        setUsers(normalized);
      } else {
        console.warn('⚠️ Falha ao carregar usuários. HTTP', response.status);
        setUsers([]);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setUsers([]);
    }
  };

  const fetchQueues = async () => {
    try {
      const response = await apiFetch('/api/queues');
      if (response.ok) {
        const data = await safeJson(response);
        let normalized = [];
        if (Array.isArray(data)) {
          normalized = data;
        } else if (Array.isArray(data?.rows)) {
          normalized = data.rows;
        } else if (Array.isArray(data?.queues)) {
          normalized = data.queues;
        } else {
            console.warn('⚠️ /api/queues retornou formato inesperado:', data);
        }
        setQueues(normalized);
      } else {
        console.warn('⚠️ Falha ao carregar filas. HTTP', response.status);
        setQueues([]);
      }
    } catch (error) {
      console.error('Erro ao buscar filas:', error);
      setQueues([]);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUser && transferType === 'user') return;
    if (!selectedQueue && transferType === 'queue') return;

    setLoading(true);
    try {
      const response = await apiFetch(`/api/tickets/${ticket.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferType,
          userId: transferType === 'user' ? parseInt(selectedUser) : null,
          queueId: transferType === 'queue' ? parseInt(selectedQueue) : null,
          note: transferNote.trim()
        })
      });

      if (response.ok) {
        onTransfer();
        handleClose();
      }
    } catch (error) {
      console.error('Erro ao transferir ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUser('');
    setSelectedQueue('');
    setTransferNote('');
    setTransferType('user');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] backdrop-blur-sm">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md shadow-2xl border border-slate-700/70">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-lg font-semibold">Transferir Atendimento</h2>
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
            <InformationCircleIcon className="w-4 h-4 text-blue-400" />
            <span className="text-slate-300 text-sm font-medium">Ticket #{ticket?.id}</span>
          </div>
          <p className="text-slate-400 text-sm">{ticket?.contact}</p>
          <p className="text-slate-500 text-xs mt-1">
            {ticket?.lastMessage && ticket.lastMessage.length > 50 
              ? `${ticket.lastMessage.substring(0, 50)}...`
              : ticket?.lastMessage
            }
          </p>
        </div>

        {/* Tipo de Transferência */}
        <div className="mb-4">
          <label className="block text-slate-300 text-sm font-medium mb-2">Transferir para</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="user"
                checked={transferType === 'user'}
                onChange={(e) => setTransferType(e.target.value)}
                className="mr-2"
              />
              <UserIcon className="w-4 h-4 mr-1" />
              <span className="text-slate-300 text-sm">Agente</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="queue"
                checked={transferType === 'queue'}
                onChange={(e) => setTransferType(e.target.value)}
                className="mr-2"
              />
              <QueueListIcon className="w-4 h-4 mr-1" />
              <span className="text-slate-300 text-sm">Fila</span>
            </label>
          </div>
        </div>

        {/* Seleção de Agente */}
        {transferType === 'user' && (
          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-medium mb-1">Selecionar Agente</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-primary"
              required
            >
              <option value="">Escolha um agente...</option>
              {Array.isArray(users) && users.length > 0 ? (
                users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))
              ) : (
                <option value="" disabled>Nenhum usuário</option>
              )}
            </select>
          </div>
        )}

        {/* Seleção de Fila */}
        {transferType === 'queue' && (
          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-medium mb-1">Selecionar Fila</label>
            <select
              value={selectedQueue}
              onChange={(e) => setSelectedQueue(e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-primary"
              required
            >
              <option value="">Escolha uma fila...</option>
              {Array.isArray(queues) && queues.length > 0 ? (
                queues.map(queue => (
                  <option key={queue.id} value={queue.id}>{queue.name}</option>
                ))
              ) : (
                <option value="" disabled>Nenhuma fila</option>
              )}
            </select>
          </div>
        )}

        {/* Nota de Transferência */}
        <div className="mb-6">
          <label className="block text-slate-300 text-sm font-medium mb-1">Nota de Transferência</label>
          <textarea
            value={transferNote}
            onChange={(e) => setTransferNote(e.target.value)}
            className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-primary"
            rows="3"
            placeholder="Adicione informações relevantes para o próximo agente..."
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
            onClick={handleTransfer}
            disabled={loading || (!selectedUser && transferType === 'user') || (!selectedQueue && transferType === 'queue')}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-slate-900 rounded hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
            ) : (
              <>
                <ArrowRightIcon className="w-4 h-4" />
                <span>Transferir</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
