import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  EyeIcon,
  TagIcon,
  UserGroupIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { useSocket } from '../../context/SocketContext';

const predefinedColors = [
  { name: 'Azul', value: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
  { name: 'Verde', value: 'bg-green-500', text: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30' },
  { name: 'Amarelo', value: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30' },
  { name: 'Vermelho', value: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/30' },
  { name: 'Roxo', value: 'bg-purple-500', text: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
  { name: 'Rosa', value: 'bg-pink-500', text: 'text-pink-400', bg: 'bg-pink-900/20', border: 'border-pink-500/30' },
  { name: 'Laranja', value: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-500/30' },
  { name: 'Cinza', value: 'bg-gray-500', text: 'text-gray-400', bg: 'bg-gray-900/20', border: 'border-gray-500/30' },
  { name: 'Índigo', value: 'bg-indigo-500', text: 'text-indigo-400', bg: 'bg-indigo-900/20', border: 'border-indigo-500/30' },
  { name: 'Teal', value: 'bg-teal-500', text: 'text-teal-400', bg: 'bg-teal-900/20', border: 'border-teal-500/30' }
];

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
  const [activeTab, setActiveTab] = useState('waiting'); // 'waiting', 'accepted', 'resolved', 'groups'
  const [collapsed, setCollapsed] = useState(false); // mobile collapse
  const [previewTicket, setPreviewTicket] = useState(null); // ticket sendo visualizado
  const [previewMessages, setPreviewMessages] = useState([]); // mensagens do preview
  const [loadingPreview, setLoadingPreview] = useState(false); // carregando preview
  const [groupsEnabled, setGroupsEnabled] = useState(false); // controla se grupos estão habilitados

  // Carregar configuração de grupos do localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('groupSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setGroupsEnabled(settings.showGroups || false);
    }
  }, []);

  // Escutar mudanças nas configurações de grupos
  useEffect(() => {
    const handleGroupSettingsChange = (event) => {
      const { showGroups } = event.detail;
      setGroupsEnabled(showGroups);
      
      // Se grupos foram desabilitados e estamos na aba de grupos, mudar para waiting
      if (!showGroups && activeTab === 'groups') {
        setActiveTab('waiting');
      }
    };

    window.addEventListener('groupSettingsChanged', handleGroupSettingsChange);
    return () => window.removeEventListener('groupSettingsChanged', handleGroupSettingsChange);
  }, [activeTab]);

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

  const getColorClasses = (color) => {
    const colorMap = predefinedColors.find(c => c.value === color);
    return colorMap || predefinedColors[0];
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

  // Filtrar tickets por termo de busca e por tipo (grupos/individuais)
  const filteredTickets = tickets.filter(ticket => {
    // Filtro de busca
    const matchesSearch = ticket.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.Contact?.name && ticket.Contact.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ticket.Contact?.pushname && ticket.Contact.pushname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ticket.lastMessage && ticket.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()));

    // Se grupos estão desabilitados, filtrar apenas contatos individuais
    if (!groupsEnabled) {
      return matchesSearch && (!ticket.Contact?.isGroup);
    }

    return matchesSearch;
  });

  // Dividir tickets por status
  const waitingTickets = filteredTickets.filter(ticket => 
    (ticket.chatStatus === 'waiting' || !ticket.chatStatus) && (!ticket.Contact?.isGroup) // Excluir grupos dos status normais
  );
  const acceptedTickets = filteredTickets.filter(ticket => 
    ticket.chatStatus === 'accepted' && ticket.assignedUserId && (!ticket.Contact?.isGroup) // Apenas aceitos com usuário atribuído, excluir grupos
  );
  const resolvedTickets = filteredTickets.filter(ticket => 
    ticket.chatStatus === 'resolved' && (!ticket.Contact?.isGroup) // Excluir grupos dos status normais
  );
  const closedTickets = filteredTickets.filter(ticket => 
    ticket.chatStatus === 'closed' && (!ticket.Contact?.isGroup) // Excluir grupos dos status normais
  );

  // Tickets de grupos (apenas se grupos estiverem habilitados)
  const groupTickets = groupsEnabled ? filteredTickets.filter(ticket => 
    ticket.Contact?.isGroup
  ) : [];

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

  const handleCopyLink = async (e) => {
    e.stopPropagation();
    try {
      const ticketUrl = `${window.location.origin}/tickets/${ticket.uid}`;
      await navigator.clipboard.writeText(ticketUrl);
      // Você pode adicionar um toast de sucesso aqui se quiser
      console.log('Link copiado:', ticketUrl);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
    }
  };    return (
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
            
            {/* Indicador de grupo */}
            {ticket.Contact?.isGroup && (
              <div className="absolute -bottom-1 -right-1 bg-purple-500 rounded-full p-1">
                <UserGroupIcon className="w-3 h-3 text-white" />
              </div>
            )}
            
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
                {ticket.Contact?.isGroup && (
                  <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">GRUPO</span>
                )}
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
            
            {/* Tags */}
            {ticket.tags && ticket.tags.length > 0 && (
              <div className="flex items-center gap-1 mb-1 flex-wrap">
                {ticket.tags.slice(0, 3).map(tag => {
                  const colorClasses = getColorClasses(tag.color);
                  return (
                    <div
                      key={tag.id}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${colorClasses.text} ${colorClasses.bg} border ${colorClasses.border}`}
                    >
                      <TagIcon className="w-2.5 h-2.5" />
                      {tag.name}
                    </div>
                  );
                })}
                {ticket.tags.length > 3 && (
                  <span className="text-slate-400 text-[10px] font-medium px-1">
                    +{ticket.tags.length - 3}
                  </span>
                )}
              </div>
            )}
            
            <div className="relative group">
              <p className="text-slate-400 text-sm truncate pr-16">
                {/* Exibir informações da última mensagem */}
                {ticket.LastMessage ? (
                  <>
                    {ticket.LastMessage.isFromGroup && ticket.LastMessage.participantName && (
                      <span className="text-green-300 font-medium">
                        {ticket.LastMessage.participantName}: 
                      </span>
                    )}
                    <span className={ticket.LastMessage.isFromGroup ? "ml-1" : ""}>
                      {ticket.LastMessage.content || ticket.lastMessage || 'Mensagem sem conteúdo'}
                    </span>
                  </>
                ) : (
                  ticket.lastMessage || 'Nenhuma mensagem ainda'
                )}
              </p>
              
              {/* Tooltip com mensagem completa */}
              {((ticket.LastMessage?.content || ticket.lastMessage) && 
                (ticket.LastMessage?.content || ticket.lastMessage).length > 50) && (
                <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 max-w-xs break-words pointer-events-none">
                  {ticket.LastMessage?.isFromGroup && ticket.LastMessage?.participantName && (
                    <div className="text-green-300 font-medium mb-1">
                      👥 {ticket.LastMessage.participantName}
                      {ticket.LastMessage.groupName && ` (${ticket.LastMessage.groupName})`}
                    </div>
                  )}
                  {ticket.LastMessage?.content || ticket.lastMessage}
                  <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                </div>
              )}
              
              {/* Botões de ação */}
              <div className="absolute right-0 top-0 flex space-x-1">
                {/* Botão copiar link */}
                <button
                  onClick={handleCopyLink}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded flex-shrink-0 flex items-center space-x-1 transition-colors"
                  title="Copiar link direto do ticket"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Link</span>
                </button>
                
                {/* Botão espiar conversa */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewClick(ticket);
                  }}
                  className="bg-slate-600 hover:bg-slate-500 text-white text-xs px-2 py-1 rounded flex-shrink-0 flex items-center space-x-1 transition-colors"
                  title="Espiar conversa"
                >
                  <EyeIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Espiar</span>
                </button>
              </div>
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
          
          {/* Aba de Grupos - só aparece se habilitada */}
          {groupsEnabled && (
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 px-2 py-3 flex flex-col items-center justify-center space-y-1 transition-colors ${
                activeTab === 'groups'
                  ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <div className="relative">
                <UserGroupIcon className="w-5 h-5" />
                {groupTickets.length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] text-center">
                    {groupTickets.length > 9 ? '9+' : groupTickets.length}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium">Grupos</span>
            </button>
          )}
          
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
          
          {/* Aba de Grupos - só aparece se habilitada */}
          {groupsEnabled && (
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 px-3 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
                activeTab === 'groups'
                  ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <UserGroupIcon className="w-4 h-4" />
              <span>Grupos</span>
              {groupTickets.length > 0 && (
                <div className="bg-purple-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {groupTickets.length}
                </div>
              )}
            </button>
          )}
          
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

        {/* Grupos Tab */}
        {activeTab === 'groups' && (
          <div className="flex-1 overflow-y-auto">
            {groupTickets.length > 0 ? (
              <>
                <div className="px-4 py-3 bg-slate-750 border-b border-slate-700">
                  <h3 className="text-purple-400 font-medium text-sm flex items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                    Grupos WhatsApp
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Conversas em grupos onde você foi mencionado ou recebeu mensagens
                  </p>
                </div>
                {groupTickets.map(ticket => renderTicket(ticket, true, false))}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <UserGroupIcon className="w-16 h-16 text-slate-600 mb-4" />
                <p className="text-slate-400 text-sm">
                  {searchTerm ? 'Nenhum grupo encontrado' : 'Nenhuma conversa de grupo ativa'}
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  Grupos aparecerão aqui quando houver novas mensagens
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
                    <div key={index} className={`flex ${message.fromMe ? 'justify-end' : message.sender === 'system' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-4 py-3 rounded-lg text-sm ${
                        message.fromMe 
                          ? 'bg-green-600 text-white rounded-br-sm' 
                          : message.sender === 'system'
                          ? 'bg-gradient-to-r from-blue-50/10 to-indigo-50/10 text-blue-100 rounded-xl border border-blue-400/40'
                          : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                      }`}>
                        <p className="break-words leading-relaxed">
                          {message.sender === 'system' && (
                            <span className="text-xs text-blue-400 font-medium mr-2 px-2 py-1 bg-blue-500/20 rounded-full">
                              🤖 Sistema
                            </span>
                          )}
                          {message.isFromGroup && message.participantName && (
                            <span className="text-xs text-green-400 font-medium mr-2 px-2 py-1 bg-green-500/20 rounded-full">
                              👥 {message.participantName}
                            </span>
                          )}
                          {message.body || message.content || 'Mensagem sem conteúdo'}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-1">
                          <p className={`text-xs ${message.fromMe ? 'text-green-200' : message.sender === 'system' ? 'text-blue-400' : 'text-slate-400'}`}>
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
