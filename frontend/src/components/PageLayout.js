import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import SocketAuthStatus from './common/SocketAuthStatus';
import {
  HomeIcon,
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  StarIcon,
  ArchiveBoxIcon,
  TrashIcon,
  UserGroupIcon,
  AdjustmentsHorizontalIcon,
  TagIcon,
  PhoneIcon,
  PuzzlePieceIcon,
  SpeakerWaveIcon,
  Cog6ToothIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { 
  ChatBubbleBottomCenterTextIcon as ChatBubbleBottomCenterTextIconSolid
} from '@heroicons/react/24/solid';
import { apiFetch, safeJson } from '../utils/apiClient';

// Função utilitária para obter iniciais do nome
const getAvatarInitials = (name) => {
  if (!name) return 'U';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  
  return firstInitial + lastInitial;
};

const sidebarMenus = [
  { 
    type: 'single',
    icon: HomeIcon, 
    label: 'Dashboard', 
    route: '/dashboard',
    permissions: ['attendant', 'supervisor', 'admin']
  },
  {
    type: 'group',
    icon: ChatBubbleBottomCenterTextIcon,
    label: 'Conversas',
    description: 'Gerencie suas mensagens',
    permissions: ['attendant', 'supervisor', 'admin'],
    items: [
      { icon: ChatBubbleBottomCenterTextIcon, label: 'Mensagens', route: '/chat', description: 'Chat principal', permissions: ['attendant', 'supervisor', 'admin'] },
      { icon: ClockIcon, label: 'Recentes', route: '/recent', description: 'Conversas recentes', permissions: ['attendant', 'supervisor', 'admin'] },
      { icon: StarIcon, label: 'Favoritos', route: '/favorites', description: 'Conversas favoritas', permissions: ['attendant', 'supervisor', 'admin'] },
      { icon: ArchiveBoxIcon, label: 'Arquivadas', route: '/archived', description: 'Conversas arquivadas', permissions: ['attendant', 'supervisor', 'admin'] },
      { icon: TrashIcon, label: 'Lixeira', route: '/trash', description: 'Conversas excluídas', permissions: ['attendant', 'supervisor', 'admin'] }
    ]
  },
  {
    type: 'group',
    icon: UserGroupIcon,
    label: 'Contatos',
    description: 'Gerencie contatos e filas',
    permissions: ['attendant', 'supervisor', 'admin'],
    items: [
      { icon: UserGroupIcon, label: 'Contatos', route: '/contacts', description: 'Lista de contatos', permissions: ['attendant', 'supervisor', 'admin'] },
      { icon: AdjustmentsHorizontalIcon, label: 'Filas', route: '/queues', description: 'Filas de atendimento', permissions: ['supervisor', 'admin'] },
      { icon: TagIcon, label: 'Tags', route: '/tags', description: 'Organização de atendimentos', permissions: ['attendant', 'supervisor', 'admin'] }
    ]
  },
  {
    type: 'group',
    icon: PhoneIcon,
    label: 'Conexões',
    description: 'Sessões e integrações',
    permissions: ['supervisor', 'admin'],
    items: [
      { icon: PhoneIcon, label: 'Sessões', route: '/sessions', description: 'Sessões WhatsApp', permissions: ['supervisor', 'admin'] },
      { icon: PuzzlePieceIcon, label: 'Integrações', route: '/integrations', description: 'Integrações externas', permissions: ['admin'] }
    ]
  },
  {
    type: 'group',
    icon: ClockIcon,
    label: 'Automação',
    description: 'Ferramentas de automação',
    permissions: ['attendant', 'supervisor', 'admin'],
    items: [
      { icon: ChatBubbleBottomCenterTextIcon, label: 'Respostas Rápidas', route: '/quick-replies', description: 'Templates de mensagem', permissions: ['attendant', 'supervisor', 'admin'] },
      { icon: ClockIcon, label: 'Agendamentos', route: '/schedules', description: 'Mensagens programadas', permissions: ['attendant', 'supervisor', 'admin'], hasCounter: true },
      { icon: SpeakerWaveIcon, label: 'Campanhas', route: '/campaigns', description: 'Disparos em massa', permissions: ['supervisor', 'admin'] }
    ]
  },
  {
    type: 'group',
    icon: Cog6ToothIcon,
    label: 'Administração',
    description: 'Configurações avançadas',
    permissions: ['admin'],
    items: [
      { icon: UsersIcon, label: 'Agentes', route: '/agents', description: 'Gerenciar usuários', permissions: ['admin'] },
      { icon: CpuChipIcon, label: 'Gerenciador de Bibliotecas', route: '/library-manager', description: 'Sistema inteligente de bibliotecas', permissions: ['admin'] },
      { icon: Cog6ToothIcon, label: 'Configurações', route: '/settings', description: 'Configurações do sistema', permissions: ['admin'] }
    ]
  }
];

// Componente para proteger rotas baseado em permissões
export const ProtectedRoute = ({ children, requiredPermissions, fallback = null }) => {
  const { user } = useAuth();
  
  console.log('🔒 ProtectedRoute: Verificando acesso - user:', user, 'requiredPermissions:', requiredPermissions);
  
  if (!user) {
    console.log('🔒 ProtectedRoute: Usuário não encontrado, redirecionando para login');
    return <Navigate to="/login" replace />;
  }
  
  if (requiredPermissions && !hasPermission(user.role, requiredPermissions)) {
    console.log('🔒 ProtectedRoute: Permissão negada - userRole:', user.role, 'required:', requiredPermissions);
    return fallback || (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Negado</h1>
          <p className="text-gray-400">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }
  
  console.log('🔒 ProtectedRoute: Acesso permitido');
  return children;
};

// Hook personalizado para verificar permissões
export const usePermissions = () => {
  const { user } = useAuth();
  
  const checkPermission = (requiredPermissions) => {
    if (!user) return false;
    return hasPermission(user.role, requiredPermissions);
  };
  
  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };
  
  return {
    checkPermission,
    hasRole,
    userRole: user?.role,
    isAdmin: user?.role === 'admin',
    isSupervisor: user?.role === 'supervisor',
    isAttendant: user?.role === 'attendant'
  };
};

// Função para verificar se o usuário tem permissão
const hasPermission = (userRole, requiredPermissions) => {
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  return requiredPermissions.includes(userRole);
};

// Função para filtrar menus baseado nas permissões do usuário
const filterMenusByPermissions = (menus, userRole) => {
  return menus
    .filter(menu => {
      // Se é um menu single, verifica suas próprias permissões
      if (menu.type === 'single') {
        return hasPermission(userRole, menu.permissions);
      }
      // Se é um grupo, verifica se o grupo tem permissão
      return hasPermission(userRole, menu.permissions);
    })
    .map(menu => {
      // Se é um grupo, filtra também os itens internos
      if (menu.type === 'group' && menu.items) {
        return {
          ...menu,
          items: menu.items.filter(item => hasPermission(userRole, item.permissions))
        };
      }
      return menu;
    })
    .filter(menu => {
      // Remove grupos que não têm itens após o filtro
      if (menu.type === 'group') {
        return menu.items && menu.items.length > 0;
      }
      return true;
    });
};

export default function PageLayout({ children, title, subtitle }) {
  const { user, logout } = useAuth();
  const { getSetting, getLogoUrl } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false); // Fechado por padrão no mobile
  const [scheduleCount, setScheduleCount] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Inicialização única para detectar se é mobile
  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
  }, []);

  useEffect(() => {
    // Detectar mudanças de tamanho de tela
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && sidebarOpen) {
        setSidebarOpen(false); // Fechar sidebar automaticamente no mobile
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  useEffect(() => {
    // Usar sessionStorage ao invés de localStorage para estado do sidebar
    try {
      const v = sessionStorage.getItem('sidebarOpen');
      if (v !== null && !isMobile) { // Só aplicar estado salvo se não for mobile
        setSidebarOpen(v === 'true');
      }
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
      // Só carregar contadores se o usuário estiver autenticado
      if (!user) return;
      
      try {
        // Importar API_BASE_URL e usar authService para fazer requisição autenticada
        const { API_BASE_URL } = await import('../utils/apiClient');
        const { default: authService } = await import('../services/authService');
        const response = await authService.request(`${API_BASE_URL}/api/schedules/counts`);
        const ct = response.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          const text = await response.text();
          console.warn('⚠️ /api/schedules/counts retornou non-JSON. Status:', response.status, 'Body snippet:', text.slice(0,120));
          return; // não tentar parsear
        }
        const data = await response.json().catch(err => {
          console.error('Erro parse JSON counts:', err);
          return null;
        });
        if (data) setScheduleCount(data?.total || 0);
      } catch (e) {
        console.error('Falha ao carregar contadores', e);
      }
    };
    loadCounts();
    const t = setInterval(loadCounts, 15000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    // Usar sessionStorage ao invés de localStorage
    try { sessionStorage.setItem('sidebarOpen', sidebarOpen ? 'true' : 'false'); } catch (e) {}
  }, [sidebarOpen]);

  const isActiveRoute = (route) => {
    return location.pathname === route || 
           (route === '/chat' && (location.pathname.startsWith('/chat') || location.pathname.startsWith('/tickets/')));
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
    // Fechar sidebar automaticamente no mobile após navegação
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Filtrar menus baseado nas permissões do usuário
  const filteredMenus = filterMenusByPermissions(sidebarMenus, user?.role || 'attendant');

  return (
    <div className="flex h-screen bg-gray-50 page-layout-fix relative">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300 ease-in-out"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`${
          isMobile 
            ? sidebarOpen 
              ? 'fixed inset-y-0 left-0 z-50 w-64 transform translate-x-0 transition-transform duration-300 ease-in-out' 
              : 'fixed inset-y-0 left-0 z-50 w-64 transform -translate-x-full transition-transform duration-300 ease-in-out'
            : sidebarOpen 
              ? 'w-64 transition-all duration-300 ease-in-out' 
              : 'w-16 transition-all duration-300 ease-in-out'
        } bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col py-4 md:py-6 border-r border-slate-700 shadow-xl flex-shrink-0`}
        onClick={(e) => isMobile && e.stopPropagation()}
      >
        {/* Logo */}
        <div className={`flex items-center ${(sidebarOpen && !isMobile) ? 'justify-between px-6' : 'justify-center px-4'} w-full mb-6 md:mb-8`}> 
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
              {getLogoUrl() ? (
                <img 
                  src={getLogoUrl()} 
                  alt={getSetting('company_name', 'Zazap')} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <ChatBubbleBottomCenterTextIconSolid className="w-5 h-5 text-slate-900" />
              )}
            </div>
            {(sidebarOpen || isMobile) && (
              <span className="ml-3 text-white font-bold text-lg">
                {getSetting('company_name', 'Zazap')}
              </span>
            )}
          </div>
          {(sidebarOpen || isMobile) && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white lg:block"
              title="Fechar menu"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col flex-1 w-full px-3 overflow-y-auto">
          {filteredMenus.map((menu, index) => {
            const needsSeparator = index > 0 && (
              (index === 1) || // After Dashboard
              (index === filteredMenus.length - 1) // Before Settings
            );

            return (
              <React.Fragment key={index}>
                {needsSeparator && (sidebarOpen || isMobile) && (
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
                          ? 'bg-primary text-slate-900' 
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-center w-5 h-5">
                        <menu.icon className="w-5 h-5" />
                      </div>

                      {(sidebarOpen || isMobile) && (
                        <span className="text-sm font-medium">
                          {menu.label}
                        </span>
                      )}

                      {/* Tooltip when collapsed - only on desktop */}
                      {!sidebarOpen && !isMobile && (
                        <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                          {menu.label}
                        </div>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="relative w-full mb-2">
                    {/* Group Header */}
                    <button
                      onClick={() => (sidebarOpen || isMobile) ? toggleGroup(menu.label) : setSidebarOpen(true)}
                      className={`group relative flex items-center w-full gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                        isGroupActive(menu) 
                          ? 'bg-primary/10 text-primary-light border border-primary/20 shadow-sm' 
                          : 'text-slate-300 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-center w-5 h-5">
                        <menu.icon className="w-5 h-5" />
                      </div>

                      {(sidebarOpen || isMobile) && (
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

                      {/* Tooltip when collapsed - only on desktop */}
                      {!sidebarOpen && !isMobile && (
                        <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                          {menu.label}
                          {menu.description && (
                            <div className="text-gray-400 text-[10px] mt-0.5">{menu.description}</div>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Submenu Items */}
                    {(sidebarOpen || isMobile) && (
                      <div className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedGroups[menu.label] 
                          ? 'max-h-[500px] opacity-100' 
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
                                  ? 'bg-primary text-slate-900 shadow-sm' 
                                  : 'text-slate-400 hover:text-white hover:bg-slate-700 hover:translate-x-1'
                              }`}
                            >
                              <div className="flex items-center justify-center w-4 h-4">
                                <ItemIcon className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-medium flex items-center gap-2">
                                {item.label}
                                {item.hasCounter && (
                                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary-light border border-primary/40">{scheduleCount}</span>
                                )}
                              </span>
                              
                              {/* Active indicator */}
                              {isActive && (
                                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-primary-dark rounded-r-full"></div>
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
          {(sidebarOpen || isMobile) ? (
            <div className="bg-slate-700 rounded-lg p-4 flex items-center gap-3 border border-slate-600">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-slate-900 font-medium text-sm">
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
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-slate-900 font-medium text-sm hover:shadow-md transition-shadow"
                title={user?.name || 'Abrir menu'}
              >
                {user?.name ? getAvatarInitials(user.name) : 'U'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating toggle button when sidebar is closed - only on desktop */}
      {!sidebarOpen && !isMobile && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-[9999] w-10 h-10 bg-slate-800 rounded-lg shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow border border-slate-600"
          title="Abrir menu"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Mobile toggle button - only visible when sidebar is closed */}
      {isMobile && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-[9999] w-12 h-12 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300 border border-slate-600 lg:hidden group"
          title="Abrir menu"
        >
          <div className="relative">
            <svg className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse"></div>
          </div>
        </button>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden min-h-0 main-content-fix ${isMobile ? 'w-full' : ''}`}>
        {/* Header */}
        {(title || subtitle) && (
          <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className={`${isMobile ? 'ml-14' : ''}`}>
                {title && <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>}
                {subtitle && <p className="text-gray-600 mt-1 text-sm md:text-base">{subtitle}</p>}
              </div>
              <div className="text-xs md:text-sm text-gray-500">
                {user?.name && (
                  <span className="hidden sm:inline">Olá, <strong>{user.name}</strong></span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 overflow-auto min-h-0 bg-gray-50 content-area-fix">
          <div className="p-4 md:p-6 min-h-full">
            <SocketAuthStatus />
            <div className="-m-4 md:-m-6 min-h-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
