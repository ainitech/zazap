import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon,
  ChatBubbleBottomCenterTextIcon,
  UserGroupIcon,
  ClockIcon,
  StarIcon,
  ArchiveBoxIcon,
  TrashIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  AdjustmentsHorizontalIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';
import { 
  ChatBubbleBottomCenterTextIcon as ChatBubbleBottomCenterTextIconSolid
} from '@heroicons/react/24/solid';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const sidebarItems = [
  { icon: HomeIcon, label: 'Dashboard', isActive: false, route: '/dashboard' },
  { icon: ChatBubbleBottomCenterTextIcon, label: 'Messages', isActive: true, count: 0, route: '/chat' },
  { icon: UserGroupIcon, label: 'Contacts', isActive: false, route: '/contacts' },
  { icon: ClockIcon, label: 'Recent', isActive: false, route: '/recent' },
  { icon: StarIcon, label: 'Favorites', isActive: false, route: '/favorites' },
  { icon: ArchiveBoxIcon, label: 'Archived', isActive: false, route: '/archived' },
  { icon: TrashIcon, label: 'Trash', isActive: false, route: '/trash' },
  { icon: Cog6ToothIcon, label: 'Settings', isActive: false, route: '/settings' }
];
export default function Layout() {
  const { user, logout } = useAuth();
  const { ticketId } = useParams();
  const location = useLocation();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Latest');

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

  const filteredTickets = tickets.filter(ticket => 
    ticket.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ticket.lastMessage && ticket.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const unreadCount = tickets.filter(ticket => ticket.unreadCount > 0).length;

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Left Sidebar - Navigation Icons */}
      <div className="w-16 bg-slate-800 flex flex-col items-center py-4 border-r border-slate-700">
        {/* Logo */}
        <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center mb-6">
          <ChatBubbleBottomCenterTextIconSolid className="w-6 h-6 text-slate-900" />
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col space-y-3">
          {sidebarItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.route || 
                            (item.route === '/chat' && location.pathname.startsWith('/chat'));
            
            return (
              <div key={index} className="relative">
                {item.route ? (
                  <Link
                    to={item.route}
                    className={`p-3 rounded-xl transition-all duration-200 block ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                ) : (
                  <button
                    className={`p-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                )}
                {item.count && (
                  <div className="absolute -top-1 -right-1 bg-yellow-500 text-slate-900 text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                    {item.count}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="mt-auto">
          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {user?.name ? getAvatarInitials(user.name) : 'U'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Panel - Messages List */}
      <div className="w-80 bg-slate-800 flex flex-col border-r border-slate-700">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h1 className="text-white text-xl font-semibold">Messages</h1>
              {unreadCount > 0 && (
                <div className="ml-2 bg-yellow-500 text-slate-900 text-xs font-medium px-2 py-1 rounded-full">
                  {unreadCount}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Online
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-700 text-white text-sm placeholder-slate-400 pl-9 pr-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
            />
          </div>
        </div>

        {/* Filter Header */}
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-medium">Latest</h2>
            <button className="p-1 bg-yellow-500 text-slate-900 rounded">
              <AdjustmentsHorizontalIcon className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => handleTicketSelect(ticket)}
              className={`p-4 cursor-pointer border-b border-slate-700 hover:bg-slate-700 transition-colors ${
                selectedTicket?.id === ticket.id ? 'bg-slate-700 border-l-4 border-l-yellow-500' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${getRandomAvatarColor(ticket.contact)}`}>
                  {getAvatarInitials(ticket.contact)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white font-medium text-sm truncate">
                      {ticket.contact}
                    </h3>
                    <span className="text-slate-400 text-xs">
                      {formatTime(ticket.updatedAt)}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm truncate">
                    {ticket.lastMessage || 'No messages'}
                  </p>
                </div>
                {ticket.unreadCount > 0 && (
                  <div className="w-5 h-5 bg-yellow-500 text-slate-900 text-xs font-medium rounded-full flex items-center justify-center">
                    {ticket.unreadCount}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-700">
        {selectedTicket ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-600 bg-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${getRandomAvatarColor(selectedTicket.contact)}`}>
                    {getAvatarInitials(selectedTicket.contact)}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{selectedTicket.contact}</h3>
                    <p className="text-slate-400 text-sm">
                      {selectedTicket.contact.includes('@') ? selectedTicket.contact : `+${selectedTicket.contact}`}
                    </p>
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
                    onClick={() => setShowContactInfo(!showContactInfo)}
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
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex items-end space-x-2 max-w-xs lg:max-w-md">
                    {message.sender !== 'user' && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${getRandomAvatarColor(selectedTicket.contact)}`}>
                        {getAvatarInitials(selectedTicket.contact)}
                      </div>
                    )}
                    <div className={`px-4 py-2 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-yellow-500 text-slate-900 rounded-br-md'
                        : 'bg-slate-600 text-white rounded-bl-md'
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
                      <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-white text-xs">
                        {user?.name ? getAvatarInitials(user.name) : 'U'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-600">
              <div className="flex items-end space-x-2">
                <button className="p-3 text-slate-400 hover:text-white hover:bg-slate-600 rounded-full">
                  <PaperClipIcon className="w-5 h-5" />
                </button>
                <div className="flex-1 bg-slate-600 rounded-full px-4 py-3 flex items-center">
                  <input
                    type="text"
                    placeholder="Clean & Modern Design"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1 bg-transparent text-white placeholder-slate-400 focus:outline-none"
                  />
                  <button className="ml-2 text-slate-400 hover:text-white">
                    <MicrophoneIcon className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={sendMessage}
                  className="p-3 bg-yellow-500 text-slate-900 rounded-full hover:bg-yellow-400 transition-colors"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <ChatBubbleBottomCenterTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2 text-slate-300">Select a conversation</h3>
              <p>Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Contact Info */}
      {showContactInfo && selectedTicket && (
        <div className="w-80 bg-slate-700 border-l border-slate-600 flex flex-col">
          {/* Contact Header */}
          <div className="p-6 border-b border-slate-600 text-center">
            <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-lg font-medium ${getRandomAvatarColor(selectedTicket.contact)}`}>
              {getAvatarInitials(selectedTicket.contact)}
            </div>
            <h3 className="text-white text-lg font-medium mb-1">{selectedTicket.contact}</h3>
            <p className="text-slate-400 text-sm mb-4">
              {selectedTicket.contact.includes('@') ? selectedTicket.contact : `+${selectedTicket.contact}`}
            </p>
            
            {/* Action Buttons */}
            <div className="flex justify-center space-x-3">
              <button className="p-3 bg-yellow-500 text-slate-900 rounded-full hover:bg-yellow-400">
                <VideoCameraIcon className="w-5 h-5" />
              </button>
              <button className="p-3 bg-yellow-500 text-slate-900 rounded-full hover:bg-yellow-400">
                <PhoneIcon className="w-5 h-5" />
              </button>
              <button className="p-3 bg-yellow-500 text-slate-900 rounded-full hover:bg-yellow-400">
                <InformationCircleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="p-6 border-b border-slate-600">
            <h4 className="text-white font-medium mb-4">Attachment</h4>
            <div className="grid grid-cols-3 gap-2">
              {/* Mock attachment images */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="aspect-square bg-slate-600 rounded-lg"></div>
              ))}
              <div className="aspect-square bg-slate-600 rounded-lg flex items-center justify-center">
                <span className="text-slate-400 text-sm">More+</span>
              </div>
            </div>
          </div>

          {/* Files Section */}
          <div className="p-6">
            <div className="space-y-3">
              {[
                { name: 'Office Data.doc', date: '20 February 2022', size: '12 MB', type: 'doc' },
                { name: 'Schedule.pdf', date: '24 February 2022', size: '8.5 MB', type: 'pdf' },
                { name: 'Package Design.xls', date: '17 January 2022', size: '12 MB', type: 'xls' }
              ].map((file, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-slate-600 rounded-lg">
                  <div className="w-10 h-10 bg-slate-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs">{file.type.toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{file.name}</p>
                    <p className="text-slate-400 text-xs">{file.date} • {file.size}</p>
                  </div>
                  <button className="text-slate-400 hover:text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
