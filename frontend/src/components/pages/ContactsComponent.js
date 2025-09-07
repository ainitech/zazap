import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { 
  MagnifyingGlassIcon,
  UserPlusIcon,
  PhoneIcon,
  ChatBubbleBottomCenterTextIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline';
import { apiFetch, safeJson, API_BASE_URL, apiUrl } from '../../utils/apiClient';

export default function ContactsComponent() {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', number: '' });
  const [deletingContact, setDeletingContact] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [contactFilter, setContactFilter] = useState('all'); // 'all', 'groups', 'individuals'
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', pushname: '', formattedNumber: '', profilePicUrl: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // persistência removida (antes usava localStorage)

  const [sortBy, setSortBy] = useState('lastContact'); // 'name', 'lastContact', 'status'

  // Listener para eventos de filtro das configurações
  useEffect(() => {
    const handleFilterEvent = (event) => {
      const { isGroup } = event.detail;
      if (isGroup === true) {
        setContactFilter('groups');
      } else if (isGroup === false) {
        setContactFilter('individuals');
      } else {
        setContactFilter('all');
      }
    };

    window.addEventListener('filterContacts', handleFilterEvent);
    return () => window.removeEventListener('filterContacts', handleFilterEvent);
  }, []);

  // Recarregar contatos quando o filtro mudar
  useEffect(() => {
    fetchContacts();
  }, [contactFilter]);

  useEffect(() => {
    fetchContacts();
    loadSessions();
    
    // Conectar ao WebSocket
    if (!socketRef.current) {
      // Conexão via cookies httpOnly (sem token em localStorage)
      socketRef.current = io(API_BASE_URL, {
        withCredentials: true
      });

      // Escutar atualizações de contatos
      socketRef.current.on('contact-updated', (updatedContact) => {
        console.log('📱 Contato atualizado via socket:', updatedContact);
        updateContactInList(updatedContact);
      });

  // Recarregar lista quando tickets mudarem (pode trazer novos contatos)
  socketRef.current.on('tickets-update', () => fetchContacts());

      // Escutar exclusão de contatos
      socketRef.current.on('contact-deleted', (data) => {
        console.log('🗑️ Contato deletado via socket:', data.contactId);
        setContacts(prevContacts => 
          prevContacts.filter(contact => contact.contactId !== data.contactId)
        );
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('contact-updated');
        socketRef.current.off('tickets-update');
        socketRef.current.off('contact-deleted');
        socketRef.current.disconnect();
      }
    };
  }, []);

  const loadSessions = async () => {
    try {
      const res = await apiFetch('/api/sessions');
      const all = await safeJson(res);
      // Prefer only active sessions; fallback to all if none
      const active = all.filter(s => (s.currentStatus || s.status) === 'connected');
      const list = active.length ? active : all;
      setSessions(list);
      if (list.length && !selectedSessionId) {
        setSelectedSessionId(String(list[0].id));
      }
    } catch (e) {
      console.error('Erro ao carregar sessões:', e);
    }
  };

  const updateContactInList = (updatedContact) => {
    console.log('🔄 Frontend - Recebido contact-updated:', updatedContact);
    console.log('🔄 Frontend - ID do contato:', updatedContact.id);
    console.log('🔄 Frontend - WhatsApp ID:', updatedContact.whatsappId);
    console.log('🔄 Frontend - Nome:', updatedContact.name);
    console.log('🔄 Frontend - Profile Pic URL:', updatedContact.profilePicUrl);
    
    setContacts(prevContacts => {
      console.log('🔄 Frontend - Contatos atuais:', prevContacts.length);
      
      const updatedContacts = prevContacts.map(contact => {
        // Extrair número limpo para comparação
        const contactNumber = contact.number ? contact.number.split('@')[0] : '';
        const updatedContactNumber = updatedContact.whatsappId ? updatedContact.whatsappId.split('@')[0] : '';
        
        console.log(`🔍 Comparando contato:`);
        console.log(`  - contact.contactId (${contact.contactId}) === updatedContact.id (${updatedContact.id})`);
        console.log(`  - contactNumber (${contactNumber}) === updatedContactNumber (${updatedContactNumber})`);
        console.log(`  - contact.number original: ${contact.number}`);
        
        // Procurar por ID do contato ou por número limpo
        if (contact.contactId === updatedContact.id || contactNumber === updatedContactNumber) {
          console.log('✅ Contato encontrado para atualização!', contact);
          const updatedContactData = {
            ...contact,
            name: updatedContact.name || updatedContact.pushname || contact.name,
            profilePicUrl: updatedContact.profilePicUrl,
            contactId: updatedContact.id
          };
          console.log('✅ Dados do contato após atualização:', updatedContactData);
          return updatedContactData;
        }
        return contact;
      });
      
      console.log('🔄 Frontend - Contatos após atualização:', updatedContacts.length);
      return updatedContacts;
    });
  };

  const openEdit = (contact) => {
    setEditingContact(contact);
    setEditForm({
      name: contact.name || '',
      pushname: contact.pushname || '',
      formattedNumber: contact.number || '',
      profilePicUrl: contact.profilePicUrl || ''
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editingContact) return;
    try {
      setSavingEdit(true);
      const res = await apiFetch(`/api/contacts/contact/${editingContact.contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await safeJson(res);
      if (data?.contact) {
        updateContactInList(data.contact);
        setShowEditModal(false);
        setEditingContact(null);
      }
    } catch (e) {
      console.error('Erro ao salvar contato:', e);
      alert('Não foi possível salvar o contato.');
    } finally {
      setSavingEdit(false);
    }
  };

  const openNote = (contact) => {
    setNoteTarget(contact);
    setNoteText('');
  };

  const saveNote = async () => {
    if (!noteTarget || !noteText.trim()) return;
    try {
      setSavingNote(true);
      const res = await apiFetch(`/api/contacts/contact/${noteTarget.contactId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText })
      });
      await safeJson(res);
      setNoteTarget(null);
      setNoteText('');
    } catch (e) {
      console.error('Erro ao salvar nota:', e);
      alert('Não foi possível salvar a nota.');
    } finally {
      setSavingNote(false);
    }
  };

  const fetchContacts = async () => {
    try {
      // Buscar contatos diretamente da API de contatos
      const params = new URLSearchParams();
      if (contactFilter === 'groups') params.append('includeGroups', 'true');
      if (contactFilter === 'individuals') params.append('includeGroups', 'false');
      const res = await apiFetch(`/api/contacts?${params.toString()}`);
      const list = await safeJson(res);
      // Mapear para estrutura usada no componente
      const mapped = list.map(c => ({
        id: c.id,
        contactId: c.id,
        name: c.name || c.pushname || c.formattedNumber || c.whatsappId?.split('@')[0],
        number: c.formattedNumber || c.whatsappId?.split('@')[0],
        profilePicUrl: c.profilePicUrl || null,
        lastMessage: null,
        lastContact: c.updatedAt,
        ticketCount: undefined,
        status: undefined
      })).sort((a, b) => new Date(b.lastContact || 0) - new Date(a.lastContact || 0));
      setContacts(mapped);
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.number?.includes(searchTerm)
  ).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'lastContact':
        return new Date(b.lastContact || 0) - new Date(a.lastContact || 0);
      case 'status':
        const statusOrder = { 'open': 0, 'pending': 1, 'closed': 2, undefined: 3 };
        return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
      default:
        return new Date(b.lastContact || 0) - new Date(a.lastContact || 0);
    }
  });

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
    if (!selectedSessionId) {
      alert('Selecione uma sessão para vincular o contato');
      return;
    }

    try {
      // Criar contato diretamente
      const res = await apiFetch('/api/contacts/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContact.name,
          number: newContact.number,
          sessionId: Number(selectedSessionId),
          isGroup: false
        })
      });
      if (res.ok) {
        setNewContact({ name: '', number: '' });
        setShowNewContactModal(false);
        fetchContacts(); // Recarregar contatos
      } else {
        const err = await res.text();
        alert(`Erro ao criar contato: ${err}`);
      }
    } catch (error) {
      console.error('Erro ao criar contato:', error);
      alert('Erro ao criar contato');
    }
  };

  const handleDeleteContact = async (contact) => {
    if (!window.confirm(`Tem certeza que deseja deletar o contato "${contact.name}" e todos os dados relacionados? Esta ação não pode ser desfeita!`)) return;
    setDeletingContact(contact.contactId);
    try {
      const response = await apiFetch(`/api/contacts/contact/${contact.contactId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setContacts(prev => prev.filter(c => c.contactId !== contact.contactId));
      } else {
        alert('Erro ao deletar contato');
      }
    } catch (error) {
      console.error('Erro ao deletar contato:', error);
      alert('Erro ao deletar contato');
    } finally {
      setDeletingContact(null);
    }
  };

  const handleSaveContactName = async (contact, newName) => {
    const trimmed = (newName || '').trim();
    if (!trimmed) return;
    try {
      const res = await apiFetch(`/api/contacts/contact/${contact.contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { contact: updated } = await safeJson(res);
      updateContactInList(updated);
    } catch (e) {
      console.error('Erro ao salvar nome do contato:', e);
      alert('Não foi possível salvar o nome.');
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
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-white">Contatos</h1>
            {contactFilter !== 'all' && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                contactFilter === 'groups' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {contactFilter === 'groups' ? '👥 Grupos' : '👤 Individuais'}
              </span>
            )}
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
              {viewMode === 'cards' ? '🔳 Cards' : '📋 Lista'}
            </span>
          </div>
          <p className="text-slate-400">
            Gerencie seus contatos do WhatsApp
            {contactFilter === 'groups' && ' - Exibindo apenas grupos'}
            {contactFilter === 'individuals' && ' - Exibindo apenas contatos individuais'}
            {filteredContacts.length > 0 && (
              <span className="ml-2 font-medium">
                ({filteredContacts.length} contato{filteredContacts.length !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {contactFilter !== 'all' && (
            <button
              onClick={() => setContactFilter('all')}
              className="bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2 hover:bg-slate-600 transition-colors text-sm"
            >
              <XMarkIcon className="h-4 w-4" />
              <span>Limpar Filtro</span>
            </button>
          )}
          
          {/* Botões de visualização */}
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-slate-600 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title="Visualização em Cards"
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-slate-600 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title="Visualização em Lista"
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Dropdown de ordenação */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="lastContact">📅 Último contato</option>
            <option value="name">🔤 Nome (A-Z)</option>
            <option value="status">🎯 Status</option>
          </select>
          
          <button 
            onClick={() => setShowNewContactModal(true)}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 px-4 py-2 rounded-lg flex items-center space-x-2 hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 font-semibold shadow-lg"
          >
            <UserPlusIcon className="h-5 w-5" />
            <span>Novo Contato</span>
          </button>
        </div>
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

      {/* Contacts */}
      {viewMode === 'cards' ? (
        /* Visualização em Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <div key={contact.id} className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6 hover:bg-slate-750 hover:border-yellow-500/50 transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                  {contact.profilePicUrl ? (
                      <img 
                      src={contact.profilePicUrl} 
                      alt={contact.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        try {
                          if (e && e.target) {
                            if (e.target.style) e.target.style.display = 'none';
                            if (e.target.nextSibling && e.target.nextSibling.style) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }
                        } catch (err) {
                          // swallow errors to avoid crashing UI
                          console.warn('onError image handler failed', err);
                        }
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-full h-full bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center ${contact.profilePicUrl ? 'hidden' : 'flex'}`}
                  >
                    <span className="text-slate-900 font-bold text-sm">
                      {getInitials(contact.name)}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white truncate mb-1">
                    {contact.name}
                  </h3>
                  <p className="text-sm text-slate-400">{contact.number}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Último contato: {formatLastContact(contact.lastContact)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-1 mb-3">
                <button
                  onClick={() => openNote(contact)}
                  className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200 shadow-sm"
                  title="Adicionar/Editar Nota"
                >
                  📝
                </button>
                <button
                  onClick={() => openEdit(contact)}
                  className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200 shadow-sm"
                  title="Editar Contato"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteContact(contact)}
                  disabled={deletingContact === contact.contactId}
                  className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all duration-200 shadow-sm"
                  title="Excluir Contato"
                >
                  {deletingContact === contact.contactId ? '⏳' : '🗑️'}
                </button>
              </div>

              {contact.lastMessage && (
                <div className="bg-slate-700/50 border border-slate-600 p-3 rounded-lg mb-3">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    <span className="text-slate-400">"</span>{contact.lastMessage}<span className="text-slate-400">"</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Última mensagem</p>
                </div>
              )}

              {contact.status && (
                <div className="mb-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(contact.status)}`}>
                    {contact.status === 'open' ? '✅ Ativo' : 
                     contact.status === 'pending' ? '⏳ Pendente' : '❌ Fechado'}
                  </span>
                  {contact.ticketCount && (
                    <span className="ml-2 text-xs text-slate-400">
                      {contact.ticketCount} ticket{contact.ticketCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex space-x-2 pt-3 border-t border-slate-700">
              <button 
                onClick={() => handleChatClick(contact)}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-2.5 px-3 rounded-lg text-sm hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md font-medium"
              >
                <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                <span>Conversar</span>
              </button>
              <button 
                onClick={() => handleCallClick(contact)}
                className="bg-slate-700 text-white py-2.5 px-3 rounded-lg text-sm hover:bg-slate-600 transition-all duration-200 flex items-center justify-center shadow-md"
              >
                <PhoneIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        </div>
      ) : (
        /* Visualização em Lista */
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700 border-b border-slate-600">
                <tr>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Contato</th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">Número</th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold hidden lg:table-cell">Última Mensagem</th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold hidden lg:table-cell">Status</th>
                  <th className="text-center py-4 px-6 text-slate-300 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-750 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
                          {contact.profilePicUrl ? (
                            <img 
                              src={contact.profilePicUrl} 
                              alt={contact.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                try {
                                  if (e && e.target) {
                                    if (e.target.style) e.target.style.display = 'none';
                                    if (e.target.nextSibling && e.target.nextSibling.style) {
                                      e.target.nextSibling.style.display = 'flex';
                                    }
                                  }
                                } catch (err) {
                                  console.warn('onError image handler failed', err);
                                }
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-full h-full bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center ${contact.profilePicUrl ? 'hidden' : 'flex'}`}
                          >
                            <span className="text-slate-900 font-bold text-sm">
                              {getInitials(contact.name)}
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-white truncate">
                            {contact.name}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Último contato: {formatLastContact(contact.lastContact)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-300">{contact.number}</span>
                    </td>
                    <td className="py-4 px-6 hidden lg:table-cell">
                      {contact.lastMessage ? (
                        <div className="max-w-xs">
                          <p className="text-sm text-slate-300 truncate">
                            <span className="text-slate-400">"</span>{contact.lastMessage}<span className="text-slate-400">"</span>
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">Nenhuma mensagem</span>
                      )}
                    </td>
                    <td className="py-4 px-6 hidden lg:table-cell">
                      {contact.status ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(contact.status)}`}>
                          {contact.status === 'open' ? '✅ Ativo' : 
                           contact.status === 'pending' ? '⏳ Pendente' : '❌ Fechado'}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => openNote(contact)}
                          className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200 shadow-sm"
                          title="Adicionar/Editar Nota"
                        >
                          📝
                        </button>
                        <button
                          onClick={() => openEdit(contact)}
                          className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200 shadow-sm"
                          title="Editar Contato"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleChatClick(contact)}
                          className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all duration-200 shadow-sm"
                          title="Conversar"
                        >
                          <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact)}
                          disabled={deletingContact === contact.contactId}
                          className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all duration-200 shadow-sm"
                          title="Excluir Contato"
                        >
                          {deletingContact === contact.contactId ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden divide-y divide-slate-700">
            {filteredContacts.map((contact) => (
              <div key={contact.id} className="p-4 hover:bg-slate-750 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
                      {contact.profilePicUrl ? (
                        <img 
                          src={contact.profilePicUrl} 
                          alt={contact.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            try {
                              if (e && e.target) {
                                if (e.target.style) e.target.style.display = 'none';
                                if (e.target.nextSibling && e.target.nextSibling.style) {
                                  e.target.nextSibling.style.display = 'flex';
                                }
                              }
                            } catch (err) {
                              console.warn('onError image handler failed', err);
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-full h-full bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center ${contact.profilePicUrl ? 'hidden' : 'flex'}`}
                      >
                        <span className="text-slate-900 font-bold text-sm">
                          {getInitials(contact.name)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">
                        {contact.name}
                      </h3>
                      <p className="text-sm text-slate-400 truncate">{contact.number}</p>
                      <p className="text-xs text-slate-500">
                        {formatLastContact(contact.lastContact)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1 flex-shrink-0">
                    <button
                      onClick={() => openNote(contact)}
                      className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all duration-200"
                      title="Nota"
                    >
                      📝
                    </button>
                    <button
                      onClick={() => handleChatClick(contact)}
                      className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all duration-200"
                      title="Conversar"
                    >
                      <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {contact.lastMessage && (
                  <div className="mt-3 bg-slate-700/50 border border-slate-600 p-2 rounded-lg">
                    <p className="text-sm text-slate-300 truncate">
                      <span className="text-slate-400">"</span>{contact.lastMessage}<span className="text-slate-400">"</span>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nota rápida */}
      {noteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Adicionar nota</h3>
              <button onClick={() => { setNoteTarget(null); setNoteText(''); }}>
                <XMarkIcon className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <textarea
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
              placeholder="Escreva uma nota para este contato..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button 
                onClick={() => { setNoteTarget(null); setNoteText(''); }} 
                className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button 
                disabled={savingNote || !noteText.trim()} 
                onClick={saveNote} 
                className="px-3 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {savingNote ? 'Salvando...' : 'Salvar nota'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição de contato */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Editar contato</h3>
              <button onClick={() => setShowEditModal(false)}>
                <XMarkIcon className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nome</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                  value={editForm.name}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Pushname</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                  value={editForm.pushname}
                  onChange={(e) => setEditForm(f => ({ ...f, pushname: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Número (exibição)</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                  value={editForm.formattedNumber}
                  onChange={(e) => setEditForm(f => ({ ...f, formattedNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Foto (URL)</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                  value={editForm.profilePicUrl}
                  onChange={(e) => setEditForm(f => ({ ...f, profilePicUrl: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button 
                onClick={() => setShowEditModal(false)} 
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button 
                disabled={savingEdit} 
                onClick={saveEdit} 
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {savingEdit ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  Sessão
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-white"
                >
                  <option value="">Selecione uma sessão</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.whatsappId} {((s.currentStatus || s.status) === 'connected') ? '(ativa)' : ''}
                    </option>
                  ))}
                </select>
              </div>
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
