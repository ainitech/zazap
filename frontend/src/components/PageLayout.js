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
  TagIcon,
  Cog6ToothIcon,
  PhoneIcon,
  PuzzlePieceIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';
import { 
  ChatBubbleBottomCenterTextIcon as ChatBubbleBottomCenterTextIconSolid
} from '@heroicons/react/24/solid';
import { apiFetch, safeJson } from '../utils/apiClient';

const sidebarMenus = [
  { 
    type: 'single',
    icon: HomeIcon, 
    label: 'Dashboard', 
    route: '/dashboard' 
  },
  {
    type: 'group',
    icon: ChatBubbleBottomCenterTextIcon,
    label: 'Conversas',
    description: 'Gerencie suas mensagens',
    items: [
      { icon: ChatBubbleBottomCenterTextIcon, label: 'Mensagens', route: '/chat', description: 'Chat principal' },
      { icon: ClockIcon, label: 'Recentes', route: '/recent', description: 'Conversas recentes' },
      { icon: StarIcon, label: 'Favoritos', route: '/favorites', description: 'Conversas favoritas' },
      { icon: ArchiveBoxIcon, label: 'Arquivadas', route: '/archived', description: 'Conversas arquivadas' },
      { icon: TrashIcon, label: 'Lixeira', route: '/trash', description: 'Conversas excluídas' }
    ]
  },
  {
    type: 'group',
    icon: UserGroupIcon,
    label: 'Contatos',
    description: 'Gerencie contatos e filas',
    items: [
      { icon: UserGroupIcon, label: 'Contatos', route: '/contacts', description: 'Lista de contatos' },
      { icon: AdjustmentsHorizontalIcon, label: 'Filas', route: '/queues', description: 'Filas de atendimento' },
      { icon: TagIcon, label: 'Tags', route: '/tags', description: 'Organização de atendimentos' }
    ]
  },
  {
    type: 'group',
    icon: PhoneIcon,
    label: 'Conexões',
    description: 'Sessões e integrações',
    items: [
      { icon: PhoneIcon, label: 'Sessões', route: '/sessions', description: 'Sessões WhatsApp' },
      { icon: PuzzlePieceIcon, label: 'Integrações', route: '/integrations', description: 'Integrações externas' }
    ]
  },
  {
    type: 'group',
    icon: ClockIcon,
    label: 'Automação',
    description: 'Ferramentas de automação',
    items: [
      { icon: ChatBubbleBottomCenterTextIcon, label: 'Respostas Rápidas', route: '/quick-replies', description: 'Templates de mensagem' },
      { icon: ClockIcon, label: 'Agendamentos', route: '/schedules', description: 'Mensagens programadas', hasCounter: true },
      { icon: SpeakerWaveIcon, label: 'Campanhas', route: '/campaigns', description: 'Disparos em massa' }
    ]
  },
  { 
    type: 'single',
    icon: Cog6ToothIcon, 
    label: 'Configurações', 
    route: '/settings' 
  }
];

const getAvatarInitials = (name) => {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
};

export default function PageLayout({ children, title, subtitle }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scheduleCount, setScheduleCount] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    try {
      const v = localStorage.getItem('sidebarOpen');
      if (v !== null) setSidebarOpen(v === 'true');
    } catch (e) {
      // ignore
    }

    // Auto-expand groups based on current route
    const currentGroup = sidebarMenus.find(menu => {
      if (menu.type === 'group') {
        return menu.items.some(item => isActiveRoute(item.route));
      }
      return false;
    });
    
    if (currentGroup) {
      setExpandedGroups(prev => ({ ...prev, [currentGroup.label]: true }));
    }
  }, [location.pathname]);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const r = await apiFetch('/api/schedules/counts');
        const data = await safeJson(r);
        setScheduleCount(data?.total || 0);
      } catch (e) {
        console.error('Falha ao carregar contadores', e);
      }
    };
    loadCounts();
    const t = setInterval(loadCounts, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('sidebarOpen', sidebarOpen ? 'true' : 'false'); } catch (e) {}
  }, [sidebarOpen]);

  const isActiveRoute = (route) => {
    return location.pathname === route || 
           (route === '/chat' && location.pathname.startsWith('/chat'));
  };

  const isGroupActive = (group) => {
    if (group.type === 'single') {
      return isActiveRoute(group.route);
    }
    return group.items.some(item => isActiveRoute(item.route));
  };

  const toggleGroup = (groupLabel) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
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
          {sidebarMenus.map((menu, index) => {
            const needsSeparator = index > 0 && (
              (index === 1) || // After Dashboard
              (index === sidebarMenus.length - 1) // Before Settings
            );

            return (
              <React.Fragment key={index}>
                {needsSeparator && sidebarOpen && (
                  <div className="my-2">
                    <div className="h-px bg-slate-700"></div>
                  </div>
                )}
                
                {menu.type === 'single' ? (
                  <div className="relative w-full mb-1">
                    <button
                      onClick={() => handleNavigation(menu.route)}
                      className={`group relative flex items-center w-full gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                        isActiveRoute(menu.route) 
                          ? 'bg-yellow-500 text-slate-900' 
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-center w-5 h-5">
                        <menu.icon className="w-5 h-5" />
                      </div>

                      {sidebarOpen && (
                        <span className="text-sm font-medium">
                          {menu.label}
                        </span>
                      )}

                      {/* Tooltip when collapsed */}
                      {!sidebarOpen && (
                        <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          {menu.label}
                        </div>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="relative w-full mb-2">
                    {/* Group Header */}
                    <button
                      onClick={() => sidebarOpen ? toggleGroup(menu.label) : setSidebarOpen(true)}
                      className={`group relative flex items-center w-full gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                        isGroupActive(menu) 
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 shadow-sm' 
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-center w-5 h-5">
                        <menu.icon className="w-5 h-5" />
                      </div>

                      {sidebarOpen && (
                        <>
                          <span className="text-sm font-medium flex-1 text-left">
                            {menu.label}
                          </span>
                          <div className="flex items-center gap-2">
                            {!expandedGroups[menu.label] && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400 border border-slate-600">
                                {menu.items.length}
                              </span>
                            )}
                            <div className="flex items-center justify-center w-4 h-4">
                              {expandedGroups[menu.label] ? (
                                <ChevronDownIcon className="w-4 h-4" />
                              ) : (
                                <ChevronRightIcon className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Tooltip when collapsed */}
                      {!sidebarOpen && (
                        <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          {menu.label}
                          {menu.description && (
                            <div className="text-gray-400 text-[10px] mt-0.5">{menu.description}</div>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Submenu Items */}
                    {sidebarOpen && (
                      <div className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedGroups[menu.label] 
                          ? 'max-h-96 opacity-100' 
                          : 'max-h-0 opacity-0'
                      }`}>
                        {menu.items.map((item, itemIndex) => {
                          const ItemIcon = item.icon;
                          const isActive = isActiveRoute(item.route);

                          return (
                            <button
                              key={itemIndex}
                              onClick={() => handleNavigation(item.route)}
                              className={`group relative flex items-center w-full gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                                isActive 
                                  ? 'bg-yellow-500 text-slate-900 shadow-sm' 
                                  : 'text-slate-400 hover:text-white hover:bg-slate-700 hover:translate-x-1'
                              }`}
                            >
                              <div className="flex items-center justify-center w-4 h-4">
                                <ItemIcon className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-medium flex items-center gap-2">
                                {item.label}
                                {item.hasCounter && (
                                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/40">{scheduleCount}</span>
                                )}
                              </span>
                              
                              {/* Active indicator */}
                              {isActive && (
                                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-yellow-600 rounded-r-full"></div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
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
