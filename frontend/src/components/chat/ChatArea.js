import React from 'react';
import { useAuth } from '../../context/AuthContext';
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

export default function ChatArea({ 
  selectedTicket, 
  messages, 
  newMessage, 
  onNewMessageChange, 
  onSendMessage,
  showContactInfo,
  onToggleContactInfo
}) {
  const { user } = useAuth();

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

return (
    <div className="flex-1 flex flex-col bg-slate-700 h-screen max-h-screen">
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
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${getRandomAvatarColor(selectedTicket.contact)}`}>
                                {getAvatarInitials(selectedTicket.contact)}
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
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => onNewMessageChange(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
                        className="flex-1 bg-transparent text-white placeholder-slate-400 focus:outline-none"
                    />
                    <button className="ml-2 text-slate-400 hover:text-white">
                        <MicrophoneIcon className="w-5 h-5" />
                    </button>
                </div>
                <button
                    onClick={onSendMessage}
                    className="p-3 bg-yellow-500 text-slate-900 rounded-full hover:bg-yellow-400 transition-colors"
                >
                    <PaperAirplaneIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    </div>
);
}
