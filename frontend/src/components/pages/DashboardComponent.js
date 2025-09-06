import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../utils/apiClient';
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
  ArrowUpIcon,
  EllipsisHorizontalIcon,
  PlayIcon
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

      const response = await fetch(apiUrl('/api/dashboard/stats'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
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

  // Componente de cartão elegante estilo fitness dashboard
  const MetricCard = ({ title, value, unit, percentage, color, icon: Icon, isIncrease = true }) => (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-gray-300 text-sm font-medium">{title}</h3>
        </div>
        <EllipsisHorizontalIcon className="w-5 h-5 text-gray-500" />
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-bold text-white">{value}</span>
            {unit && <span className="text-gray-400 text-sm">{unit}</span>}
          </div>
          {percentage && (
            <div className={`flex items-center space-x-1 mt-2 ${isIncrease ? 'text-green-400' : 'text-red-400'}`}>
              <ArrowTrendingUpIcon className={`w-3 h-3 ${!isIncrease && 'rotate-180'}`} />
              <span className="text-xs font-medium">{percentage}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Componente de gráfico circular
  const CircularProgress = ({ percentage, title, subtitle, color = "#10B981" }) => {
    const radius = 90;
    const strokeWidth = 8;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-gray-300 text-sm font-medium">{title}</h3>
          <EllipsisHorizontalIcon className="w-5 h-5 text-gray-500" />
        </div>
        
        <div className="relative flex items-center justify-center">
          <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
            <circle
              stroke="#374151"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke={color}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-3xl font-bold text-white">{percentage}%</div>
            <div className="text-xs text-gray-400">{subtitle}</div>
          </div>
        </div>
      </div>
    );
  };

  // Componente de atividade recomendada
  const ActivityCard = ({ title, subtitle, progress, time, calories, icon: Icon }) => (
    <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-gray-700 rounded-lg">
          <Icon className="w-5 h-5 text-gray-300" />
        </div>
        <div>
          <h4 className="text-white font-medium text-sm">{title}</h4>
          <p className="text-gray-400 text-xs">{subtitle}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="text-white text-sm font-medium">{progress}</div>
          <div className="text-gray-400 text-xs">{time}</div>
        </div>
        <div className="text-right">
          <div className="text-white text-sm font-medium">{calories}</div>
          <div className="text-gray-400 text-xs">Cal</div>
        </div>
        <EllipsisHorizontalIcon className="w-4 h-4 text-gray-500" />
      </div>
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
      <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen">
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Erro ao carregar dashboard</h2>
            <p className="text-slate-400 mb-4">{error}</p>
            <button
              onClick={fetchDashboardStats}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">ZZ</span>
              </div>
              <div>
                <h1 className="text-white text-lg font-semibold">Bom dia,</h1>
                <h2 className="text-2xl font-bold text-white">Bem-vindo de volta, {user?.name}!</h2>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-gray-300 text-sm">Sistema Online</span>
            </div>
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-gray-300 text-sm">🔔</span>
            </div>
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-gray-300 text-sm">⚙️</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Main Metrics */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total de Tickets"
              value={stats?.totalTickets || 0}
              unit="tickets"
              percentage="2.3"
              color="bg-blue-500"
              icon={TicketIcon}
              isIncrease={true}
            />
            <MetricCard
              title="Tickets Abertos"
              value={stats?.openTickets || 0}
              unit="pendentes"
              percentage="1.2"
              color="bg-amber-500"
              icon={ClockIcon}
              isIncrease={false}
            />
            <MetricCard
              title="Taxa de Resolução"
              value={stats?.totalTickets > 0 ? Math.round((stats.closedTickets / stats.totalTickets) * 100) : 0}
              unit="%"
              percentage="0.8"
              color="bg-green-500"
              icon={CheckCircleIcon}
              isIncrease={true}
            />
            <MetricCard
              title="Mensagens Hoje"
              value={stats?.todayMessages || 0}
              unit="msgs"
              percentage="3.1"
              color="bg-purple-500"
              icon={ChatBubbleLeftRightIcon}
              isIncrease={true}
            />
          </div>

          {/* Progress Circle and Timeline Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Circular Progress */}
            <CircularProgress
              percentage={stats?.totalTickets ? Math.round((stats.closedTickets / stats.totalTickets) * 100) : 0}
              title="Taxa de Resolução"
              subtitle={`${stats?.closedTickets || 0} resolvidos`}
              color="#10B981"
            />

            {/* Timeline Chart */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-gray-300 text-sm font-medium">Evolução de Tickets</h3>
                <EllipsisHorizontalIcon className="w-5 h-5 text-gray-500" />
              </div>
              
              {stats?.charts?.ticketsTimeline && (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats.charts.ticketsTimeline.labels.map((label, index) => ({
                    day: label,
                    value: stats.charts.ticketsTimeline.data[index]
                  }))}>
                    <defs>
                      <linearGradient id="ticketsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151', 
                        borderRadius: '8px',
                        color: '#fff'
                      }} 
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      fillOpacity={1}
                      fill="url(#ticketsGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Performance metrics section */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-300 text-sm font-medium">Performance do Sistema</h3>
              <EllipsisHorizontalIcon className="w-5 h-5 text-gray-500" />
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-gray-400 text-sm mb-2">Sessões</div>
                <div className="text-white text-xl font-bold">{stats?.activeSessions || 0} ativas</div>
                <div className="text-green-400 text-sm">de {stats?.totalSessions || 0} total</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm mb-2">Tempo Médio</div>
                <div className="text-white text-xl font-bold">24 min</div>
                <div className="text-blue-400 text-sm">por ticket</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm mb-2">Usuários</div>
                <div className="text-white text-xl font-bold">{stats?.totalUsers || 0} ativos</div>
                <div className="text-purple-400 text-sm">no sistema</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">Atividade Recente</h3>
              <div className="flex items-center space-x-2">
                <button className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-gray-300 text-sm">📋</span>
                </button>
                <button className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-gray-300 text-sm">📊</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <ActivityCard
                title="Novos Tickets"
                subtitle="Tickets criados hoje"
                progress={`${stats?.todayMessages || 0}`}
                time="Últimas 24 horas"
                calories={`${stats?.openTickets || 0} pendentes`}
                icon={TicketIcon}
              />
              <ActivityCard
                title="Tickets Resolvidos"
                subtitle="Atendimentos finalizados"
                progress={`${stats?.closedTickets || 0}`}
                time="Total geral"
                calories={`${stats?.totalTickets ? Math.round((stats.closedTickets / stats.totalTickets) * 100) : 0}% taxa`}
                icon={CheckCircleIcon}
              />
              <ActivityCard
                title="Mensagens Trocadas"
                subtitle="Comunicação com clientes"
                progress={`${stats?.todayMessages || 0}`}
                time="Hoje"
                calories="Em tempo real"
                icon={ChatBubbleLeftRightIcon}
              />
              <ActivityCard
                title="Sessões WhatsApp"
                subtitle="Conexões ativas"
                progress={`${stats?.activeSessions || 0}`}
                time="Online agora"
                calories={`${stats?.totalSessions || 0} configuradas`}
                icon={PhoneIcon}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Queue Management */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
            <h3 className="text-white text-lg font-semibold mb-6">Gestão de Filas</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">Suporte Geral</div>
                    <div className="text-gray-400 text-xs">Principal</div>
                  </div>
                </div>
                <div className="w-6 h-6 bg-green-500 rounded-full"></div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">Vendas</div>
                    <div className="text-gray-400 text-xs">Comercial</div>
                  </div>
                </div>
                <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">Financeiro</div>
                    <div className="text-gray-400 text-xs">Cobrança</div>
                  </div>
                </div>
                <div className="w-6 h-6 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">Status do Sistema</h3>
              <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">WhatsApp API</span>
                <span className="text-green-400 text-sm font-medium">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Banco de Dados</span>
                <span className="text-green-400 text-sm font-medium">Conectado</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">WebSocket</span>
                <span className="text-green-400 text-sm font-medium">Ativo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Redis Cache</span>
                <span className="text-yellow-400 text-sm font-medium">Limitado</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300 text-sm">Uptime</span>
                <span className="text-white text-sm font-medium">99.9%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.9%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
