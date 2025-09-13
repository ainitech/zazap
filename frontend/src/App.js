
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Lazy loading controlado (sem criar novos arquivos)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ContactsPage = lazy(() => import('./pages/ContactsPage')); 
const QueuesPage = lazy(() => import('./pages/QueuesPage'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const RecentPage = lazy(() => import('./pages/RecentPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const ArchivedPage = lazy(() => import('./pages/ArchivedPage'));
const TrashPage = lazy(() => import('./pages/TrashPage'));
const QuickRepliesPage = lazy(() => import('./pages/QuickRepliesPage'));
const SchedulesPage = lazy(() => import('./pages/SchedulesPage'));
const TagsPage = lazy(() => import('./pages/TagsPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const LibraryManagerPage = lazy(() => import('./pages/LibraryManagerPage'));
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

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Chat com UID específico */}
      <Route path="/tickets/:uid" element={
        <ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}>
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}>
            <ChatPage />
          </Suspense>
        </ProtectedRoute>
      } />
      
      {/* Chat com ID específico */}
      <Route path="/chat/:ticketId" element={
        <ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}>
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}>
            <ChatPage />
          </Suspense>
        </ProtectedRoute>
      } />
      
      {/* Chat geral */}
      <Route path="/chat" element={
        <ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}>
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}>
            <ChatPage />
          </Suspense>
        </ProtectedRoute>
      } />
      
      {/* Dashboard */}
      <Route path="/dashboard" element={
        <ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}>
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}>
            <DashboardPage />
          </Suspense>
        </ProtectedRoute>
      } />
      
      {/* Página inicial redireciona para dashboard */}
      <Route path="/" element={
        <ProtectedRoute requiredPermissions={['admin', 'supervisor', 'attendant']}>
          <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}>
            <DashboardPage />
          </Suspense>
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
