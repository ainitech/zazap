import React, { useState, useEffect } from 'react';
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
  { icon: ChatBubbleBottomCenterTextIcon, label: 'Quick Replies', route: '/quick-replies' },
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

  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem('sidebarOpen');
      if (v !== null) setSidebarOpen(v === 'true');
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('sidebarOpen', sidebarOpen ? 'true' : 'false'); } catch (e) {}
  }, [sidebarOpen]);

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
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} ${sidebarOpen ? 'bg-slate-800' : 'bg-slate-800'} flex flex-col py-6 border-r border-slate-700 transition-all duration-300 shadow-sm`}>
        {/* Logo */}
        <div className={`flex items-center ${sidebarOpen ? 'justify-between px-6' : 'justify-center'} w-full mb-8`}> 
          <div className="flex items-center">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <ChatBubbleBottomCenterTextIconSolid className="w-5 h-5 text-slate-900" />
            </div>
            {sidebarOpen && <span className="ml-3 text-white font-bold text-lg">Zazap</span>}
          </div>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white"
              title="Fechar menu"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col flex-1 w-full px-3">
          {sidebarItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.route);

            return (
              <div key={index} className="relative w-full mb-1">
                <button
                  onClick={() => handleNavigation(item.route)}
                  className={`group relative flex items-center w-full gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-yellow-500 text-slate-900' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-center w-5 h-5">
                    <Icon className="w-5 h-5" />
                  </div>

                  {sidebarOpen && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}

                  {/* Tooltip when collapsed */}
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="w-full px-3">
          {sidebarOpen ? (
            <div className="bg-slate-700 rounded-lg p-4 flex items-center gap-3 border border-slate-600">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-slate-900 font-medium text-sm">
                {user?.name ? getAvatarInitials(user.name) : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{user?.name || 'Usuario'}</div>
                <div className="text-xs text-slate-400 truncate">{user?.email || 'usuario@exemplo.com'}</div>
              </div>
              <button 
                onClick={logout} 
                className="p-1 rounded-md hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
                title="Sair"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-slate-900 font-medium text-sm hover:shadow-md transition-shadow"
                title={user?.name || 'Abrir menu'}
              >
                {user?.name ? getAvatarInitials(user.name) : 'U'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating toggle button when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 w-10 h-10 bg-slate-800 rounded-lg shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow border border-slate-600"
          title="Abrir menu"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

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
