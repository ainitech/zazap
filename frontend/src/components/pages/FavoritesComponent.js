import React, { useState, useEffect } from 'react';
import { 
  StarIcon,
  MagnifyingGlassIcon,
  UserIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { apiUrl, apiFetch } from '../../utils/apiClient';

export default function FavoritesComponent() {
  const [favoriteTickets, setFavoriteTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFavoriteTickets();
  }, []);

  const fetchFavoriteTickets = async () => {
    try {
  const response = await apiFetch('/api/tickets?favorite=true');
      if (response.ok) {
        const data = await response.json();
        setFavoriteTickets(data);
      }
    } catch (error) {
      console.error('Erro ao buscar tickets favoritos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = favoriteTickets.filter(ticket => 
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
          <StarIcon className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold text-gray-900">Tickets Favoritos</h1>
        </div>
        <p className="text-gray-600">Seus tickets marcados como favoritos</p>
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

      {/* Favorites Grid */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md">
          <div className="text-center py-12">
            {searchTerm ? (
              <>
                <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum favorito encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">Tente uma busca diferente.</p>
              </>
            ) : (
              <>
                <HeartIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum ticket favorito</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Marque tickets como favoritos para acesso rápido.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((ticket) => (
            <div key={ticket.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">
                      {ticket.contact_name || ticket.contact_number}
                    </h3>
                    <p className="text-sm text-gray-500">{ticket.contact_number}</p>
                  </div>
                </div>
                <StarIconSolid className="h-5 w-5 text-yellow-500" />
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => window.location.href = `/chat/${ticket.id}`}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Abrir Conversa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
