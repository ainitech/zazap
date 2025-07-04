import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ConversationList from '../chat/ConversationList';
import ChatArea from '../chat/ChatArea';
import ContactInfo from '../chat/ContactInfo';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function ChatComponent() {
  const { ticketId } = useParams();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showContactInfo, setShowContactInfo] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (ticketId) {
      const ticket = tickets.find(t => t.id === parseInt(ticketId));
      if (ticket) {
        handleTicketSelect(ticket);
      }
    }
  }, [ticketId, tickets]);

  const fetchTickets = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tickets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
    }
  };

  const fetchMessages = async (ticketId) => {
    try {
      const response = await fetch(`${API_URL}/api/ticket-messages/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  const handleTicketSelect = (ticket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
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
        setNewMessage('');
        fetchMessages(selectedTicket.id);
        fetchTickets();
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const unreadCount = tickets.filter(ticket => ticket.unreadCount > 0).length;

  return (
    <div className="flex h-screen bg-gray-50">
      <ConversationList
        tickets={tickets}
        selectedTicket={selectedTicket}
        onTicketSelect={handleTicketSelect}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        unreadCount={unreadCount}
      />
      <ChatArea
        selectedTicket={selectedTicket}
        messages={messages}
        newMessage={newMessage}
        onNewMessageChange={setNewMessage}
        onSendMessage={sendMessage}
        showContactInfo={showContactInfo}
        onToggleContactInfo={() => setShowContactInfo(!showContactInfo)}
      />
      <ContactInfo
        selectedTicket={selectedTicket}
        showContactInfo={showContactInfo}
      />
    </div>
  );
}
