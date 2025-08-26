import React, { useState, useEffect } from 'react';
import {
  QueueListIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

const QueueMetricsBar = ({ queues }) => {
  const [metrics, setMetrics] = useState({
    totalQueues: 0,
    activeQueues: 0,
    totalAgents: 0,
    pendingTickets: 0,
    resolvedToday: 0,
    averageResponseTime: 0
  });

  useEffect(() => {
    calculateMetrics();
  }, [queues]);

  const calculateMetrics = () => {
    if (!queues || queues.length === 0) return;

    const totalQueues = queues.length;
    const activeQueues = queues.filter(q => q.isActive).length;
    const totalAgents = queues.reduce((sum, queue) => sum + (queue.Users?.length || 0), 0);

    // Simular dados de tickets (em ambiente real, viria da API)
    const pendingTickets = Math.floor(Math.random() * 50) + 10;
    const resolvedToday = Math.floor(Math.random() * 100) + 20;
    const averageResponseTime = Math.floor(Math.random() * 30) + 5; // em minutos

    setMetrics({
      totalQueues,
      activeQueues,
      totalAgents,
      pendingTickets,
      resolvedToday,
      averageResponseTime
    });
  };

  const MetricCard = ({ icon: Icon, label, value, trend, trendValue, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      red: 'bg-red-50 border-red-200 text-red-800',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800'
    };

    return (
      <div className={`p-4 rounded-lg border ${colorClasses[color]} relative overflow-hidden`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${color}-100`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-75">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              {trend === 'up' ? (
                <ArrowTrendingUpIcon className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="h-3 w-3 text-red-600" />
              )}
              <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                {trendValue}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <MetricCard
        icon={QueueListIcon}
        label="Total de Filas"
        value={metrics.totalQueues}
        color="blue"
      />
      
      <MetricCard
        icon={CheckCircleIcon}
        label="Filas Ativas"
        value={metrics.activeQueues}
        trend="up"
        trendValue="12"
        color="green"
      />
      
      <MetricCard
        icon={UserGroupIcon}
        label="Agentes Online"
        value={metrics.totalAgents}
        trend="down"
        trendValue="3"
        color="purple"
      />
      
      <MetricCard
        icon={ExclamationTriangleIcon}
        label="Tickets Pendentes"
        value={metrics.pendingTickets}
        trend="up"
        trendValue="8"
        color="orange"
      />
      
      <MetricCard
        icon={CheckCircleIcon}
        label="Resolvidos Hoje"
        value={metrics.resolvedToday}
        trend="up"
        trendValue="15"
        color="green"
      />
      
      <MetricCard
        icon={ClockIcon}
        label="Tempo Médio (min)"
        value={metrics.averageResponseTime}
        trend="down"
        trendValue="5"
        color="indigo"
      />
    </div>
  );
};

export default QueueMetricsBar;
