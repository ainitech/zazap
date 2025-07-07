import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon
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

  // Mudar automaticamente para a aba correta se o ticket selecionado mudar de status
  useEffect(() => {
    if (selectedTicket) {
      if (selectedTicket.chatStatus === 'accepted' && activeTab !== 'accepted') {
        setActiveTab('accepted');
      } else if (selectedTicket.chatStatus === 'resolved' && activeTab !== 'resolved') {
        setActiveTab('resolved');
      } else if (selectedTicket.chatStatus === 'waiting' && activeTab !== 'waiting') {
        setActiveTab('waiting');
      }
    }
  }, [selectedTicket?.chatStatus, activeTab]);
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
        className={`p-4 cursor-pointer border-b border-slate-700 hover:bg-slate-700 transition-colors ${
          selectedTicket?.id === ticket.id 
            ? 'bg-slate-700 border-l-4 border-l-yellow-500' 
            : isRecent && isRealTime 
              ? 'bg-slate-700/50 border-l-2 border-l-green-400' 
              : ''
        }`}
      >
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
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
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
            )}
            {ticket.unreadCount > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-slate-900 text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {ticket.unreadCount > 99 ? '99+' : ticket.unreadCount}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-white font-medium truncate">{displayName}</h3>
                {showQueueInfo && (
                  <>
                    {ticket.priority && ticket.priority !== 'normal' && (
                      <span className="text-xs">{getPriorityLabel(ticket.priority)}</span>
                    )}
                    {ticket.isBot && (
                      <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">BOT</span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 text-xs">{formatTime(ticket.updatedAt)}</span>
                {isWaiting && onAcceptTicket && (
                  <button
                    onClick={handleAcceptClick}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded transition-colors"
                    title="Aceitar ticket"
                  >
                    Aceitar
                  </button>
                )}
              </div>
            </div>
            
            {/* Queue and status info */}
            {showQueueInfo && (
              <div className="flex items-center space-x-2 mb-1">
                {ticket.Queue ? (
                  <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {ticket.Queue.name}
                  </span>
                ) : (
                  <span className="bg-gray-600 text-white text-xs px-2 py-0.5 rounded-full">
                    Sem fila
                  </span>
                )}
                
                {ticket.assignedUserId && ticket.AssignedUser && (
                  <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {ticket.AssignedUser.name}
                  </span>
                )}
              </div>
            )}
            
            <p className="text-slate-400 text-sm truncate">
              {ticket.lastMessage || 'Nenhuma mensagem ainda'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 bg-slate-800 flex flex-col border-r border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h1 className="text-white text-xl font-semibold">Atendimentos</h1>
            {unreadCount > 0 && (
              <div className="ml-2 bg-yellow-500 text-slate-900 text-xs font-medium px-2 py-1 rounded-full">
                {unreadCount}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-green-400 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Online
            </div>
          </div>
        </div>

        {/* Search Bar */}
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
        <div className="flex">
          <button
            onClick={() => setActiveTab('waiting')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
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
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
              activeTab === 'accepted'
                ? 'text-green-400 border-b-2 border-green-400 bg-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4" />
            <span>Em Atendimento</span>
            {acceptedTickets.length > 0 && (
              <div className="bg-green-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {acceptedTickets.length}
              </div>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('resolved')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
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
      <div className="flex-1 overflow-y-auto">
        {/* Aguardando Tab */}
        {activeTab === 'waiting' && (
          <div>
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
          <div>
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
          <div>
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
    </div>
  );
}
