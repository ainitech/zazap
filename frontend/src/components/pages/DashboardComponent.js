import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  TicketIcon,
  UserGroupIcon,
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  BoltIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SparklesIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function DashboardComponent() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTickets: 0,
    resolvedTickets: 0,
    pendingTickets: 0,
    activeContacts: 0,
    activeSessions: 0,
    avgResponseTime: '0m',
    resolutionRate: '0%',
    todayTickets: 0,
    weeklyGrowth: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [agentStats, setAgentStats] = useState([]);
  const [chartData, setChartData] = useState({
    tickets: [0, 0, 0, 0, 0, 0, 0],
    revenue: [0, 0, 0, 0, 0, 0, 0],
    performance: [0, 0, 0, 0, 0, 0, 0],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  });

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentActivity();
    fetchAgentStats();
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(() => {
      fetchDashboardStats();
      fetchRecentActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Buscar todas as estatísticas em paralelo
      const [
        ticketsRes, 
        contactsRes, 
        sessionsRes, 
        usersRes,
        dashboardRes,
        messagesRes,
        queuesRes
      ] = await Promise.all([
        fetch(`${API_URL}/api/tickets`, { headers }),
        fetch(`${API_URL}/api/contacts`, { headers }),
        fetch(`${API_URL}/api/sessions`, { headers }),
        fetch(`${API_URL}/api/users`, { headers }),
        fetch(`${API_URL}/api/dashboard/stats`, { headers }).catch(() => null),
        fetch(`${API_URL}/api/ticket-messages?limit=100`, { headers }),
        fetch(`${API_URL}/api/queues`, { headers })
      ]);

      let tickets = [];
      let contacts = [];
      let sessions = [];
      let users = [];
      let messages = [];
      let queues = [];

      // Processar dados dos tickets
      if (ticketsRes.ok) {
        tickets = await ticketsRes.json();
      }

      // Processar dados dos contatos
      if (contactsRes.ok) {
        contacts = await contactsRes.json();
      }

      // Processar dados das sessões
      if (sessionsRes.ok) {
        sessions = await sessionsRes.json();
      }

      // Processar dados dos usuários
      if (usersRes.ok) {
        users = await usersRes.json();
      }

      // Processar dados das mensagens
      if (messagesRes.ok) {
        messages = await messagesRes.json();
      }

      // Processar dados das filas
      if (queuesRes.ok) {
        queues = await queuesRes.json();
      }

      // Calcular estatísticas dos tickets
      const totalTickets = tickets.length;
      const resolvedTickets = tickets.filter(t => 
        t.status === 'closed' || t.status === 'resolved'
      ).length;
      const pendingTickets = tickets.filter(t => 
        t.status === 'open' || t.status === 'pending'
      ).length;
      const inProgressTickets = tickets.filter(t => 
        t.status === 'in_progress'
      ).length;

      // Calcular tickets de hoje
      const today = new Date().toDateString();
      const todayTickets = tickets.filter(t => 
        new Date(t.createdAt).toDateString() === today
      ).length;

      // Calcular estatísticas das sessões
      const activeSessions = sessions.filter(s => 
        s.status === 'connected' || s.status === 'CONNECTED'
      ).length;
      const totalSessions = sessions.length;

      // Calcular estatísticas dos contatos
      const activeContacts = contacts.length;

      // Calcular tempo médio de resposta
      const responseTimeSum = messages.reduce((sum, msg) => {
        if (msg.sender === 'user' && msg.responseTime) {
          return sum + msg.responseTime;
        }
        return sum;
      }, 0);
      const responseTimeCount = messages.filter(msg => 
        msg.sender === 'user' && msg.responseTime
      ).length;
      const avgResponseTime = responseTimeCount > 0 
        ? (responseTimeSum / responseTimeCount / 60000).toFixed(1) // Convert to minutes
        : '0';

      // Calcular taxa de resolução
      const resolutionRate = totalTickets > 0 
        ? ((resolvedTickets / totalTickets) * 100).toFixed(1) 
        : '0';

      // Calcular crescimento semanal
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const thisWeekTickets = tickets.filter(t => 
        new Date(t.createdAt) >= lastWeek
      ).length;
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const lastWeekTickets = tickets.filter(t => {
        const date = new Date(t.createdAt);
        return date >= twoWeeksAgo && date < lastWeek;
      }).length;
      const weeklyGrowth = lastWeekTickets > 0 
        ? (((thisWeekTickets - lastWeekTickets) / lastWeekTickets) * 100).toFixed(1)
        : '0';

      // Receita mensal - apenas se houver dados reais do backend
      let monthlyRevenue = 0;
      // Se o backend fornecer dados de receita, use aqui
      // monthlyRevenue = dashboardRes?.revenue || 0;

      // Gerar dados do gráfico dos últimos 7 dias
      const last7Days = Array.from({length: 7}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toDateString(),
          day: date.toLocaleDateString('en', { weekday: 'short' })
        };
      });

      const ticketsByDay = last7Days.map(({ date }) => 
        tickets.filter(ticket => 
          new Date(ticket.createdAt).toDateString() === date
        ).length
      );

      const resolvedByDay = last7Days.map(({ date }) => 
        tickets.filter(ticket => 
          ticket.status === 'closed' && 
          new Date(ticket.updatedAt).toDateString() === date
        ).length
      );

      const revenueByDay = last7Days.map(() => 0); // Sem dados de receita por dia

      // Atualizar dados do gráfico
      setChartData({
        tickets: ticketsByDay,
        revenue: revenueByDay,
        performance: resolvedByDay,
        days: last7Days.map(d => d.day)
      });

      // Atualizar estatísticas
      setStats({
        totalTickets,
        resolvedTickets,
        pendingTickets,
        inProgressTickets,
        activeContacts,
        activeSessions,
        totalSessions,
        avgResponseTime: `${avgResponseTime}m`,
        resolutionRate: `${resolutionRate}%`,
        todayTickets,
        weeklyGrowth: parseFloat(weeklyGrowth),
        monthlyRevenue: 0, // Removido cálculo fictício
        thisWeekTickets,
        lastWeekTickets,
        totalUsers: users.length,
        activeQueues: queues.filter(q => q.active).length,
        totalQueues: queues.length
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas do dashboard:', error);
      
      // Manter valores zerados em caso de erro para mostrar dados reais
      setStats({
        totalTickets: 0,
        resolvedTickets: 0,
        pendingTickets: 0,
        inProgressTickets: 0,
        activeContacts: 0,
        activeSessions: 0,
        totalSessions: 0,
        avgResponseTime: '0m',
        resolutionRate: '0%',
        todayTickets: 0,
        weeklyGrowth: 0,
        monthlyRevenue: 0,
        thisWeekTickets: 0,
        lastWeekTickets: 0,
        totalUsers: 0,
        activeQueues: 0,
        totalQueues: 0
      });
      
      setChartData({
        tickets: [0, 0, 0, 0, 0, 0, 0],
        revenue: [0, 0, 0, 0, 0, 0, 0],
        performance: [0, 0, 0, 0, 0, 0, 0],
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Buscar tickets recentes, mensagens recentes e atividades
      const [ticketsRes, messagesRes, sessionsRes] = await Promise.all([
        fetch(`${API_URL}/api/tickets?limit=10&orderBy=createdAt&order=DESC`, { headers }),
        fetch(`${API_URL}/api/ticket-messages?limit=20&orderBy=timestamp&order=DESC`, { headers }),
        fetch(`${API_URL}/api/sessions?limit=5&orderBy=updatedAt&order=DESC`, { headers })
      ]);

      let activities = [];

      // Processar tickets recentes
      if (ticketsRes.ok) {
        const tickets = await ticketsRes.json();
        tickets.slice(0, 5).forEach(ticket => {
          activities.push({
            id: `ticket-${ticket.id}`,
            type: 'ticket',
            action: ticket.status === 'open' ? 'created' : 'updated',
            user: ticket.contact || 'Unknown Contact',
            description: `Ticket #${ticket.id} ${ticket.status === 'open' ? 'criado' : 'atualizado'}`,
            time: ticket.updatedAt || ticket.createdAt,
            status: ticket.status,
            priority: ticket.priority || 'normal'
          });
        });
      }

      // Processar mensagens recentes
      if (messagesRes.ok) {
        const messages = await messagesRes.json();
        messages.slice(0, 3).forEach(message => {
          activities.push({
            id: `message-${message.id}`,
            type: 'message',
            action: 'sent',
            user: message.sender === 'user' ? 'Agent' : message.contact || 'Contact',
            description: `Nova mensagem: ${message.content?.substring(0, 50)}${message.content?.length > 50 ? '...' : ''}`,
            time: message.timestamp || message.createdAt,
            sender: message.sender
          });
        });
      }

      // Processar sessões recentes
      if (sessionsRes.ok) {
        const sessions = await sessionsRes.json();
        sessions.slice(0, 2).forEach(session => {
          activities.push({
            id: `session-${session.id}`,
            type: 'session',
            action: session.status === 'CONNECTED' ? 'connected' : 'disconnected',
            user: session.name || 'WhatsApp Session',
            description: `Sessão ${session.status === 'CONNECTED' ? 'conectada' : 'desconectada'}`,
            time: session.updatedAt || session.createdAt,
            status: session.status
          });
        });
      }

      // Ordenar atividades por tempo (mais recente primeiro)
      activities.sort((a, b) => new Date(b.time) - new Date(a.time));

      setRecentActivity(activities.slice(0, 8));

    } catch (error) {
      console.error('Erro ao buscar atividade recente:', error);
      
      // Manter array vazio em caso de erro para não mostrar dados fictícios
      setRecentActivity([]);
    }
  };

  const fetchAgentStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Buscar dados dos usuários e tickets para calcular estatísticas dos agentes
      const [usersRes, ticketsRes] = await Promise.all([
        fetch(`${API_URL}/api/users`, { headers }),
        fetch(`${API_URL}/api/tickets`, { headers })
      ]);

      if (usersRes.ok && ticketsRes.ok) {
        const users = await usersRes.json();
        const tickets = await ticketsRes.json();

        // Calcular estatísticas por agente
        const agentStatsData = users
          .filter(user => user.role !== 'admin') // Filtrar apenas agentes
          .map(user => {
            const userTickets = tickets.filter(ticket => 
              ticket.userId === user.id || ticket.assignedTo === user.id
            );
            
            const resolvedTickets = userTickets.filter(ticket => 
              ticket.status === 'closed' || ticket.status === 'resolved'
            ).length;

            // Calcular tempo médio de resposta do agente
            const userMessages = userTickets.reduce((msgs, ticket) => {
              return msgs + (ticket.messagesCount || 0);
            }, 0);

            // Calcular performance baseada na taxa de resolução
            const performance = userTickets.length > 0 
              ? Math.round((resolvedTickets / userTickets.length) * 100) 
              : 0;

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              tickets: userTickets.length,
              resolved: resolvedTickets,
              performance,
              lastActivity: user.updatedAt || user.createdAt,
              country: user.country || 'BR', // Default para Brasil
              flag: user.country === 'US' ? '🇺🇸' : 
                    user.country === 'CA' ? '🇨🇦' : 
                    user.country === 'DE' ? '🇩🇪' : 
                    user.country === 'SE' ? '🇸🇪' : '🇧🇷'
            };
          })
          .sort((a, b) => b.tickets - a.tickets) // Ordenar por número de tickets
          .slice(0, 5); // Top 5 agentes

        setAgentStats(agentStatsData);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas dos agentes:', error);
      
      // Manter array vazio em caso de erro para não mostrar dados fictícios
      setAgentStats([]);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-400 border-t-transparent shadow-lg mx-auto"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-yellow-400 opacity-20"></div>
          </div>
          <p className="text-yellow-400 mt-4 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, <span className="text-yellow-400">{user?.name || 'User'}!</span>
            </h1>
            <p className="text-slate-400">Here's what's happening with your business today.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-300">Live Data</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Enhanced Total Tickets */}
        <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 rounded-2xl p-6 text-slate-900 relative overflow-hidden group hover:scale-105 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-300 rounded-full -translate-y-16 translate-x-16 opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-yellow-600 rounded-full translate-y-10 -translate-x-10 opacity-30"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-900/20 rounded-xl backdrop-blur-sm">
                <TicketIcon className="h-8 w-8 text-slate-900" />
              </div>
              <span className="text-sm font-bold bg-slate-900 text-yellow-400 px-3 py-1 rounded-full shadow-lg">Total</span>
            </div>
            <div>
              <p className="text-3xl font-black mb-1 tracking-tight">{stats.totalTickets}</p>
              <p className="text-slate-800 text-sm font-medium mb-3">Total Tickets</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ArrowUpIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm font-bold">+{stats.todayTickets} today</span>
                </div>
                <div className="w-12 h-1 bg-slate-900/30 rounded-full overflow-hidden">
                  <div className="w-8 h-full bg-slate-900 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Resolved Tickets */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 relative overflow-hidden group hover:scale-105 hover:border-yellow-400/50 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full -translate-y-12 translate-x-12 opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-yellow-400 rounded-full translate-y-8 -translate-x-8 opacity-5"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-400/10 rounded-xl border border-yellow-400/20">
                <CheckCircleIcon className="h-8 w-8 text-yellow-400" />
              </div>
              <span className="text-sm font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">Resolved</span>
            </div>
            <div>
              <p className="text-3xl font-black text-white mb-1 tracking-tight">{stats.resolvedTickets}</p>
              <p className="text-slate-400 text-sm font-medium mb-3">Resolved Tickets</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-yellow-400">
                  <span className="text-sm font-bold">{stats.resolutionRate} resolution rate</span>
                </div>
                <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="w-9 h-full bg-yellow-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Pending Tickets */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 relative overflow-hidden group hover:scale-105 hover:border-yellow-400/50 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full -translate-y-12 translate-x-12 opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-400/10 rounded-xl border border-yellow-400/20">
                <ClockIcon className="h-8 w-8 text-yellow-400" />
              </div>
              <span className="text-sm font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">Pending</span>
            </div>
            <div>
              <p className="text-3xl font-black text-white mb-1 tracking-tight">{stats.pendingTickets}</p>
              <p className="text-slate-400 text-sm font-medium mb-3">Pending Tickets</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-yellow-400">
                  <span className="text-sm font-bold">Avg response: {stats.avgResponseTime}</span>
                </div>
                <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="w-6 h-full bg-yellow-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Active Sessions */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 relative overflow-hidden group hover:scale-105 hover:border-yellow-400/50 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-400 to-green-500 rounded-full -translate-y-12 translate-x-12 opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-400/10 rounded-xl border border-yellow-400/20">
                <PhoneIcon className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">Sessions</span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-black text-white mb-1 tracking-tight">{stats.activeSessions}</p>
              <p className="text-slate-400 text-sm font-medium mb-3">Active Sessions</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-yellow-400">
                  <span className="text-sm font-bold">{stats.totalSessions} total sessions</span>
                </div>
                <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="w-10 h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Solved vs New Tickets Chart */}
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Solved Ticket Vs New Ticket</h3>
              <p className="text-slate-400 text-sm">Weekly performance overview</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-slate-400 text-sm">Solved</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
                <span className="text-slate-400 text-sm">New</span>
              </div>
            </div>
          </div>
          
          {/* Simple Line Chart - Backend Data */}
          <div className="h-64 relative bg-slate-900 rounded-xl p-4">
            <svg className="w-full h-full" viewBox="0 0 400 200">
              <defs>
                {/* Simple gradients */}
                <linearGradient id="solvedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#facc15"/>
                  <stop offset="100%" stopColor="#fde047"/>
                </linearGradient>
                
                <linearGradient id="newGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#64748b"/>
                  <stop offset="100%" stopColor="#94a3b8"/>
                </linearGradient>
              </defs>
              
              {/* Calculate positions based on real data */}
              {(() => {
                const maxSolved = Math.max(...chartData.performance, 1);
                const maxNew = Math.max(...chartData.tickets, 1);
                const chartHeight = 160;
                const chartBottom = 180;
                
                // Calculate points for solved tickets
                const solvedPoints = chartData.performance.map((value, i) => ({
                  x: 50 + (i * 50),
                  y: chartBottom - (value / maxSolved) * chartHeight,
                  value
                }));
                
                // Calculate points for new tickets
                const newPoints = chartData.tickets.map((value, i) => ({
                  x: 50 + (i * 50),
                  y: chartBottom - (value / maxNew) * chartHeight,
                  value
                }));
                
                return (
                  <>
                    {/* Solved tickets line */}
                    <polyline
                      points={solvedPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="url(#solvedGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* New tickets line */}
                    <polyline
                      points={newPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="url(#newGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Data points for solved */}
                    {solvedPoints.map((point, i) => (
                      <g key={`solved-${i}`} className="group">
                        <circle 
                          cx={point.x} 
                          cy={point.y} 
                          r="4" 
                          fill="#facc15" 
                          stroke="#1e293b" 
                          strokeWidth="2"
                          className="cursor-pointer"
                        />
                        <text 
                          x={point.x} 
                          y={point.y - 10} 
                          textAnchor="middle" 
                          fill="#facc15" 
                          fontSize="10" 
                          fontWeight="bold"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {point.value}
                        </text>
                      </g>
                    ))}
                    
                    {/* Data points for new */}
                    {newPoints.map((point, i) => (
                      <g key={`new-${i}`} className="group">
                        <circle 
                          cx={point.x} 
                          cy={point.y} 
                          r="4" 
                          fill="#64748b" 
                          stroke="#1e293b" 
                          strokeWidth="2"
                          className="cursor-pointer"
                        />
                        <text 
                          x={point.x} 
                          y={point.y - 10} 
                          textAnchor="middle" 
                          fill="#94a3b8" 
                          fontSize="10" 
                          fontWeight="bold"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {point.value}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
            
            {/* Day labels */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-between text-slate-400 text-xs px-12">
              {chartData.days.map((day, i) => (
                <span key={i} className="font-medium">{day}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Performance */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Agent With Most Tickets</h3>
            <UsersIcon className="h-6 w-6 text-yellow-400" />
          </div>
          
          <div className="space-y-4">
            {agentStats.length > 0 ? agentStats.map((agent, i) => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{agent.flag}</span>
                  <div>
                    <p className="text-white font-medium">{agent.name}</p>
                    <p className="text-slate-400 text-sm">{agent.tickets} tickets • {agent.resolved} resolved</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-sm">{formatTime(agent.lastActivity)}</p>
                  <div className="w-16 bg-slate-600 rounded-full h-2 mt-1">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${agent.performance}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">Nenhum agente encontrado</p>
                <p className="text-slate-500 text-xs mt-1">Os dados aparecerão quando houver agentes ativos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket By Type */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Ticket By Type</h3>
            <ChartBarIcon className="h-6 w-6 text-yellow-400" />
          </div>
          
          <div className="relative w-40 h-40 mx-auto mb-6">
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 42 42">
              {/* Background circle */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#475569"
                strokeWidth="3"
              />
              
              {/* Progress circle based on real data */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#facc15"
                strokeWidth="4"
                strokeDasharray={`${stats.totalTickets > 0 ? (stats.resolvedTickets / stats.totalTickets) * 100 : 0} ${stats.totalTickets > 0 ? 100 - ((stats.resolvedTickets / stats.totalTickets) * 100) : 100}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{stats.resolvedTickets}</p>
                <p className="text-slate-400 text-xs">Resolved</p>
              </div>
            </div>
          </div>            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-slate-300 text-sm">Resolved</span>
                </div>
                <span className="text-white font-medium">{stats.resolvedTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                  <span className="text-slate-300 text-sm">Pending</span>
                </div>
                <span className="text-white font-medium">{stats.pendingTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
                  <span className="text-slate-300 text-sm">In Progress</span>
                </div>
                <span className="text-white font-medium">{stats.inProgressTickets || 0}</span>
              </div>
            </div>
        </div>

        {/* New Vs Returned Ticket */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Ticket Timeline</h3>
            <TicketIcon className="h-6 w-6 text-yellow-400" />
          </div>
          
          <div className="relative w-40 h-40 mx-auto mb-6">
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 42 42">
              {/* Background circle */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#475569"
                strokeWidth="3"
              />
              
              {/* Progress circle based on today's tickets */}
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#facc15"
                strokeWidth="4"
                strokeDasharray={`${stats.totalTickets > 0 ? (stats.todayTickets / stats.totalTickets) * 100 : 0} ${stats.totalTickets > 0 ? 100 - ((stats.todayTickets / stats.totalTickets) * 100) : 100}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{stats.todayTickets}</p>
                <p className="text-slate-400 text-xs">Today</p>
              </div>
            </div>
          </div>            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-slate-300 text-sm">Today</span>
                </div>
                <span className="text-white font-medium">{stats.todayTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                  <span className="text-slate-300 text-sm">This Week</span>
                </div>
                <span className="text-white font-medium">{stats.thisWeekTickets}</span>
              </div>
            </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Activity Summary</h3>
            <CalendarDaysIcon className="h-6 w-6 text-yellow-400" />
          </div>
          
          {/* Simple Bar Chart based on backend data */}
          <div className="h-32 flex items-end justify-between space-x-2 mb-4 p-2 bg-slate-900/50 rounded-lg">
            {chartData.tickets.map((value, index) => {
              const maxValue = Math.max(...chartData.tickets, 1);
              const height = Math.max(8, (value / maxValue) * 100);
              
              return (
                <div key={index} className="flex flex-col items-center flex-1 group cursor-pointer">
                  <div className="relative w-full">
                    {/* Background bar */}
                    <div className="w-full h-24 bg-slate-700/30 rounded-t-lg"></div>
                    
                    {/* Value bar based on real data */}
                    <div 
                      className="absolute bottom-0 w-full bg-yellow-400 rounded-t-lg transition-all duration-700 ease-out"
                      style={{ height: `${height}px` }}
                    />
                    
                    {/* Value display on hover */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="bg-slate-800 text-yellow-400 text-xs px-2 py-1 rounded border border-yellow-400/30">
                        {value}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between text-slate-400 text-xs mb-4">
            {chartData.days.map((day, i) => (
              <span key={i}>{day.slice(0, 1)}</span>
            ))}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">This Week</span>
              <span className="text-yellow-400 font-medium">{stats.thisWeekTickets} tickets</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Last Week</span>
              <span className="text-slate-300 font-medium">{stats.lastWeekTickets} tickets</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Growth</span>
              <span className={`font-medium ${stats.weeklyGrowth >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                {stats.weeklyGrowth >= 0 ? '+' : ''}{stats.weeklyGrowth}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
