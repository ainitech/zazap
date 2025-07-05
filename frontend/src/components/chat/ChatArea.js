import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import { 
  ChatBubbleBottomCenterTextIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function ChatArea({ 
  selectedTicket, 
  messages, 
  newMessage, 
  onNewMessageChange, 
  onSendMessage,
  showContactInfo,
  onToggleContactInfo,
  isRealTime = true,
  isSendingMessage = false
}) {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  
  // Estados para informações do contato
  const [contactInfo, setContactInfo] = useState(null);
  const [loadingContact, setLoadingContact] = useState(false);

  // Conectar ao WebSocket
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(API_URL, {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      // Escutar atualizações de contatos
      socketRef.current.on('contact-updated', (updatedContact) => {
        if (selectedTicket?.contactId === updatedContact.id) {
          console.log('📱 Contato atualizado via socket:', updatedContact);
          setContactInfo(updatedContact);
        }
      });

      // Escutar atualizações de tickets (podem incluir novos dados de contato)
      socketRef.current.on('tickets-update', (tickets) => {
        if (selectedTicket?.id) {
          const updatedTicket = tickets.find(t => t.id === selectedTicket.id);
          if (updatedTicket?.Contact) {
            console.log('🎫 Ticket atualizado com dados do contato via socket:', updatedTicket.Contact);
            setContactInfo(updatedTicket.Contact);
          }
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('contact-updated');
        socketRef.current.off('tickets-update');
      }
    };
  }, [selectedTicket]);

  // Buscar informações do contato quando o ticket muda
  useEffect(() => {
    if (selectedTicket?.contactId) {
      // Se o ticket já tem dados do contato, usar eles primeiro
      if (selectedTicket.Contact) {
        console.log('👤 Usando dados do contato do ticket no ChatArea:', selectedTicket.Contact);
        setContactInfo(selectedTicket.Contact);
        // Buscar informações mais recentes em background
        fetchContactInfo();
      } else {
        // Se não tem dados do contato no ticket, buscar
        fetchContactInfo();
      }
    } else {
      setContactInfo(null);
    }
  }, [selectedTicket?.contactId, selectedTicket?.Contact]);

  const fetchContactInfo = async () => {
    if (!selectedTicket?.contactId) return;
    
    try {
      // Só mostrar loading se não temos dados do contato ainda
      if (!contactInfo) {
        setLoadingContact(true);
      }
      const response = await fetch(`${API_URL}/api/contacts/${selectedTicket.contactId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('👤 Informações do contato carregadas via API no ChatArea:', data);
        setContactInfo(data);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar informações do contato:', error);
    } finally {
      setLoadingContact(false);
    }
  };

  // Scroll automático para o final quando novas mensagens chegam
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Scroll automático imediato quando enviar mensagem
  useEffect(() => {
    if (isSendingMessage && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isSendingMessage]);

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  if (!selectedTicket) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-700">
        <div className="text-center text-slate-400">
          <ChatBubbleBottomCenterTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium mb-2 text-white">Select a conversation</h3>
          <p>Choose a conversation from the list to start messaging</p>
        </div>
      </div>
    );
  }

  // Usar dados reais do contato se disponíveis, senão usar dados do ticket
  const displayName = contactInfo?.name || contactInfo?.pushname || selectedTicket?.Contact?.name || selectedTicket?.Contact?.pushname || selectedTicket.contact;
  const displayNumber = contactInfo?.formattedNumber || selectedTicket?.Contact?.formattedNumber || selectedTicket.contact;
  const avatarUrl = contactInfo?.profilePicUrl || selectedTicket?.Contact?.profilePicUrl;

return (
    <div className="flex-1 flex flex-col bg-slate-700 h-screen max-h-screen">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-600 bg-slate-800">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden">
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
                            className={`w-full h-full flex items-center justify-center ${getRandomAvatarColor(displayName)} ${avatarUrl ? 'hidden' : 'flex'}`}
                        >
                            {getAvatarInitials(displayName)}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-white font-medium">{displayName}</h3>
                        <div className="flex items-center space-x-2">
                            <p className="text-slate-400 text-sm">
                                {displayNumber.includes('@') ? displayNumber.split('@')[0] : displayNumber}
                            </p>
                            {loadingContact && (
                                <div className="flex items-center space-x-1">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-blue-400 font-medium">Atualizando...</span>
                                </div>
                            )}
                            {isRealTime && !loadingContact && (
                                <div className="flex items-center space-x-1">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-green-400 font-medium">
                                        {isSendingMessage ? 'Enviando...' : 'Tempo Real'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                        <VideoCameraIcon className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                        <PhoneIcon className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                        <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={onToggleContactInfo}
                        className={`p-2 rounded-lg transition-colors ${
                            showContactInfo 
                                ? 'bg-yellow-500 text-slate-900' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                    >
                        <InformationCircleIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-600">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
                        {message.sender !== 'user' && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs overflow-hidden">
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
                                    className={`w-full h-full flex items-center justify-center ${getRandomAvatarColor(displayName)} ${avatarUrl ? 'hidden' : 'flex'}`}
                                >
                                    {getAvatarInitials(displayName)}
                                </div>
                            </div>
                        )}
                        <div className={`px-4 py-2 rounded-2xl ${
                            message.sender === 'user'
                                ? 'bg-yellow-500 text-slate-900 rounded-br-md'
                                : 'bg-slate-700 text-white rounded-bl-md border border-slate-600'
                        }`}>
                            <p className="text-sm">{message.content}</p>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-xs opacity-70">
                                    {formatMessageTime(message.timestamp)}
                                </span>
                                {message.sender === 'user' && (
                                    <div className="ml-2">
                                        <svg className="w-3 h-3 opacity-70" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                        {message.sender === 'user' && (
                            <div className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-white text-xs">
                                {user?.name ? getAvatarInitials(user.name) : 'U'}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {/* Referência para scroll automático */}
            <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-slate-600 bg-slate-800">
            <div className="flex items-end space-x-2">
                <button className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full">
                    <PaperClipIcon className="w-5 h-5" />
                </button>
                <div className="flex-1 bg-slate-700 rounded-full px-4 py-3 flex items-center border border-slate-600">
                    <input
                        type="text"
                        placeholder={isSendingMessage ? "Enviando..." : "Type a message..."}
                        value={newMessage}
                        onChange={(e) => onNewMessageChange(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isSendingMessage && newMessage.trim() && onSendMessage()}
                        disabled={isSendingMessage}
                        className={`flex-1 bg-transparent text-white placeholder-slate-400 focus:outline-none ${
                            isSendingMessage ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    />
                    <button className="ml-2 text-slate-400 hover:text-white">
                        <MicrophoneIcon className="w-5 h-5" />
                    </button>
                </div>
                <button
                    onClick={onSendMessage}
                    disabled={isSendingMessage || !newMessage.trim()}
                    className={`p-3 rounded-full transition-colors ${
                        isSendingMessage || !newMessage.trim()
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                            : 'bg-yellow-500 text-slate-900 hover:bg-yellow-400'
                    }`}
                >
                    {isSendingMessage ? (
                        <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <PaperAirplaneIcon className="w-5 h-5" />
                    )}
                </button>
            </div>
        </div>
    </div>
);
}
