
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import ContactsPage from './pages/ContactsPage';
import QueuesPage from './pages/QueuesPage';
import SessionsPage from './pages/SessionsPage';
import IntegrationsPage from './pages/IntegrationsPage';
import SettingsPage from './pages/SettingsPage';
import RecentPage from './pages/RecentPage';
import FavoritesPage from './pages/FavoritesPage';
import ArchivedPage from './pages/ArchivedPage';
import TrashPage from './pages/TrashPage';
import QuickRepliesPage from './pages/QuickRepliesPage';
import SchedulesPage from './pages/SchedulesPage';
import TagsPage from './pages/TagsPage';
import AgentsPage from './pages/AgentsPage';
import LibraryManagerPage from './pages/LibraryManagerPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { SettingsProvider } from './context/SettingsContext';
import { ProtectedRoute } from './components/PageLayout';
import DynamicManifest from './components/DynamicManifest';
import DynamicColors from './components/DynamicColors';
import useDynamicColors from './hooks/useDynamicColors';

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  // Evitar redirecionamentos prematuros enquanto autenticação carrega
  if (loading) {
    return (
      <Routes>
        <Route path="*" element={<div className="flex items-center justify-center h-screen bg-slate-900 text-slate-300">Carregando...</div>} />
      </Routes>
    );
  }

  console.log('🚦 AppRoutes: Renderizando, isAuthenticated:', isAuthenticated);

  if (!isAuthenticated) {
    console.log('🚦 AppRoutes: Usuário não autenticado, mostrando login');
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  console.log('🚦 AppRoutes: Usuário autenticado, mostrando aplicação principal');
  return (
    <Routes>
      {/* Debug: Log da rota atual */}
      {console.log('🔍 AppRoutes: Rota atual:', window.location.pathname)}
      
      {/* ROTAS MAIS ESPECÍFICAS PRIMEIRO - ORDEM CRÍTICA */}
      
      {/* Chat com UID específico - MAIS ESPECÍFICA */}
      <Route path="/tickets/:uid" element={
        <ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}>
          <ChatPage />
        </ProtectedRoute>
      } />
      
      {/* Chat com ID específico */}
      <Route path="/chat/:ticketId" element={
        <ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}>
          <ChatPage />
        </ProtectedRoute>
      } />
      
      {/* Chat geral */}
      <Route path="/chat" element={
        <ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}>
          <ChatPage />
        </ProtectedRoute>
      } />
      
      {/* Dashboard */}
      <Route path="/dashboard" element={
        <ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}>
          <DashboardPage />
        </ProtectedRoute>
      } />
      
      {/* Página inicial redireciona para dashboard */}
      <Route path="/" element={
        <ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}>
          <DashboardPage />
        </ProtectedRoute>
      } />
      
      {/* Outras páginas */}
      <Route path="/contacts" element={<ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}><ContactsPage /></ProtectedRoute>} />
      <Route path="/recent" element={<ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}><RecentPage /></ProtectedRoute>} />
      <Route path="/favorites" element={<ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}><FavoritesPage /></ProtectedRoute>} />
      <Route path="/archived" element={<ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}><ArchivedPage /></ProtectedRoute>} />
      <Route path="/trash" element={<ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}><TrashPage /></ProtectedRoute>} />
      <Route path="/quick-replies" element={<ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}><QuickRepliesPage /></ProtectedRoute>} />
      <Route path="/schedules" element={<ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}><SchedulesPage /></ProtectedRoute>} />
      <Route path="/tags" element={<ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}><TagsPage /></ProtectedRoute>} />
      
      {/* Páginas de administração - Admin e Supervisor */}
      <Route path="/queues" element={<ProtectedRoute requiredPermissions={['admin', 'supervisor']}><QueuesPage /></ProtectedRoute>} />
      <Route path="/sessions" element={<ProtectedRoute requiredPermissions={['admin', 'supervisor']}><SessionsPage /></ProtectedRoute>} />
      
      {/* Páginas de administração - Apenas Admin */}
      <Route path="/agents" element={<ProtectedRoute requiredPermissions={['admin']}><AgentsPage /></ProtectedRoute>} />
      <Route path="/library-manager" element={<ProtectedRoute requiredPermissions={['admin']}><LibraryManagerPage /></ProtectedRoute>} />
      <Route path="/integrations" element={<ProtectedRoute requiredPermissions={['admin']}><IntegrationsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute requiredPermissions={['admin']}><SettingsPage /></ProtectedRoute>} />
      
      {/* Rota de login */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* ROTA CATCH-ALL - DEVE SER A ÚLTIMA */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function MainApp() {
  return (
    <BrowserRouter>
      <DynamicManifest />
      <DynamicColors />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <SocketProvider>
          <MainApp />
        </SocketProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
