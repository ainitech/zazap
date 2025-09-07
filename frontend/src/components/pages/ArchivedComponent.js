import React, { useState, useEffect } from 'react';
import { 
  ArchiveBoxIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ArrowUturnLeftIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

import { apiUrl, apiFetch, safeJson } from '../../utils/apiClient';

export default function ArchivedComponent() {
  const [archivedTickets, setArchivedTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchArchivedTickets();
  }, []);

  const fetchArchivedTickets = async () => {
    try {
      const response = await apiFetch('/api/tickets?status=archived');
      if (response.ok) {
        const data = await safeJson(response);
        setArchivedTickets(data);
      }
    } catch (error) {
      console.error('Erro ao buscar tickets arquivados:', error);
    } finally {
      setLoading(false);
    }
  };

  const restoreTicket = async (ticketId) => {
    try {
  const response = await apiFetch(`/api/tickets/${ticketId}/restore`, { method: 'POST' });

      if (response.ok) {
        setArchivedTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
      }
    } catch (error) {
      console.error('Erro ao restaurar ticket:', error);
    }
  };

  const filteredTickets = archivedTickets.filter(ticket => 
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
          <ArchiveBoxIcon className="h-8 w-8 text-gray-600" />
          <h1 className="text-3xl font-bold text-gray-900">Tickets Arquivados</h1>
        </div>
        <p className="text-gray-600">Tickets que foram arquivados do sistema</p>
      </div>

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

      {/* Archived Tickets */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <ArchiveBoxIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? 'Nenhum ticket encontrado' : 'Nenhum ticket arquivado'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Tente uma busca diferente.' : 'Os tickets arquivados aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-gray-600" />
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
