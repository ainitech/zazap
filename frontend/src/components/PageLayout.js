import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  HomeIcon,
  ChatBubbleBottomCenterTextIcon,
  UserGroupIcon,
  ClockIcon,
  StarIcon,
  ArchiveBoxIcon,
  TrashIcon,
  Cog6ToothIcon,
  PhoneIcon,
  PuzzlePieceIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { 
  ChatBubbleBottomCenterTextIcon as ChatBubbleBottomCenterTextIconSolid
} from '@heroicons/react/24/solid';

const sidebarItems = [
  { icon: HomeIcon, label: 'Dashboard', route: '/dashboard' },
  { icon: ChatBubbleBottomCenterTextIcon, label: 'Messages', route: '/chat' },
  { icon: UserGroupIcon, label: 'Contacts', route: '/contacts' },
  { icon: AdjustmentsHorizontalIcon, label: 'Queues', route: '/queues' },
  { icon: PhoneIcon, label: 'Sessions', route: '/sessions' },
  { icon: PuzzlePieceIcon, label: 'Integrations', route: '/integrations' },
  { icon: ClockIcon, label: 'Recent', route: '/recent' },
  { icon: StarIcon, label: 'Favorites', route: '/favorites' },
  { icon: ArchiveBoxIcon, label: 'Archived', route: '/archived' },
  { icon: TrashIcon, label: 'Trash', route: '/trash' },
  { icon: Cog6ToothIcon, label: 'Settings', route: '/settings' }
];

const getAvatarInitials = (name) => {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
};

export default function PageLayout({ children, title, subtitle }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActiveRoute = (route) => {
    return location.pathname === route || 
           (route === '/chat' && location.pathname.startsWith('/chat'));
  };

  const handleNavigation = (route) => {
    navigate(route);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-16 bg-slate-800 flex flex-col items-center py-4 border-r border-slate-700">
        {/* Logo */}
        <button 
          onClick={() => handleNavigation('/dashboard')}
          className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center mb-6 hover:bg-yellow-600 transition-colors"
        >
          <ChatBubbleBottomCenterTextIconSolid className="w-6 h-6 text-slate-900" />
        </button>

        {/* Navigation Items */}
        <nav className="flex flex-col space-y-3 flex-1">
          {sidebarItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.route);
            
            return (
              <div key={index} className="relative">
                <button
                  onClick={() => handleNavigation(item.route)}
                  className={`p-3 rounded-xl transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                  
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                </button>
              </div>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="mt-auto">
          <div className="relative group">
            <button 
              onClick={logout}
              className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center hover:bg-slate-500 transition-colors"
              title="Sair"
            >
              <span className="text-white text-xs font-medium">
                {user?.name ? getAvatarInitials(user.name) : 'U'}
              </span>
            </button>
            
            {/* Tooltip */}
            <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              {user?.name || 'Usuário'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        {(title || subtitle) && (
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
                {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
              </div>
              <div className="text-sm text-gray-500">
                {user?.name && (
                  <span>Olá, <strong>{user.name}</strong></span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
