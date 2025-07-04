import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  HomeIcon,
  ChatBubbleBottomCenterTextIcon,
  UserGroupIcon,
  ClockIcon,
  StarIcon,
  ArchiveBoxIcon,
  TrashIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { 
  ChatBubbleBottomCenterTextIcon as ChatBubbleBottomCenterTextIconSolid
} from '@heroicons/react/24/solid';

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

const getAvatarInitials = (name) => {
  if (!name) return '?';
  const names = name.split(' ');
  if (names.length >= 2) {
    return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

export default function ChatSidebar() {
  const { user } = useAuth();
  const location = useLocation();

  return (
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
  );
}
