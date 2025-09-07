import React, { useState, useEffect } from 'react';
import { apiUrl, apiFetch, safeJson } from '../../utils/apiClient';
import { 
  ClockIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';

// API base is resolved via apiUrl helper

export default function RecentComponent() {
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRecentTickets();
  }, []);

  const fetchRecentTickets = async () => {
    try {
      const response = await apiFetch('/api/tickets?recent=true&limit=50');
      if (response.ok) {
        const data = await safeJson(response);
        setRecentTickets(data);
      }
    } catch (error) {
      console.error('Erro ao buscar tickets recentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = recentTickets.filter(ticket => 
    ticket.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.contact_number?.includes(searchTerm)
  );

  const formatLastActivity = (date) => {
    const now = new Date();
    const activity = new Date(date);
    const diffMinutes = Math.floor((now - activity) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Agora mesmo';
    if (diffMinutes < 60) return `${diffMinutes}m atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return activity.toLocaleDateString();
  };

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
          <ClockIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Tickets Recentes</h1>
        </div>
        <p className="text-gray-600">Tickets acessados recentemente</p>
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

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? 'Nenhum ticket encontrado' : 'Nenhum ticket recente'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Os tickets que você acessar aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {ticket.contact_name || ticket.contact_number}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {ticket.contact_number}
                      </p>
                      {ticket.lastMessage && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          <ChatBubbleBottomCenterTextIcon className="inline h-4 w-4 mr-1" />
                          {ticket.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className="text-xs text-gray-500">
                      {formatLastActivity(ticket.updatedAt || ticket.createdAt)}
                    </span>
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
