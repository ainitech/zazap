import React, { useState, useEffect } from 'react';
import {
  BellIcon,
  ClockIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowRightIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { apiUrl } from '../../utils/apiClient';
import AuthService from '../../services/authService.js';

const QueueActivityPanel = ({ isOpen, onClose }) => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRecentActivities();
  // Configurar WebSocket para atividades em tempo real
  const httpBase = apiUrl('/').replace(/\/$/, '');
  const wsUrl = httpBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'queue-activity') {
          addActivity(data.activity);
        }
      };

      return () => {
        ws.close();
      };
    }
  }, [isOpen]);

  const fetchRecentActivities = async () => {
    setIsLoading(true);
    try {
      const response = await AuthService.get(apiUrl('/api/queues/activities'));

      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addActivity = (activity) => {
    setActivities(prev => [activity, ...prev.slice(0, 49)]); // Manter apenas 50 atividades
  };

  const getActivityIcon = (type) => {
    const icons = {
      'queue-created': <UserGroupIcon className="h-4 w-4 text-green-500" />,
      'queue-updated': <ChatBubbleLeftRightIcon className="h-4 w-4 text-blue-500" />,
      'queue-deleted': <XMarkIcon className="h-4 w-4 text-red-500" />,
      'queue-duplicated': <DocumentDuplicateIcon className="h-4 w-4 text-purple-500" />,
      'queue-archived': <ArchiveBoxIcon className="h-4 w-4 text-orange-500" />,
      'ticket-transferred': <ArrowRightIcon className="h-4 w-4 text-indigo-500" />,
      'agent-assigned': <UserGroupIcon className="h-4 w-4 text-green-500" />,
      'agent-removed': <XMarkIcon className="h-4 w-4 text-red-500" />,
      'settings-updated': <CheckCircleIcon className="h-4 w-4 text-blue-500" />,
      'bulk-action': <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
    };
    return icons[type] || <BellIcon className="h-4 w-4 text-gray-500" />;
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <BellIcon className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Atividades Recentes</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <XMarkIcon className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : activities.length > 0 ? (
          <div className="p-4 space-y-3">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium">
                    {activity.title}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {activity.description}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {activity.user}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      {formatTime(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <BellIcon className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm">Nenhuma atividade recente</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={fetchRecentActivities}
          className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Atualizar
        </button>
      </div>
    </div>
  );
};

export default QueueActivityPanel;
