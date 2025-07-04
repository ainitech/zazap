import React from 'react';
import { 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

export default function ConversationList({ 
  tickets, 
  selectedTicket, 
  onTicketSelect, 
  searchTerm, 
  onSearchChange,
  unreadCount 
}) {
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

  const filteredTickets = tickets.filter(ticket => 
    ticket.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ticket.lastMessage && ticket.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
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
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
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
            onClick={() => onTicketSelect(ticket)}
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
  );
}
