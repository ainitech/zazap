
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import ConversationList from '../chat/ConversationList';
import ChatArea from '../chat/ChatArea';
import ContactInfo from '../chat/ContactInfo';
import { useSocket } from '../../context/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function ChatComponent() {
  const { ticketId } = useParams();
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

  useEffect(() => {
    // Buscar tickets iniciais apenas uma vez
    fetchTickets();
    
    // Cleanup ao desmontar
    return () => {
      if (currentTicketIdRef.current) {
        leaveTicket(currentTicketIdRef.current);
      }
    };
  }, []);
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
    if (!socket || !isConnected) return;

    console.log('🔗 Configurando listeners WebSocket...');
    
    // Se há um ticket selecionado quando o WebSocket reconecta, entrar na sala novamente
    if (selectedTicket) {
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
      console.log('🔔 Nova mensagem recebida via WebSocket:', message);
      console.log('🔍 Ticket atual:', selectedTicket?.id, 'Mensagem para ticket:', message.ticketId);
      
      // Adicionar mensagem se for do ticket atual
      if (selectedTicket && message.ticketId === selectedTicket.id) {
        console.log('✅ Adicionando mensagem ao ticket atual');
        setMessages(prevMessages => {
          // Verificar se a mensagem já existe para evitar duplicatas
          const exists = prevMessages.some(m => m.id === message.id);
          if (exists) {
            console.log('⚠️ Mensagem já existe, ignorando duplicata');
            return prevMessages;
          }
          
          console.log('➕ Adicionando nova mensagem:', message);
          return [...prevMessages, message];
        });
        
        // Reproduzir som de notificação se for de contato
        if (message.sender === 'contact') {
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
      }
    };

    // Listener para atualizações de mensagens
    const handleMessageUpdate = ({ ticketId, message }) => {
      console.log('🔄 Atualização de mensagem via WebSocket:', { ticketId, message });
      
      // Se for do ticket atual, adicionar mensagem
      if (selectedTicket && ticketId === selectedTicket.id) {
        setMessages(prevMessages => {
          const exists = prevMessages.some(m => m.id === message.id);
          if (exists) return prevMessages;
          
          return [...prevMessages, message];
        });
      }
    };

    socket.on('tickets-update', handleTicketsUpdate);
    socket.on('new-message', handleNewMessage);
    socket.on('message-update', handleMessageUpdate);

    // Listener de teste para verificar se eventos estão chegando
    socket.on('test-event', (data) => {
      console.log('🧪 Evento de teste recebido:', data);
    });

    return () => {
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
      
      const response = await fetch(`${API_URL}/api/tickets/${ticketId}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
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

  const fetchTickets = async (silent = false) => {
    try {
      if (!silent) {
        console.log('🔄 [FETCH TICKETS] Buscando tickets...');
        console.trace('Stack trace da chamada fetchTickets:');
      }
      
      const response = await fetch(`${API_URL}/api/tickets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
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

  const fetchMessagesOnce = async (ticketId) => {
    try {
      console.log(`🔄 [FETCH ONCE] Buscando mensagens iniciais para ticket ${ticketId}...`);
      console.trace('Stack trace da chamada fetchMessagesOnce:');
      
      const response = await fetch(`${API_URL}/api/ticket-messages/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
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
    // Sair do ticket anterior se houver
    if (currentTicketIdRef.current) {
      leaveTicket(currentTicketIdRef.current);
    }
    
    setSelectedTicket(ticket);
    setMessages([]); // Limpar mensagens anteriores
    currentTicketIdRef.current = ticket.id;
    
    // Buscar mensagens iniciais apenas uma vez via API
    fetchMessagesOnce(ticket.id);
    
    // Entrar na sala do ticket para receber mensagens em tempo real
    if (socket && isConnected) {
      joinTicket(ticket.id);
      console.log(`📱 Ticket selecionado: ${ticket.id} - WebSocket conectado`);
    } else {
      console.log(`⚠️ WebSocket não conectado ao selecionar ticket ${ticket.id}`);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || isSendingMessage) return;

    try {
      setIsSendingMessage(true);
      console.log(`📤 Enviando mensagem para ticket ${selectedTicket.id}...`);
      console.log(`🔗 WebSocket conectado: ${isConnected}, Socket: ${socket ? 'OK' : 'NULL'}`);
      
      const response = await fetch(`${API_URL}/api/ticket-messages/${selectedTicket.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sender: 'user',
          content: newMessage
        })
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
      />
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
      />
      <ContactInfo
        selectedTicket={selectedTicket}
        showContactInfo={showContactInfo}
      />
    </div>
  );
}
