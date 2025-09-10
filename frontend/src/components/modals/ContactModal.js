import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { apiUrl, apiFetch } from '../../utils/apiClient';

export default function ContactModal({ isOpen, onClose, onSend, isLoading = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [error, setError] = useState('');

  // Fetch contacts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchContacts();
    }
  }, [isOpen]);

  // Filter contacts based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact =>
        contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phoneNumber?.includes(searchTerm) ||
        contact.pushname?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredContacts(filtered);
    }
  }, [searchTerm, contacts]);

  const fetchContacts = async () => {
    setIsLoadingContacts(true);
    setError('');
    try {
      const response = await apiFetch(`${apiUrl}/contacts`);
      if (response.success) {
        setContacts(response.contacts || []);
      } else {
        setError('Erro ao carregar contatos');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setError('Erro ao carregar contatos');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedContact) {
      setError('Selecione um contato para enviar');
      return;
    }

    // Create WhatsApp contact ID format
    const contactId = selectedContact.phoneNumber.includes('@') 
      ? selectedContact.phoneNumber 
      : `${selectedContact.phoneNumber.replace(/\D/g, '')}@c.us`;

    onSend(contactId);
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedContact(null);
    setError('');
    onClose();
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return cleaned.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
            <UserIcon className="h-5 w-5 text-blue-500" />
            <span>Enviar Contato</span>
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar contatos..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading || isLoadingContacts}
              />
            </div>
          </div>

          {/* Selected Contact */}
          {selectedContact && (
            <div className="p-4 bg-blue-50 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {selectedContact.name || selectedContact.pushname || 'Sem nome'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatPhoneNumber(selectedContact.phoneNumber)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingContacts ? (
              <div className="p-4 text-center text-gray-500">
                Carregando contatos...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {contacts.length === 0 ? 'Nenhum contato encontrado' : 'Nenhum resultado para a busca'}
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full p-3 text-left rounded-md transition-colors ${
                      selectedContact?.id === contact.id
                        ? 'bg-blue-100 border-blue-300'
                        : 'hover:bg-gray-50 border-transparent'
                    } border`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {contact.name || contact.pushname || 'Sem nome'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatPhoneNumber(contact.phoneNumber)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 border-t">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 p-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !selectedContact}
            >
              {isLoading ? 'Enviando...' : 'Enviar Contato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
