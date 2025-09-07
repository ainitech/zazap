import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  XMarkIcon,
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import AuthService from '../../services/authService.js';

const QueuePerformanceModal = ({ isOpen, onClose, queueId, queueName }) => {
  const [performanceData, setPerformanceData] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && queueId) {
      fetchPerformanceData();
    }
  }, [isOpen, queueId, period]);

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    try {
      const response = await AuthService.get(`/api/queues/${queueId}/performance?period=${period}`);

      if (response.ok) {
        const data = await response.json();
        setPerformanceData(data);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de performance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#3B82F6',
      pending: '#F59E0B',
      resolved: '#10B981',
      closed: '#6B7280'
    };
    return colors[status] || '#6B7280';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="modal-header">
          <h3 className="modal-title">
            <ChartBarIcon className="h-5 w-5" />
            Performance - {queueName}
          </h3>
          <button onClick={onClose} className="modal-close-btn">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="modal-body space-y-6">
          {/* Filtro de Período */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Período:</span>
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1d">Último dia</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-gray-600">Carregando dados...</span>
              </div>
            </div>
          ) : performanceData ? (
            <>
              {/* Métricas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <UserGroupIcon className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Total de Tickets</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{performanceData.metrics.totalTickets}</p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Taxa de Resolução</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{performanceData.metrics.resolutionRate}%</p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ClockIcon className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Tempo Médio de Resolução</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatDuration(performanceData.metrics.averageResolutionTime)}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ClockIcon className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Primeira Resposta</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatDuration(performanceData.metrics.averageFirstResponseTime)}
                  </p>
                </div>
              </div>

              {/* Gráfico de Tendência */}
              {performanceData.distribution && performanceData.distribution.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Distribuição de Tickets por Dia</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData.distribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Status dos Tickets */}
              {performanceData.metrics.byStatus && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Tickets por Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(performanceData.metrics.byStatus).map(([status, data]) => (
                      <div key={status} className="text-center">
                        <div 
                          className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white font-bold text-lg mb-2"
                          style={{ backgroundColor: getStatusColor(status) }}
                        >
                          {data.count}
                        </div>
                        <p className="text-sm font-medium capitalize text-gray-700">{status}</p>
                        {data.avgResolutionTime && (
                          <p className="text-xs text-gray-500">
                            Avg: {formatDuration(data.avgResolutionTime)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance dos Agentes */}
              {performanceData.agents && performanceData.agents.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Performance dos Agentes</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Agente</th>
                          <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Total</th>
                          <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Resolvidos</th>
                          <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Taxa</th>
                          <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Tempo Médio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceData.agents.map(agent => (
                          <tr key={agent.userId} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3 text-sm text-gray-900">{agent.name}</td>
                            <td className="py-2 px-3 text-sm text-center text-gray-700">{agent.totalTickets}</td>
                            <td className="py-2 px-3 text-sm text-center text-gray-700">{agent.resolvedTickets}</td>
                            <td className="py-2 px-3 text-sm text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                agent.resolutionRate >= 80 ? 'bg-green-100 text-green-800' :
                                agent.resolutionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {agent.resolutionRate}%
                              </span>
                            </td>
                            <td className="py-2 px-3 text-sm text-center text-gray-700">
                              {formatDuration(agent.avgResolutionTime)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum dado disponível para o período selecionado</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueuePerformanceModal;
