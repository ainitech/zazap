import React, { useState, useEffect } from 'react';
import { 
  TrashIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { apiUrl, apiFetch } from '../../utils/apiClient';

// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function TrashComponent() {
  const [deletedTickets, setDeletedTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDeletedTickets();
  }, []);

  const fetchDeletedTickets = async () => {
    try {
  const response = await apiFetch('/api/tickets?status=deleted');
      if (response.ok) {
        const data = await response.json();
        setDeletedTickets(data);
      }
    } catch (error) {
      console.error('Erro ao buscar tickets excluídos:', error);
    } finally {
      setLoading(false);
    }
  };

  const restoreTicket = async (ticketId) => {
    try {
  const response = await apiFetch(`/api/tickets/${ticketId}/restore`, { method: 'POST' });

      if (response.ok) {
        setDeletedTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
      }
    } catch (error) {
      console.error('Erro ao restaurar ticket:', error);
    }
  };

  const filteredTickets = deletedTickets.filter(ticket => 
    ticket.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.contact_number?.includes(searchTerm)
  );

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
        <div className="flex items-center space-x-3 mb-2">
          <TrashIcon className="h-8 w-8 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900">Lixeira</h1>
        </div>
        <p className="text-gray-600">Tickets excluídos temporariamente</p>
      </div>

      {/* Warning */}
      {deletedTickets.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Atenção</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Os tickets na lixeira são mantidos por tempo limitado. Restaure conforme necessário.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Deleted Tickets */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <TrashIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? 'Nenhum ticket encontrado' : 'Lixeira vazia'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Tente uma busca diferente.' : 'Os tickets excluídos aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-red-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {ticket.contact_name || ticket.contact_number}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {ticket.contact_number}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => restoreTicket(ticket.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors flex items-center space-x-1"
                    >
                      <ArrowUturnLeftIcon className="h-3 w-3" />
                      <span>Restaurar</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
