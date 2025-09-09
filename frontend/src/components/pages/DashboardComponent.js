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

      {/* NPS Section */}
      <div className="mb-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2 text-yellow-400" />
            Satisfação (NPS)
          </h3>
          {stats?.nps?.totalResponses > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex items-center justify-between p-4 rounded-xl bg-slate-700/30 border border-slate-600/40">
                <div>
                  <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">NPS</div>
                  <div className="text-3xl font-extrabold text-white mt-1">{stats.nps.nps}</div>
                  <div className="text-slate-500 text-xs mt-1">Net Promoter Score</div>
                </div>
                <div className="w-24 h-24 relative">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" stroke="#334155" strokeWidth="8" fill="none" />
                    <circle
                      cx="50" cy="50" r="45" stroke="#FBBF24" strokeWidth="8" fill="none"
                      strokeDasharray="283" strokeDashoffset={283 - (283 * ((stats.nps.nps + 100) / 200))}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm text-slate-300 font-medium">{stats.nps.totalResponses} resp.</span>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-700/20 border border-slate-600/30">
                <div className="text-xs text-slate-400">Média</div>
                <div className="text-xl font-bold text-white">{stats.nps.average}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-700/20 border border-slate-600/30">
                <div className="text-xs text-slate-400">Promotores</div>
                <div className="text-lg font-semibold text-green-400">{stats.nps.promoters}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-700/20 border border-slate-600/30">
                <div className="text-xs text-slate-400">Neutros</div>
                <div className="text-lg font-semibold text-blue-400">{stats.nps.passives}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-700/20 border border-slate-600/30">
                <div className="text-xs text-slate-400">Detratores</div>
                <div className="text-lg font-semibold text-red-400">{stats.nps.detractors}</div>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-sm">Nenhuma resposta de NPS ainda.</div>
          )}
        </div>
        <div className="xl:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
          <h4 className="text-lg font-semibold text-white mb-4">Distribuição das Notas</h4>
          {stats?.nps?.distribution?.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.nps.distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="score" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569', borderRadius: '8px', color: '#F1F5F9' }} />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {stats.nps.distribution.map((d,i)=>(
                      <Cell key={i} fill={d.score >=9 ? '#10B981' : d.score >=6 ? '#3B82F6' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-slate-400 text-sm">Sem dados suficientes para distribuição.</div>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-400">
            <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-red-500"></span> 0–5 Ruim</div>
            <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-blue-500"></span> 6–8 Neutro</div>
            <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-500"></span> 9–10 Ótimo</div>
          </div>
          {/* NPS por Usuário */}
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-white mb-3">NPS por Agente</h4>
            {stats?.npsByUser?.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-slate-300">
                  <thead>
                    <tr className="bg-slate-700/40 text-left">
                      <th className="px-3 py-2 font-medium">Agente</th>
                      <th className="px-3 py-2 font-medium">Resp.</th>
                      <th className="px-3 py-2 font-medium">Média</th>
                      <th className="px-3 py-2 font-medium">NPS</th>
                      <th className="px-3 py-2 font-medium text-green-400">Prom.</th>
                      <th className="px-3 py-2 font-medium text-blue-400">Neut.</th>
                      <th className="px-3 py-2 font-medium text-red-400">Detr.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.npsByUser.map(u => (
                      <tr key={u.userId || 'none'} className="border-b border-slate-700/40 last:border-none hover:bg-slate-700/20">
                        <td className="px-3 py-2 whitespace-nowrap">{u.userName}</td>
                        <td className="px-3 py-2">{u.totalResponses}</td>
                        <td className="px-3 py-2">{u.average}</td>
                        <td className={`px-3 py-2 font-semibold ${u.nps >= 0 ? 'text-green-400' : 'text-red-400'}`}>{u.nps}</td>
                        <td className="px-3 py-2 text-green-400">{u.promoters}</td>
                        <td className="px-3 py-2 text-blue-400">{u.passives}</td>
                        <td className="px-3 py-2 text-red-400">{u.detractors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-slate-500 text-sm">Ainda sem respostas por agente.</div>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        
        {/* Coluna 1 - Taxa de Resolução */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <CheckCircleIcon className="w-5 h-5 mr-2 text-green-400" />
            Taxa de Resolução
          </h3>
          
          {/* Gráfico circular de resolução */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#374151"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#10B981"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * (stats?.closedTickets || 0) / Math.max(stats?.totalTickets || 1, 1))}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {Math.round(((stats?.closedTickets || 0) / Math.max(stats?.totalTickets || 1, 1)) * 100)}%
                  </div>
                  <div className="text-xs text-slate-400">resolvidos</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Estatísticas de resolução */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Tickets Resolvidos</span>
              <span className="text-white font-medium">{stats?.closedTickets || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Tickets Pendentes</span>
              <span className="text-yellow-400 font-medium">{stats?.openTickets || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Tempo Médio</span>
              <span className="text-blue-400 font-medium">24 min</span>
            </div>
          </div>
        </div>

        {/* Coluna 2 - Evolução de Tickets */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <ArrowTrendingUpIcon className="w-5 h-5 mr-2 text-blue-400" />
            Evolução de Tickets
          </h3>
          
          {/* Gráfico de área dos últimos 7 dias */}
          {stats?.charts && (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.charts.ticketsTimeline?.labels?.map((label, index) => ({
                day: label,
                tickets: stats.charts.ticketsTimeline.data[index]
              }))}>
                <defs>
                  <linearGradient id="ticketsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#F1F5F9'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tickets"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#ticketsGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          
          {/* Indicadores de tendência */}
          <div className="mt-4 flex justify-between text-sm">
            <div className="text-center">
              <div className="text-slate-400">Hoje</div>
              <div className="text-white font-medium">{stats?.todayTickets || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400">Ontem</div>
              <div className="text-white font-medium">{stats?.yesterdayTickets || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400">Variação</div>
              <div className="text-green-400 font-medium flex items-center">
                <ArrowUpIcon className="w-3 h-3 mr-1" />
                +3.1%
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 3 - Performance do Sistema */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2 text-purple-400" />
            Performance do Sistema
          </h3>
          
          {/* Métricas de performance */}
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-slate-700">
              <div className="flex items-center">
                <PhoneIcon className="w-4 h-4 mr-2 text-green-400" />
                <span className="text-slate-300 text-sm">Sessões</span>
              </div>
              <div className="text-right">
                <div className="text-white font-medium">{stats?.activeSessions || 0} ativas</div>
                <div className="text-xs text-slate-400">de {stats?.totalSessions || 1} total</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-slate-700">
              <div className="flex items-center">
                <QueueListIcon className="w-4 h-4 mr-2 text-blue-400" />
                <span className="text-slate-300 text-sm">Tempo Médio</span>
              </div>
              <div className="text-right">
                <div className="text-white font-medium">24 min</div>
                <div className="text-xs text-slate-400">por ticket</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-slate-700">
              <div className="flex items-center">
                <UserGroupIcon className="w-4 h-4 mr-2 text-purple-400" />
                <span className="text-slate-300 text-sm">Usuários</span>
              </div>
              <div className="text-right">
                <div className="text-white font-medium">{stats?.totalUsers || 0} ativos</div>
                <div className="text-xs text-slate-400">no sistema</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center">
                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2 text-yellow-400" />
                <span className="text-slate-300 text-sm">Mensagens</span>
              </div>
              <div className="text-right">
                <div className="text-white font-medium">{stats?.todayMessages || 0} hoje</div>
                <div className="text-xs text-slate-400">enviadas</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gestão de Filas - Nova seção */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <QueueListIcon className="w-6 h-6 mr-2 text-indigo-400" />
          Gestão de Filas
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Suporte Geral */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className="text-white font-medium">Suporte Geral</span>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                Online
              </span>
            </div>
            <div className="text-sm text-slate-400 mb-2">Principal</div>
            <div className="text-2xl font-bold text-white">1</div>
          </div>
          
          {/* Vendas */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-400 rounded-full mr-2"></div>
                <span className="text-white font-medium">Vendas</span>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Online
              </span>
            </div>
            <div className="text-sm text-slate-400 mb-2">Comercial</div>
            <div className="text-2xl font-bold text-white">2</div>
          </div>
          
          {/* Financeiro */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                <span className="text-white font-medium">Financeiro</span>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                Online
              </span>
            </div>
            <div className="text-sm text-slate-400 mb-2">Cobrança</div>
            <div className="text-2xl font-bold text-white">3</div>
          </div>
        </div>
      </div>

      {/* Status do Sistema - Nova seção */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <FireIcon className="w-6 h-6 mr-2 text-orange-400" />
          Status do Sistema
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status dos Serviços */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">WhatsApp API</span>
                <div className="flex items-center">
                  <span className="text-green-400 text-sm mr-2">Online</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Banco de Dados</span>
                <div className="flex items-center">
                  <span className="text-green-400 text-sm mr-2">Conectado</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-300">WebSocket</span>
                <div className="flex items-center">
                  <span className="text-green-400 text-sm mr-2">Ativo</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Redis Cache</span>
                <div className="flex items-center">
                  <span className="text-yellow-400 text-sm mr-2">Limitado</span>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Estatísticas de Uptime */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <h4 className="text-lg font-semibold text-white mb-4">Uptime</h4>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-400 text-sm">Sistema</span>
                  <span className="text-green-400 text-sm font-medium">99.9%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{width: '99.9%'}}></div>
                </div>
              </div>
              
              <div className="text-center pt-4">
                <div className="text-2xl font-bold text-white">99.9%</div>
                <div className="text-slate-400 text-sm">Uptime Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos Complementares */}
      {stats?.charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mensagens por Horário */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <FireIcon className="w-5 h-5 mr-2 text-orange-400" />
              Atividade por Horário (24h)
            </h3>
            {stats.charts.messagesByHour && stats.charts.messagesByHour.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.charts.messagesByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hour" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#F1F5F9'
                    }}
                  />
                  <Bar dataKey="messages" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Distribuição por Status */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <CheckCircleIcon className="w-5 h-5 mr-2 text-green-400" />
              Distribuição por Status
            </h3>
            {stats.charts.ticketsByStatus && stats.charts.ticketsByStatus.length > 0 && (
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
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#F1F5F9'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
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
