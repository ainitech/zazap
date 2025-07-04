import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon,
  UserPlusIcon,
  PhoneIcon,
  ChatBubbleBottomCenterTextIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function ContactsComponent() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', number: '' });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      // Buscar tickets para extrair contatos únicos
      const response = await fetch(`${API_URL}/api/tickets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const tickets = await response.json();
        
        // Extrair contatos únicos dos tickets
        const uniqueContacts = tickets.reduce((acc, ticket) => {
          const contactNumber = ticket.contact_number || ticket.contact;
          const contactName = ticket.contact_name || contactNumber;
          
          const existingContact = acc.find(c => c.number === contactNumber);
          if (!existingContact) {
            acc.push({
              id: ticket.id,
              name: contactName,
              number: contactNumber,
              lastMessage: ticket.lastMessage,
              lastContact: ticket.updatedAt,
              ticketCount: 1,
              status: ticket.status
            });
          } else {
            existingContact.ticketCount++;
            if (new Date(ticket.updatedAt) > new Date(existingContact.lastContact)) {
              existingContact.lastMessage = ticket.lastMessage;
              existingContact.lastContact = ticket.updatedAt;
            }
          }
          return acc;
        }, []);
        
        // Ordenar por último contato
        uniqueContacts.sort((a, b) => new Date(b.lastContact) - new Date(a.lastContact));
        setContacts(uniqueContacts);
      }
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.number?.includes(searchTerm)
  );

  const formatLastContact = (date) => {
    const now = new Date();
    const lastContact = new Date(date);
    const diffInHours = Math.floor((now - lastContact) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora mesmo';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d atrás`;
    return lastContact.toLocaleDateString();
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) : '??';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-green-900 text-green-300 border-green-800';
      case 'pending': return 'bg-yellow-900 text-yellow-300 border-yellow-800';
      case 'closed': return 'bg-gray-700 text-gray-300 border-gray-600';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const handleChatClick = (contact) => {
    // Navegar para o chat com o contato
    navigate(`/chat?contact=${encodeURIComponent(contact.number)}`);
  };

  const handleCallClick = (contact) => {
    // Implementar funcionalidade de chamada
    window.open(`tel:${contact.number}`, '_self');
  };

  const handleNewContact = async () => {
    if (!newContact.name.trim() || !newContact.number.trim()) {
      alert('Por favor, preencha nome e número do contato');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          contact_name: newContact.name,
          contact_number: newContact.number,
          status: 'open'
        })
      });

      if (response.ok) {
        setNewContact({ name: '', number: '' });
        setShowNewContactModal(false);
        fetchContacts(); // Recarregar contatos
      } else {
        alert('Erro ao criar contato');
      }
    } catch (error) {
      console.error('Erro ao criar contato:', error);
      alert('Erro ao criar contato');
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-900 min-h-screen">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Contatos</h1>
          <p className="text-slate-400">Gerencie seus contatos do WhatsApp</p>
        </div>
        <button 
          onClick={() => setShowNewContactModal(true)}
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 px-4 py-2 rounded-lg flex items-center space-x-2 hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 font-semibold shadow-lg"
        >
          <UserPlusIcon className="h-5 w-5" />
          <span>Novo Contato</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar contatos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-white placeholder-slate-400 transition-all duration-200"
          />
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map((contact) => (
          <div key={contact.id} className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6 hover:bg-slate-750 hover:border-yellow-500/50 transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-slate-900 font-bold text-sm">
                    {getInitials(contact.name)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-white truncate">
                    {contact.name}
                  </h3>
                  <p className="text-sm text-slate-400">{contact.number}</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-yellow-500 transition-colors">
                <EllipsisVerticalIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(contact.status)}`}>
                  {contact.status === 'open' ? 'Ativo' : 
                   contact.status === 'pending' ? 'Pendente' : 'Fechado'}
                </span>
                <span className="text-xs text-slate-400">
                  {contact.ticketCount} ticket{contact.ticketCount !== 1 ? 's' : ''}
                </span>
              </div>

              {contact.lastMessage && (
                <div className="bg-slate-700 border border-slate-600 p-3 rounded-lg">
                  <p className="text-sm text-slate-300 line-clamp-2">
                    {contact.lastMessage}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Último contato: {formatLastContact(contact.lastContact)}</span>
              </div>
            </div>

            <div className="flex space-x-2 mt-4 pt-4 border-t border-slate-700">
              <button 
                onClick={() => handleChatClick(contact)}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-3 rounded-lg text-sm hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center space-x-1 shadow-md"
              >
                <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                <span>Chat</span>
              </button>
              <button 
                onClick={() => handleCallClick(contact)}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 py-2 px-3 rounded-lg text-sm hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 flex items-center justify-center space-x-1 shadow-md font-semibold"
              >
                <PhoneIcon className="h-4 w-4" />
                <span>Chamar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredContacts.length === 0 && !loading && (
        <div className="text-center py-12">
          <UserPlusIcon className="mx-auto h-16 w-16 text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-white">
            {searchTerm ? 'Nenhum contato encontrado' : 'Nenhum contato ainda'}
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            {searchTerm ? 'Tente uma busca diferente.' : 'Os contatos do WhatsApp aparecerão aqui.'}
          </p>
          {!searchTerm && (
            <button 
              onClick={() => setShowNewContactModal(true)}
              className="mt-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 px-4 py-2 rounded-lg font-semibold hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200"
            >
              Adicionar Primeiro Contato
            </button>
          )}
        </div>
      )}

      {/* New Contact Modal */}
      {showNewContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Novo Contato</h3>
              <button 
                onClick={() => setShowNewContactModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-white placeholder-slate-400"
                  placeholder="Nome do contato"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Número do WhatsApp
                </label>
                <input
                  type="text"
                  value={newContact.number}
                  onChange={(e) => setNewContact({...newContact, number: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-white placeholder-slate-400"
                  placeholder="+55 11 99999-9999"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowNewContactModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleNewContact}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 font-semibold"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
