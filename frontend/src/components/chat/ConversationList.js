import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useSocket } from '../../context/SocketContext';

export default function ConversationList({ 
  tickets, 
  selectedTicket, 
  onTicketSelect, 
  searchTerm, 
  onSearchChange,
  unreadCount,
  isRealTime = true,
  currentUser,
  onAcceptTicket
}) {
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('waiting'); // 'waiting', 'accepted', 'resolved'
  const [collapsed, setCollapsed] = useState(false); // mobile collapse
  const [previewTicket, setPreviewTicket] = useState(null); // ticket sendo visualizado
  const [previewMessages, setPreviewMessages] = useState([]); // mensagens do preview
  const [loadingPreview, setLoadingPreview] = useState(false); // carregando preview

  // Atualização em tempo real quando um ticket é vinculado a uma fila
  useEffect(() => {
    if (!socket) return;
    const handleTicketQueueUpdated = (updatedTicket) => {
      // Atualize a lista de tickets no componente pai (recomendado via contexto ou prop)
      // Aqui, apenas força um refresh se o ticket atualizado estiver na lista
      if (tickets.some(t => t.id === updatedTicket.id)) {
        // Opcional: você pode disparar um evento para o pai buscar tickets novamente
        window.dispatchEvent(new CustomEvent('refreshTickets'));
      }
    };
    socket.on('ticket-queue-updated', handleTicketQueueUpdated);
    return () => {
      socket.off('ticket-queue-updated', handleTicketQueueUpdated);
    };
  }, [socket, tickets]);

  // Mudar automaticamente para a aba correta apenas quando o ticket selecionado mudar
  // Removemos `activeTab` das dependências para evitar que mudanças manuais do usuário
  // (clicando nas tabs) sejam sobrescritas enquanto o ticket selecionado não mudou.
  useEffect(() => {
    if (!selectedTicket) return;

    const status = selectedTicket.chatStatus;
    if (status === 'accepted') {
      setActiveTab('accepted');
    } else if (status === 'resolved') {
      setActiveTab('resolved');
    } else {
      // fallback para 'waiting' ou estados indefinidos
      setActiveTab('waiting');
    }
  }, [selectedTicket?.id, selectedTicket?.chatStatus]);
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getAvatarInitials = (name) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const getRandomAvatarColor = (name) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'normal': return 'text-gray-400';
      case 'low': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'normal': return '⚪';
      case 'low': return '🔵';
      default: return '⚪';
    }
  };

  const isRecentlyActive = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    return diffInMinutes < 5; // Considera ativo se houve atividade nos últimos 5 minutos
  };

  const filteredTickets = tickets.filter(ticket => 
    ticket.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ticket.Contact?.name && ticket.Contact.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (ticket.Contact?.pushname && ticket.Contact.pushname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (ticket.lastMessage && ticket.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Dividir tickets por status
  const waitingTickets = filteredTickets.filter(ticket => 
    ticket.chatStatus === 'waiting' || !ticket.chatStatus // Fallback para tickets sem chatStatus
  );
  const acceptedTickets = filteredTickets.filter(ticket => 
    ticket.chatStatus === 'accepted' && ticket.assignedUserId // Apenas aceitos com usuário atribuído
  );
  const resolvedTickets = filteredTickets.filter(ticket => ticket.chatStatus === 'resolved');
  const closedTickets = filteredTickets.filter(ticket => ticket.chatStatus === 'closed');

  // Função para buscar preview das mensagens
  const fetchPreviewMessages = async (ticketId) => {
    try {
      setLoadingPreview(true);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('token');
      
  const response = await fetch(`${API_URL}/api/ticket-messages/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const messages = await response.json();
        setPreviewMessages(messages); // Mostrar todas as mensagens em ordem cronológica
      } else {
        setPreviewMessages([]);
      }
    } catch (error) {
      console.error('Erro ao buscar preview das mensagens:', error);
      setPreviewMessages([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handler para abrir preview
  const handlePreviewClick = async (ticket) => {
    setPreviewTicket(ticket);
    await fetchPreviewMessages(ticket.id);
  };

  // Fechar preview
  const closePreview = () => {
    setPreviewTicket(null);
    setPreviewMessages([]);
  };

  const renderTicket = (ticket, showQueueInfo = true, isWaiting = false) => {
    const isRecent = isRecentlyActive(ticket.updatedAt);
    const displayName = ticket.Contact?.name || ticket.Contact?.pushname || ticket.contact;
    const avatarUrl = ticket.Contact?.profilePicUrl;
    
    const handleAcceptClick = (e) => {
      e.stopPropagation();
      if (onAcceptTicket) {
        onAcceptTicket(ticket.id);
        // Mudar para a aba "Em Atendimento" após aceitar
        setTimeout(() => setActiveTab('accepted'), 500);
      }
    };
    
    return (
      <div
        key={ticket.id}
        onClick={() => onTicketSelect(ticket)}
        className={`px-3 py-2 sm:p-4 cursor-pointer border-b border-slate-700 hover:bg-slate-700 transition-colors touch-manipulation ${
          selectedTicket?.id === ticket.id 
            ? 'bg-slate-700 border-l-4 border-l-yellow-500' 
            : isRecent && isRealTime 
              ? 'bg-slate-700/50 border-l-2 border-l-green-400' 
              : ''
        }`}
      >
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Avatar */}
          <div className="relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={displayName}
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
                className={`w-full h-full flex items-center justify-center text-white text-sm font-medium ${getRandomAvatarColor(displayName)} ${avatarUrl ? 'hidden' : 'flex'}`}
              >
                {getAvatarInitials(displayName)}
              </div>
            </div>
            
            {/* Status indicators */}
            {isRecent && isRealTime && (
              <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
            )}
            {ticket.unreadCount > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-slate-900 text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {ticket.unreadCount > 99 ? '99+' : ticket.unreadCount}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">{displayName}</h3>
                {showQueueInfo && (
                  <>
                    {ticket.priority && ticket.priority !== 'normal' && (
                      <span className="text-xs flex-shrink-0">{getPriorityLabel(ticket.priority)}</span>
                    )}
                    {ticket.isBot && (
                      <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">BOT</span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                <span className="text-slate-400 text-[11px] sm:text-xs whitespace-nowrap">{formatTime(ticket.updatedAt)}</span>
                {isWaiting && onAcceptTicket && (
                  <button
                    onClick={handleAcceptClick}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded transition-colors flex-shrink-0"
                    title="Aceitar ticket"
                  >
                    Aceitar
                  </button>
                )}
              </div>
            </div>
            
            {/* Queue and status info */}
            {showQueueInfo && (
              <div className="flex items-center space-x-2 mb-1 overflow-hidden">
                {ticket.Queue ? (
                  <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                    {ticket.Queue.name}
                  </span>
                ) : (
                  <span className="bg-gray-600 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                    Sem fila
                  </span>
                )}
                
                {ticket.assignedUserId && ticket.AssignedUser && (
                  <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full flex-shrink-0 truncate">
                    {ticket.AssignedUser.name}
                  </span>
                )}
              </div>
            )}
            
            <div className="relative group">
              <p className="text-slate-400 text-sm truncate pr-16">
                {ticket.lastMessage || 'Nenhuma mensagem ainda'}
              </p>
              
              {/* Tooltip com mensagem completa */}
              {ticket.lastMessage && ticket.lastMessage.length > 50 && (
                <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 max-w-xs break-words pointer-events-none">
                  {ticket.lastMessage}
                  <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                </div>
              )}
              
              {/* Botão espiar conversa - sempre visível */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreviewClick(ticket);
                }}
                className="absolute right-0 top-0 bg-slate-600 hover:bg-slate-500 text-white text-xs px-2 py-1 rounded flex-shrink-0 flex items-center space-x-1 transition-colors"
                title="Espiar conversa"
              >
                <EyeIcon className="w-3 h-3" />
                <span className="hidden sm:inline">Espiar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full sm:w-80 bg-slate-800 flex flex-col border-r border-slate-700 h-full">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="sm:hidden p-2 rounded-md bg-slate-700 text-slate-200"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            aria-controls="conversation-list"
          >
            {collapsed ? 'Abrir' : 'Fechar'}
          </button>
          <div>
            <h1 className="text-white text-lg sm:text-xl font-semibold">Atendimentos</h1>
            {unreadCount > 0 && (
              <div className="mt-1 bg-yellow-500 text-slate-900 text-xs font-medium px-2 py-0.5 rounded-full inline-block">
                {unreadCount}
              </div>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-2">
          <div className="flex items-center text-green-400 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            Online
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-700">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-700 text-white text-sm placeholder-slate-400 pl-9 pr-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-700">
        {/* Versão com ícones (mais compacta) */}
        <div className="flex sm:hidden">
          <button
            onClick={() => setActiveTab('waiting')}
            className={`flex-1 px-2 py-3 flex flex-col items-center justify-center space-y-1 transition-colors ${
              activeTab === 'waiting'
                ? 'text-yellow-400 border-b-2 border-yellow-400 bg-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <div className="relative">
              <ClockIcon className="w-5 h-5" />
              {waitingTickets.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-yellow-500 text-slate-900 text-[10px] font-bold px-1 rounded-full min-w-[16px] text-center">
                  {waitingTickets.length > 9 ? '9+' : waitingTickets.length}
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium">Aguard.</span>
          </button>
          
          <button
            onClick={() => setActiveTab('accepted')}
            className={`flex-1 px-2 py-3 flex flex-col items-center justify-center space-y-1 transition-colors ${
              activeTab === 'accepted'
                ? 'text-green-400 border-b-2 border-green-400 bg-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <div className="relative">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              {acceptedTickets.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] text-center">
                  {acceptedTickets.length > 9 ? '9+' : acceptedTickets.length}
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium">Atend.</span>
          </button>
          
          <button
            onClick={() => setActiveTab('resolved')}
            className={`flex-1 px-2 py-3 flex flex-col items-center justify-center space-y-1 transition-colors ${
              activeTab === 'resolved'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <div className="relative">
              <CheckCircleIcon className="w-5 h-5" />
              {resolvedTickets.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] text-center">
                  {resolvedTickets.length > 9 ? '9+' : resolvedTickets.length}
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium">Resolv.</span>
          </button>
        </div>

        {/* Versão com texto (desktop) */}
        <div className="hidden sm:flex">
          <button
            onClick={() => setActiveTab('waiting')}
            className={`flex-1 px-3 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
              activeTab === 'waiting'
                ? 'text-yellow-400 border-b-2 border-yellow-400 bg-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <ClockIcon className="w-4 h-4" />
            <span>Aguardando</span>
            {waitingTickets.length > 0 && (
              <div className="bg-yellow-500 text-slate-900 text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {waitingTickets.length}
              </div>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('accepted')}
            className={`flex-1 px-3 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
              activeTab === 'accepted'
                ? 'text-green-400 border-b-2 border-green-400 bg-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            <span>Atendimento</span>
            {acceptedTickets.length > 0 && (
              <div className="bg-green-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {acceptedTickets.length}
              </div>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('resolved')}
            className={`flex-1 px-3 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
              activeTab === 'resolved'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>Resolvidos</span>
            {resolvedTickets.length > 0 && (
              <div className="bg-blue-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {resolvedTickets.length}
              </div>
            )}
          </button>
        </div>
      </div>

  {/* Tab Content */}
  <div id="conversation-list" className={`${collapsed ? 'hidden' : 'flex'} flex-1 flex-col overflow-hidden` }>
        {/* Aguardando Tab */}
        {activeTab === 'waiting' && (
          <div className="flex-1 overflow-y-auto">
            {waitingTickets.length > 0 ? (
              <>
                <div className="px-4 py-3 bg-slate-750 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-yellow-400 font-medium text-sm flex items-center">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                      Tickets Aguardando Atendimento
                    </h3>
                    {isRealTime && (
                      <div className="flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-400 font-medium">Live</span>
                      </div>
                    )}
                  </div>
                </div>
                {waitingTickets.map(ticket => renderTicket(ticket, true, true))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <ClockIcon className="w-16 h-16 text-slate-600 mb-4" />
                <p className="text-slate-400 text-sm">
                  {searchTerm ? 'Nenhum ticket aguardando encontrado' : 'Nenhum ticket aguardando atendimento'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Em Atendimento Tab */}
        {activeTab === 'accepted' && (
          <div className="flex-1 overflow-y-auto">
            {acceptedTickets.length > 0 ? (
              <>
                <div className="px-4 py-3 bg-slate-750 border-b border-slate-700">
                  <h3 className="text-green-400 font-medium text-sm flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Tickets em Atendimento
                  </h3>
                </div>
                {acceptedTickets.map(ticket => renderTicket(ticket, true, false))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <ChatBubbleLeftRightIcon className="w-16 h-16 text-slate-600 mb-4" />
                <p className="text-slate-400 text-sm">
                  {searchTerm ? 'Nenhum ticket em atendimento encontrado' : 'Nenhum ticket em atendimento'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Resolvidos Tab */}
        {activeTab === 'resolved' && (
          <div className="flex-1 overflow-y-auto">
            {resolvedTickets.length > 0 ? (
              <>
                <div className="px-4 py-3 bg-slate-750 border-b border-slate-700">
                  <h3 className="text-blue-400 font-medium text-sm flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    Tickets Resolvidos
                  </h3>
                </div>
                {resolvedTickets.map(ticket => renderTicket(ticket, true, false))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <CheckCircleIcon className="w-16 h-16 text-slate-600 mb-4" />
                <p className="text-slate-400 text-sm">
                  {searchTerm ? 'Nenhum ticket resolvido encontrado' : 'Nenhum ticket resolvido'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Preview */}
      {previewTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-lg w-full max-h-[95vh] overflow-hidden">
            {/* Header do Modal */}
            <div className="p-3 sm:p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                  {previewTicket.Contact?.profilePicUrl ? (
                    <img 
                      src={previewTicket.Contact.profilePicUrl} 
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-white text-xs font-medium ${getRandomAvatarColor(previewTicket.Contact?.name || previewTicket.contact)}`}>
                      {getAvatarInitials(previewTicket.Contact?.name || previewTicket.contact)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-medium text-sm truncate">
                    {previewTicket.Contact?.name || previewTicket.Contact?.pushname || previewTicket.contact}
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Histórico Completo • {previewMessages.length} mensagens
                  </p>
                </div>
              </div>
              <button
                onClick={closePreview}
                className="text-slate-400 hover:text-white text-xl leading-none p-1"
              >
                ×
              </button>
            </div>

            {/* Conteúdo das Mensagens */}
            <div className="flex-1 max-h-[70vh] overflow-y-auto bg-slate-900">
              {loadingPreview ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-slate-400">Carregando histórico...</span>
                </div>
              ) : previewMessages.length > 0 ? (
                <div className="p-4 space-y-4">
                  {previewMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-4 py-3 rounded-lg text-sm ${
                        message.fromMe 
                          ? 'bg-green-600 text-white rounded-br-sm' 
                          : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                      }`}>
                        <p className="break-words leading-relaxed">
                          {message.body || message.content || 'Mensagem sem conteúdo'}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-1">
                          <p className={`text-xs ${message.fromMe ? 'text-green-200' : 'text-slate-400'}`}>
                            {new Date(message.createdAt).toLocaleString('pt-BR', { 
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          {message.fromMe && (
                            <span className="text-xs text-green-200 ml-2">
                              {message.ack === 3 ? '✓✓' : message.ack === 2 ? '✓✓' : message.ack === 1 ? '✓' : '⏳'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-slate-500 mb-2">💬</div>
                  <p className="text-slate-400 text-sm">Nenhuma mensagem encontrada nesta conversa</p>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="p-3 sm:p-4 border-t border-slate-700 flex justify-between gap-3">
              <button
                onClick={closePreview}
                className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  closePreview();
                  onTicketSelect(previewTicket);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors font-medium"
              >
                Abrir Conversa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
