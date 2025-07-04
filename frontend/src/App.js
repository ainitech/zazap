
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
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  
  if (!token) {
    return <LoginPage />;
  }

  return children;
}

function MainApp() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Páginas principais */}
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/chat/:ticketId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
        <Route path="/queues" element={<ProtectedRoute><QueuesPage /></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute><SessionsPage /></ProtectedRoute>} />
        <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/recent" element={<ProtectedRoute><RecentPage /></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
        <Route path="/archived" element={<ProtectedRoute><ArchivedPage /></ProtectedRoute>} />
        <Route path="/trash" element={<ProtectedRoute><TrashPage /></ProtectedRoute>} />
        
        {/* Rota de login */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Redirect para dashboard por padrão */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
