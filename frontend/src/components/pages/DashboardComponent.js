import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../utils/apiClient';
import AuthService from '../../services/authService.js';
import {
  ChartBarIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  QueueListIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  SparklesIcon,
  FireIcon,
  TicketIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Cores elegantes para gráficos
const COLORS = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  gradient1: '#6366F1',
  gradient2: '#8B5CF6'
};

const PIE_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

export default function DashboardComponent() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await AuthService.get(apiUrl('/api/dashboard/stats'));

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401) {
        setError('Sessão expirada');
      } else {
        setError('Erro ao carregar estatísticas');
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas do dashboard:', error);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  // Componente de cartão com gradiente
  const StatCard = ({ title, value, icon: Icon, color, change, subtitle }) => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-700 hover:border-slate-600 transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/20 hover:scale-105 cursor-pointer group touch-manipulation">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-xs sm:text-sm font-medium truncate group-hover:text-slate-300 transition-colors duration-300">{title}</p>
          <p className="text-lg sm:text-3xl font-bold text-white mt-1 sm:mt-2 group-hover:scale-105 transition-transform duration-300">{value}</p>
          {subtitle && (
            <p className="text-slate-500 text-xs mt-1 truncate group-hover:text-slate-400 transition-colors duration-300">{subtitle}</p>
          )}
          {change && (
            <div className={`flex items-center mt-1 sm:mt-2 text-xs transition-all duration-300 ${change > 0 ? 'text-green-400 group-hover:text-green-300' : 'text-red-400 group-hover:text-red-300'}`}>
              <ArrowTrendingUpIcon className={`w-3 h-3 mr-1 transition-transform duration-300 ${change > 0 ? 'group-hover:translate-y-[-1px]' : 'rotate-180 group-hover:translate-y-[1px]'}`} />
              {Math.abs(change)}% vs ontem
            </div>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br ${color} flex-shrink-0 ml-2 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
          <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
        </div>
      </div>
      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] duration-700"></div>
    </div>
  );

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-slate-300 text-sm">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="font-medium">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen">
        <div className="flex items-center justify-center h-64 sm:h-96">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium text-sm sm:text-base">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen">
        <div className="flex items-center justify-center h-64 sm:h-96">
          <div className="text-center px-4">
            <div className="text-red-400 text-4xl sm:text-6xl mb-4">⚠️</div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Erro ao carregar dashboard</h2>
            <p className="text-slate-400 mb-4 text-sm sm:text-base">{error}</p>
            <button
              onClick={fetchDashboardStats}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
          <SparklesIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
        </div>
        <p className="text-slate-400 text-sm sm:text-base">
          Bem-vindo de volta, <span className="text-white font-medium">{user?.name}</span>! 
          Aqui está um resumo das suas atividades.
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <StatCard
          title="Total de Tickets"
          value={stats?.totalTickets || 0}
          icon={ChatBubbleLeftRightIcon}
          color="from-blue-500 to-blue-600"
          subtitle="Todos os atendimentos"
        />
        <StatCard
          title="Tickets Abertos"
          value={stats?.openTickets || 0}
          icon={ClockIcon}
          color="from-yellow-500 to-orange-500"
          subtitle="Aguardando atendimento"
        />
        <StatCard
          title="Tickets Fechados"
          value={stats?.closedTickets || 0}
          icon={CheckCircleIcon}
          color="from-green-500 to-emerald-500"
          subtitle="Atendimentos finalizados"
        />
        <StatCard
          title="Mensagens Hoje"
          value={stats?.todayMessages || 0}
          icon={ChartBarIcon}
          color="from-purple-500 to-pink-500"
          subtitle="Trocadas hoje"
        />
      </div>

      {/* Seção de Conexões */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Sessões Ativas"
          value={stats?.activeSessions || 0}
          icon={PhoneIcon}
          color="from-emerald-500 to-teal-500"
          subtitle={`de ${stats?.totalSessions || 0} total`}
        />
        <StatCard
          title="Filas Ativas"
          value={stats?.totalQueues || 0}
          icon={QueueListIcon}
          color="from-indigo-500 to-purple-500"
          subtitle="Configuradas"
        />
        <StatCard
          title="Usuários"
          value={stats?.totalUsers || 0}
          icon={UserGroupIcon}
          color="from-pink-500 to-rose-500"
          subtitle="No sistema"
        />
      </div>

      {/* Gráficos */}
      {stats?.charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
          {/* Linha temporal de tickets */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-700">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center">
              <ArrowTrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-400" />
              Tickets - Últimos 7 dias
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats.charts.ticketsTimeline.labels.map((label, index) => ({
                day: label,
                tickets: stats.charts.ticketsTimeline.data[index]
              }))}>
                <defs>
                  <linearGradient id="ticketsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="tickets"
                  stroke={COLORS.primary}
                  fillOpacity={1}
                  fill="url(#ticketsGradient)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Linha temporal de mensagens */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-700">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center">
              <ChatBubbleLeftRightIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-purple-400" />
              Mensagens - Últimos 7 dias
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.charts.messagesTimeline.labels.map((label, index) => ({
                day: label,
                messages: stats.charts.messagesTimeline.data[index]
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke={COLORS.secondary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: COLORS.secondary, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tickets por status */}
          {stats.charts.ticketsByStatus && stats.charts.ticketsByStatus.length > 0 && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-700">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center">
                <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-400" />
                Distribuição por Status
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.charts.ticketsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {stats.charts.ticketsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Atividade por horário */}
          {stats.charts.messagesByHour && stats.charts.messagesByHour.length > 0 && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-700">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center">
                <FireIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-orange-400" />
                Atividade por Horário (24h)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.charts.messagesByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hour" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="messages" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distribuição por Filas */}
          {stats.charts.ticketsByQueue && stats.charts.ticketsByQueue.length > 0 && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-700">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center">
                <QueueListIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-400" />
                Tickets por Fila
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.charts.ticketsByQueue} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis dataKey="name" type="category" width={80} stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill={COLORS.info} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 sm:mt-8 text-center">
        <p className="text-slate-500 text-xs sm:text-sm">
          Última atualização: {new Date().toLocaleString('pt-BR')}
        </p>
      </div>
    </div>
  );
}
