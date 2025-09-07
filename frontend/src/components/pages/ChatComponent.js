
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ConversationList from '../chat/ConversationList';
import ChatArea from '../chat/ChatArea';
import ContactInfo from '../chat/ContactInfo';
import { useSocket } from '../../context/SocketContext';
import { apiUrl, apiFetch, safeJson } from '../../utils/apiClient';

// Use centralized apiUrl for backend requests

export default function ChatComponent() {
  const { ticketId, uid } = useParams();
  const navigate = useNavigate();
  const { socket, isConnected, joinTicket, leaveTicket } = useSocket();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // Refs para controlar o ticket atual
  const currentTicketIdRef = useRef(null);

  // Função para limpar o estado salvo do ticket
  const clearSavedTicket = () => {
    // Antes: removia de localStorage. Agora não persistimos mais.
    console.log('🧹 Persistência em localStorage removida – nada para limpar');
  };

  useEffect(() => {
    const initializeComponent = async () => {
      // Buscar tickets iniciais apenas uma vez
      await fetchTickets();
      
      // Se há um ticketId/UID na URL, buscar esse ticket específico
      const ticketIdentifier = uid || ticketId;
      if (ticketIdentifier) {
        if (uid) {
          console.log(`🚀 [INIT] Inicializando com UID: ${uid}`);
          await fetchTicketByUid(ticketIdentifier);
        } else {
          console.log(`🚀 [INIT] Inicializando com ticketId: ${ticketId}`);
          await fetchTicketById(ticketIdentifier);
        }
      } else {
  // Persistência via localStorage removida; nada a restaurar
  console.log('🚀 [INIT] Nenhum parâmetro encontrado e persistência local desativada');
      }
    };

    initializeComponent();
    
    // Cleanup ao desmontar
    return () => {
      if (currentTicketIdRef.current) {
        leaveTicket(currentTicketIdRef.current);
      }
    };
  }, [ticketId, uid]); // Dependências ajustadas para evitar loops desnecessários
// Atualiza tickets em tempo real ao receber evento global
useEffect(() => {
  const handleRefresh = () => {
    fetchTickets(true);
  };
  window.addEventListener('refreshTickets', handleRefresh);
  return () => window.removeEventListener('refreshTickets', handleRefresh);
}, []);
  // Setup WebSocket listeners quando socket está disponível
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('⚠️ Socket não disponível ou não conectado', { socket: !!socket, isConnected });
      return;
    }

    console.log('🔗 Configurando listeners WebSocket...');
    console.log('🎯 Ticket selecionado:', selectedTicket?.id);
    
    // Se há um ticket selecionado quando o WebSocket reconecta, entrar na sala novamente
    if (selectedTicket) {
      console.log(`🔄 Reconectando - entrando na sala do ticket ${selectedTicket.id}`);
      joinTicket(selectedTicket.id);
      console.log(`🔄 Reconectado - entrando novamente na sala do ticket ${selectedTicket.id}`);
    }
    
    // Listener para atualizações de tickets
    const handleTicketsUpdate = (tickets) => {
      console.log('🔄 Atualização de tickets recebida via WebSocket:', tickets.length);
      setTickets(tickets);
    };
    
    // Listener para novas mensagens
  const handleNewMessage = (message) => {
      try {
        console.log('🔔 ChatComponent: handleNewMessage chamado');
        console.log('📝 Dados recebidos (raw):', message);
        
        // Normalize Sequelize instances: message may be wrapped in dataValues
        const normalized = message && message.dataValues ? message.dataValues : message;
        // Ensure numeric ticketId
        const msgTicketId = normalized?.ticketId ? Number(normalized.ticketId) : undefined;
        console.log('🔔 Nova mensagem recebida via WebSocket:', normalized);
        console.log('🔍 Ticket atual:', selectedTicket?.id, 'Mensagem para ticket:', msgTicketId);
        console.log('🧮 Tipos:', typeof selectedTicket?.id, typeof msgTicketId);

        // Adicionar mensagem se for do ticket atual
        if (selectedTicket && msgTicketId === selectedTicket.id) {
          console.log('✅ Adicionando mensagem ao ticket atual');
          setMessages(prevMessages => {
            console.log('📊 Mensagens anteriores:', prevMessages.length);
            // Verificar se a mensagem já existe para evitar duplicatas
            const exists = prevMessages.some(m => (m.id || m.dataValues?.id) === (normalized.id || normalized.dataValues?.id));
            if (exists) {
              console.log('⚠️ Mensagem já existe, ignorando duplicata');
              return prevMessages;
            }

            console.log('➕ Adicionando nova mensagem:', normalized);
            const newMessages = [...prevMessages, normalized];
            console.log('📊 Total de mensagens após adicionar:', newMessages.length);
            return newMessages;
          });

          // Reproduzir som de notificação se for de contato
          if (normalized.sender === 'contact') {
            try {
              const audio = new Audio('/notification.mp3');
              audio.volume = 0.3;
              audio.play().catch(e => console.log('Não foi possível reproduzir som'));
            } catch (e) {
              // Som não disponível
            }
          }
        } else {
          console.log('❌ Mensagem não é para o ticket atual, ignorando');
          console.log('❌ Comparação falhou:', { 
            selectedTicketExists: !!selectedTicket,
            selectedTicketId: selectedTicket?.id,
            msgTicketId,
            areEqual: selectedTicket && msgTicketId === selectedTicket.id
          });

          // Se a mensagem é de um ticket que não está na lista atual, atualizar a lista de tickets
          const existsInList = Array.isArray(tickets) && tickets.some(t => Number(t.id) === Number(msgTicketId));
          if (!existsInList && msgTicketId) {
            console.log('🔄 Ticket não está na lista atual. Atualizando tickets...');
            fetchTickets(true);
          }
        }

        // Atualizar sempre a lista de tickets com lastMessage e updatedAt para o ticket correspondente
        if (msgTicketId) {
          setTickets(prev => {
            if (!Array.isArray(prev)) return prev;
            const updated = prev.map(t => {
              if (Number(t.id) === Number(msgTicketId)) {
                return {
                  ...t,
                  lastMessage: normalized.content || normalized.lastMessage || t.lastMessage,
                  updatedAt: normalized.ticketUpdatedAt || new Date().toISOString(),
                  unreadCount: (selectedTicket && selectedTicket.id === msgTicketId) ? 0 : ((t.unreadCount || 0) + (normalized.sender === 'contact' ? 1 : 0))
                };
              }
              return t;
            });
            return updated;
          });
        }
      } catch (err) {
        console.error('Erro em handleNewMessage:', err);
      }
    };

    // Listener para atualizações de mensagens
    const handleMessageUpdate = ({ ticketId, message }) => {
      try {
        console.log('🔄 ChatComponent: handleMessageUpdate chamado');
        console.log('📝 Dados recebidos (raw):', { ticketId, message });
        
        const tid = ticketId ? Number(ticketId) : undefined;
        const normalized = message && message.dataValues ? message.dataValues : message;
        console.log('🔄 Atualização de mensagem via WebSocket:', { ticketId: tid, message: normalized });
        console.log('🔍 Ticket atual:', selectedTicket?.id, 'Update para ticket:', tid);
        console.log('🧮 Tipos:', typeof selectedTicket?.id, typeof tid);

        // Se for do ticket atual, adicionar mensagem
        if (selectedTicket && tid === selectedTicket.id) {
          console.log('✅ Processando atualização para ticket atual');
          setMessages(prevMessages => {
            console.log('📊 Mensagens anteriores:', prevMessages.length);
            const exists = prevMessages.some(m => (m.id || m.dataValues?.id) === (normalized.id || normalized.dataValues?.id));
            if (exists) {
              console.log('⚠️ Mensagem já existe no message-update, ignorando');
              return prevMessages;
            }
            console.log('➕ Adicionando mensagem via message-update:', normalized);
            const newMessages = [...prevMessages, normalized];
            console.log('📊 Total de mensagens após message-update:', newMessages.length);
            return newMessages;
          });
        } else {
          console.log('❌ Message-update não é para o ticket atual, ignorando');
          console.log('❌ Comparação falhou:', { 
            selectedTicketExists: !!selectedTicket,
            selectedTicketId: selectedTicket?.id,
            updateTicketId: tid,
            areEqual: selectedTicket && tid === selectedTicket.id
          });
        }
      } catch (err) {
        console.error('Erro em handleMessageUpdate:', err);
      }
    };

    socket.on('tickets-update', handleTicketsUpdate);
    socket.on('new-message', handleNewMessage);
    socket.on('message-update', handleMessageUpdate);

    console.log('✅ Listeners WebSocket registrados:', {
      'tickets-update': true,
      'new-message': true,
      'message-update': true
    });

    // Garantir que estamos na sala do ticket após configurar listeners
    if (selectedTicket) {
      console.log(`🎯 Garantindo entrada na sala do ticket ${selectedTicket.id} após configurar listeners`);
      setTimeout(() => {
        joinTicket(selectedTicket.id);
        console.log(`🔄 Entrada forçada na sala do ticket ${selectedTicket.id}`);
      }, 100);
    }

    // Listener de teste para verificar se eventos estão chegando
    socket.on('test-event', (data) => {
      console.log('🧪 Evento de teste recebido:', data);
    });

    return () => {
      console.log('🧹 Removendo listeners WebSocket do ChatComponent');
      socket.off('tickets-update', handleTicketsUpdate);
      socket.off('new-message', handleNewMessage);
      socket.off('message-update', handleMessageUpdate);
      socket.off('test-event');
    };
  }, [socket, isConnected, selectedTicket, joinTicket]);

  useEffect(() => {
    if (ticketId) {
      const ticket = tickets.find(t => t.id === parseInt(ticketId));
      if (ticket) {
        handleTicketSelect(ticket);
      }
    }
  }, [ticketId, tickets]);

  const acceptTicket = async (ticketId) => {
    try {
      console.log(`🎫 Aceitando ticket #${ticketId}...`);
      
      const response = await apiFetch(`/api/tickets/${ticketId}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Ticket #${ticketId} aceito com sucesso!`);
        
        // Atualizar lista de tickets
        await fetchTickets(true);
        
        // Se o ticket aceito for o selecionado atualmente, atualizá-lo
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(data.ticket);
        }
        
        return data.ticket;
      } else {
        const errorData = await response.json();
        console.error('❌ Erro ao aceitar ticket:', errorData.error);
        alert('Erro ao aceitar ticket: ' + errorData.error);
      }
    } catch (error) {
      console.error('❌ Erro ao aceitar ticket:', error);
      alert('Erro ao aceitar ticket. Tente novamente.');
    }
  };

  // Função de refresh para pull-to-refresh
  const handleRefreshTickets = async () => {
    console.log('🔄 Pull-to-refresh iniciado');
    try {
      await fetchTickets(true);
      console.log('✅ Pull-to-refresh concluído');
    } catch (error) {
      console.error('❌ Erro no pull-to-refresh:', error);
    }
  };

  const fetchTickets = async (silent = false) => {
    try {
      if (!silent) {
        console.log('🔄 [FETCH TICKETS] Buscando tickets...');
        console.trace('Stack trace da chamada fetchTickets:');
      }
      
  const response = await apiFetch('/api/tickets');
      
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
        if (!silent) console.log(`✅ [FETCH TICKETS] ${data.length} tickets carregados`);
      } else {
        if (!silent) console.error('❌ [FETCH TICKETS] Erro ao carregar tickets');
      }
    } catch (error) {
      if (!silent) console.error('❌ [FETCH TICKETS] Erro ao buscar tickets:', error);
    }
  };

  const fetchTicketByUid = async (uid) => {
    try {
      console.log(`🔍 [FETCH BY UID] Buscando ticket por UID: ${uid}`);
      
  const response = await apiFetch(`/api/tickets/uid/${uid}`);
      
      if (response.ok) {
        const ticket = await response.json();
        console.log(`✅ [FETCH BY UID] Ticket encontrado:`, ticket.id);
        
        // Selecionar o ticket encontrado
        handleTicketSelect(ticket);
      } else if (response.status === 404) {
        console.error('❌ [FETCH BY UID] Ticket não encontrado');
      } else {
        console.error('❌ [FETCH BY UID] Erro ao buscar ticket por UID');
      }
    } catch (error) {
      console.error('❌ [FETCH BY UID] Erro ao buscar ticket por UID:', error);
    }
  };

  const fetchTicketById = async (id) => {
    try {
      console.log(`🔍 [FETCH BY ID] Buscando ticket por ID: ${id}`);
      
  const response = await apiFetch(`/api/tickets?ticketId=${id}`);
      
      if (response.ok) {
        const tickets = await response.json();
        if (tickets.length > 0) {
          const ticket = tickets[0];
          console.log(`✅ [FETCH BY ID] Ticket encontrado:`, ticket.id);
          
          // Selecionar o ticket encontrado
          handleTicketSelect(ticket);
        } else {
          console.error('❌ [FETCH BY ID] Ticket não encontrado');
        }
      } else {
        console.error('❌ [FETCH BY ID] Erro ao buscar ticket por ID');
      }
    } catch (error) {
      console.error('❌ [FETCH BY ID] Erro ao buscar ticket por ID:', error);
    }
  };

  const fetchMessagesOnce = async (ticketId) => {
    try {
      console.log(`🔄 [FETCH ONCE] Buscando mensagens iniciais para ticket ${ticketId}...`);
      console.trace('Stack trace da chamada fetchMessagesOnce:');
      
  const response = await apiFetch(`/api/ticket-messages/${ticketId}`);
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        console.log(`✅ [FETCH ONCE] ${data.length} mensagens iniciais carregadas para ticket ${ticketId}`);
      } else {
        console.error('❌ [FETCH ONCE] Erro ao buscar mensagens iniciais');
      }
    } catch (error) {
      console.error('❌ [FETCH ONCE] Erro ao buscar mensagens iniciais:', error);
    }
  };

  const handleTicketSelect = (ticket) => {
    console.log('🎯 ChatComponent: Selecionando ticket:', ticket.id, 'UID:', ticket.uid);
    
    // Sair do ticket anterior se houver
    if (currentTicketIdRef.current) {
      console.log('🚪 Saindo do ticket anterior:', currentTicketIdRef.current);
      leaveTicket(currentTicketIdRef.current);
    }
    
    setSelectedTicket(ticket);
    setMessages([]); // Limpar mensagens anteriores
    currentTicketIdRef.current = ticket.id;
    
  // Persistência removida (antes salvava no localStorage)
    
    console.log('📋 Estado atualizado:', {
      selectedTicketId: ticket.id,
      messagesCleared: true,
      currentTicketIdRef: currentTicketIdRef.current
    });
    
    // Sempre navegar para a URL do ticket com UID se disponível
    const targetUrl = ticket.uid ? `/tickets/${ticket.uid}` : `/chat/${ticket.id}`;
    const currentPath = window.location.pathname;
    
    if (currentPath !== targetUrl) {
      console.log('🔗 Navegando para URL do ticket:', targetUrl);
      navigate(targetUrl, { replace: true });
    } else {
      console.log('✅ Já estamos na URL correta:', currentPath);
    }
    
    // Buscar mensagens iniciais apenas uma vez via API
    fetchMessagesOnce(ticket.id);
    
    // Entrar na sala do ticket para receber mensagens em tempo real
    if (socket && isConnected) {
      console.log('🚪 Entrando na sala do ticket:', ticket.id);
      joinTicket(ticket.id);
      console.log(`📱 Ticket selecionado: ${ticket.id} - WebSocket conectado`);
      
      // Garantir entrada na sala com retry
      setTimeout(() => {
        console.log(`🔄 Retry: Garantindo entrada na sala do ticket ${ticket.id}`);
        joinTicket(ticket.id);
      }, 200);
    } else {
      console.log(`⚠️ WebSocket não conectado ao selecionar ticket ${ticket.id}`, {
        socket: !!socket,
        isConnected
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || isSendingMessage) return;

    try {
      setIsSendingMessage(true);
      console.log(`📤 Enviando mensagem para ticket ${selectedTicket.id}...`);
      console.log(`🔗 WebSocket conectado: ${isConnected}, Socket: ${socket ? 'OK' : 'NULL'}`);
      
      const response = await apiFetch(`/api/ticket-messages/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'user', content: newMessage })
      });

      if (response.ok) {
        const sentMessage = await response.json();
        setNewMessage('');
        
        console.log('✅ Mensagem enviada com sucesso, aguardando WebSocket...');
        console.log('📨 Mensagem enviada:', sentMessage);
      } else {
        console.error('❌ Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const unreadCount = tickets.filter(ticket => ticket.unreadCount > 0).length;

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Mobile: ConversationList as overlay when no ticket selected */}
      <div className={`
        ${selectedTicket ? 'hidden lg:block' : 'block'} 
        ${selectedTicket ? 'lg:w-80' : 'w-full lg:w-80'} 
        relative z-10
      `}>
        <ConversationList
          tickets={tickets}
          selectedTicket={selectedTicket}
          onTicketSelect={handleTicketSelect}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          unreadCount={unreadCount}
          isRealTime={isConnected}
          currentUser={null} // TODO: Adicionar usuário atual quando necessário
          onAcceptTicket={acceptTicket}
          onRefresh={handleRefreshTickets}
        />
      </div>
      
      {/* Mobile: ChatArea takes full width when ticket selected */}
      <div className={`
        ${selectedTicket ? 'block' : 'hidden lg:block'} 
        ${selectedTicket ? 'w-full lg:flex-1' : 'lg:flex-1'} 
        relative
      `}>
        <ChatArea
          selectedTicket={selectedTicket}
          messages={messages}
          newMessage={newMessage}
          onNewMessageChange={setNewMessage}
          onSendMessage={sendMessage}
          showContactInfo={showContactInfo}
          onToggleContactInfo={() => setShowContactInfo(!showContactInfo)}
          isRealTime={isConnected}
          isSendingMessage={isSendingMessage}
          onBackToList={() => setSelectedTicket(null)} // Add back button for mobile
        />
      </div>
      
      {/* ContactInfo as overlay on mobile */}
      <div className={`
        ${showContactInfo ? 'block' : 'hidden'} 
        lg:block lg:relative
        ${showContactInfo ? 'fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-auto' : ''}
        ${showContactInfo ? 'lg:w-80' : 'lg:w-0 lg:overflow-hidden'}
      `}>
        <ContactInfo
          selectedTicket={selectedTicket}
          showContactInfo={showContactInfo}
          onClose={() => setShowContactInfo(false)} // Add close function for mobile
        />
      </div>
    </div>
  );
}
