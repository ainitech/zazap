import React, { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PaperAirplaneIcon, 
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  PhotoIcon,
  PencilIcon,
  CalendarDaysIcon,
  ListBulletIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import ScheduleCreateModal from '../modals/ScheduleCreateModal';
import ScheduleEditModal from '../modals/ScheduleEditModal';
import { apiFetch, safeJson } from '../../utils/apiClient';

export default function SchedulesComponent() {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, processing: 0, sent: 0, failed: 0 });
  const [openCreate, setOpenCreate] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarDate, setCalendarDate] = useState(new Date());
  // Removido uso de token/localStorage

  const load = async () => {
    console.log('📅 SchedulesComponent: Carregando agendamentos...');
    setLoading(true);
    try {
      const [listRes, countsRes] = await Promise.all([
        apiFetch(`/api/schedules?status=${statusFilter}&q=${encodeURIComponent(q)}`),
        apiFetch('/api/schedules/counts')
      ]);
      console.log('📅 SchedulesComponent: Respostas da API:', listRes.status, countsRes.status);
      const listData = await safeJson(listRes);
      const countsData = await safeJson(countsRes);
      console.log('📅 SchedulesComponent: Dados carregados:', listData?.length || 0, 'itens');
      setItems(listData || []);
      setCounts(countsData || {});
    } catch (e) {
      console.error('📅 SchedulesComponent: Falha ao carregar agendamentos', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async (item) => {
    try {
      const r = await apiFetch(`/api/schedules/${item.id}/send-now`, { method: 'POST' });
      await safeJson(r).catch(() => null);
      await load();
    } catch (e) {
      console.error('Falha ao enviar agora', e);
    }
  };

  const handleCancel = async (item) => {
    if (item.status !== 'pending' && item.status !== 'processing') return;
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    try {
      const r = await apiFetch(`/api/schedules/${item.id}`, { method: 'DELETE' });
      await safeJson(r).catch(() => null);
      await load();
    } catch (e) {
      console.error('Erro ao cancelar agendamento:', e);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { 
        color: 'bg-amber-50 text-amber-700 border-amber-200', 
        icon: ClockIcon, 
        text: 'Pendente' 
      },
      processing: { 
        color: 'bg-blue-50 text-blue-700 border-blue-200', 
        icon: ClockIcon, 
        text: 'Processando' 
      },
      sent: { 
        color: 'bg-green-50 text-green-700 border-green-200', 
        icon: CheckCircleIcon, 
        text: 'Enviado' 
      },
      failed: { 
        color: 'bg-red-50 text-red-700 border-red-200', 
        icon: ExclamationTriangleIcon, 
        text: 'Falhou' 
      },
      canceled: { 
        color: 'bg-gray-50 text-gray-700 border-gray-200', 
        icon: XMarkIcon, 
        text: 'Cancelado' 
      }
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  const getTypeIcon = (type) => {
    return type === 'media' ? PhotoIcon : DocumentTextIcon;
  };

  // Get schedules for a specific date
  const getSchedulesForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return items.filter(item => {
      const itemDate = new Date(item.sendAt).toISOString().split('T')[0];
      return itemDate === dateStr;
    });
  };

  // Check if a date has schedules
  const hasSchedulesOnDate = (date) => {
    return getSchedulesForDate(date).length > 0;
  };

  // Calendar tile content
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const schedules = getSchedulesForDate(date);
      if (schedules.length > 0) {
        return (
          <div className="flex flex-wrap gap-1 justify-center mt-1">
            {schedules.slice(0, 3).map((schedule, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full ${
                  schedule.status === 'pending' ? 'bg-amber-500' :
                  schedule.status === 'sent' ? 'bg-green-500' :
                  schedule.status === 'failed' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}
              />
            ))}
            {schedules.length > 3 && (
              <span className="text-[10px] text-gray-600 font-medium ml-1">
                +{schedules.length - 3}
              </span>
            )}
          </div>
        );
      }
    }
    return null;
  };

  // Calendar tile class name
  const tileClassName = ({ date, view }) => {
    if (view === 'month' && hasSchedulesOnDate(date)) {
      return 'has-schedules';
    }
    return null;
  };

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Agendamentos</h1>
            <p className="text-sm text-slate-400 mt-1">
              Gerencie seus envios programados e lembretes
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListBulletIcon className="w-4 h-4" />
                Lista
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'calendar' 
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CalendarDaysIcon className="w-4 h-4" />
                Calendário
              </button>
            </div>
            
            <button 
              onClick={() => setOpenCreate(true)} 
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm"
            >
              <PlusIcon className="w-5 h-5" />
              Novo Agendamento
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          {[
            { key: '', label: 'Total', count: counts.total, color: 'bg-slate-50 border-slate-200' },
            { key: 'pending', label: 'Pendentes', count: counts.pending, color: 'bg-amber-50 border-amber-200' },
            { key: 'processing', label: 'Processando', count: counts.processing, color: 'bg-blue-50 border-blue-200' },
            { key: 'sent', label: 'Enviados', count: counts.sent, color: 'bg-green-50 border-green-200' },
            { key: 'failed', label: 'Falharam', count: counts.failed, color: 'bg-red-900/20 border-red-500' },
          ].map(stat => (
            <button
              key={stat.key}
              onClick={() => setStatusFilter(stat.key)}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                statusFilter === stat.key 
                  ? 'border-yellow-500 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' 
                  : `${stat.color} text-slate-300 hover:border-slate-600`
              }`}
            >
              <div className="text-2xl font-bold">{stat.count || 0}</div>
              <div className="text-sm opacity-80">{stat.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent shadow-sm"
            placeholder="Buscar por destino..."
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') load(); }} 
          />
        </div>
      </div>
      {/* Content */}
      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Mini Calendar and Today's Tasks */}
          <div className="lg:col-span-1 space-y-6">
            {/* Mini Calendar */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">
                  {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <style jsx>{`
                .mini-calendar .react-calendar {
                  width: 100% !important;
                  border: none !important;
                  font-family: inherit !important;
                  background: transparent !important;
                  color: #ffffff !important;
                }
                .mini-calendar .react-calendar__navigation {
                  display: none !important;
                }
                .mini-calendar .react-calendar__tile {
                  background: none !important;
                  border: none !important;
                  padding: 0.375rem !important;
                  height: 2rem !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: center !important;
                  border-radius: 0.375rem !important;
                  margin: 0.125rem !important;
                  font-size: 0.875rem !important;
                  color: #cbd5e1 !important;
                }
                .mini-calendar .react-calendar__tile:hover {
                  background-color: #475569 !important;
                  color: #ffffff !important;
                }
                .mini-calendar .react-calendar__tile--active {
                  background: linear-gradient(to right, #eab308, #ca8a04) !important;
                  color: white !important;
                  font-weight: 600 !important;
                }
                .mini-calendar .react-calendar__tile--now {
                  background-color: #1e293b !important;
                  color: #fbbf24 !important;
                  font-weight: 600 !important;
                  border: 1px solid #fbbf24 !important;
                }
                .mini-calendar .react-calendar__tile.has-schedules {
                  background-color: #451a03 !important;
                  color: #fbbf24 !important;
                  font-weight: 500 !important;
                  border: 1px solid #92400e !important;
                }
                .mini-calendar .react-calendar__month-view__weekdays {
                  font-size: 0.75rem !important;
                  font-weight: 500 !important;
                  color: #94a3b8 !important;
                  text-transform: uppercase !important;
                  margin-bottom: 0.5rem !important;
                }
                .mini-calendar .react-calendar__month-view__weekdays__weekday {
                  padding: 0.25rem !important;
                }
                .mini-calendar .react-calendar__tile abbr {
                  text-decoration: none !important;
                }
              `}</style>
              
              <div className="mini-calendar">
                <Calendar
                  value={selectedDate}
                  onChange={setSelectedDate}
                  activeStartDate={calendarDate}
                  onActiveStartDateChange={({ activeStartDate }) => setCalendarDate(activeStartDate)}
                  tileClassName={tileClassName}
                  locale="pt-BR"
                  showNavigation={false}
                />
              </div>
            </div>

            {/* Today's Tasks */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <h3 className="font-semibold text-white mb-4">Agendamentos de Hoje</h3>
              {(() => {
                const todaySchedules = getSchedulesForDate(new Date());
                return todaySchedules.length > 0 ? (
                  <div className="space-y-3">
                    {todaySchedules.slice(0, 5).map(item => {
                      const sendTime = new Date(item.sendAt);
                      return (
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700">
                          <div className={`w-2 h-8 rounded-full ${
                            item.status === 'pending' ? 'bg-amber-400' :
                            item.status === 'sent' ? 'bg-green-400' :
                            item.status === 'failed' ? 'bg-red-400' :
                            'bg-blue-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white">
                              {sendTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-xs text-slate-400 truncate">
                              {item.Contact?.name || item.to.split('@')[0]}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(item.status)}
                          </div>
                        </div>
                      );
                    })}
                    {todaySchedules.length > 5 && (
                      <div className="text-center pt-2">
                        <span className="text-sm text-gray-500">
                          +{todaySchedules.length - 5} agendamentos
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <ClockIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">
                      Nenhum agendamento hoje
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Main Calendar Area */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800 rounded-xl border border-slate-700">
              {/* Calendar Header */}
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white">
                      {calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <ChevronLeftIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCalendarDate(new Date())}
                        className="px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        Hoje
                      </button>
                      <button
                        onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setOpenCreate(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Criar Evento
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="p-6">
                <style jsx>{`
                  .main-calendar .react-calendar {
                    width: 100% !important;
                    border: none !important;
                    font-family: inherit !important;
                    background: transparent !important;
                    color: #ffffff !important;
                  }
                  .main-calendar .react-calendar__navigation {
                    display: none !important;
                  }
                  .main-calendar .react-calendar__tile {
                    background: #1e293b !important;
                    border: 1px solid #334155 !important;
                    padding: 1rem !important;
                    height: 120px !important;
                    text-align: left !important;
                    vertical-align: top !important;
                    position: relative !important;
                    transition: all 0.2s ease !important;
                    border-radius: 0.5rem !important;
                    margin: 0.125rem !important;
                  }
                  .main-calendar .react-calendar__tile:hover {
                    background-color: #334155 !important;
                    border-color: #475569 !important;
                  }
                  .main-calendar .react-calendar__tile--active {
                    background-color: #0f172a !important;
                    border-color: #eab308 !important;
                    border-width: 2px !important;
                  }
                  .main-calendar .react-calendar__tile--now {
                    background-color: #451a03 !important;
                    border-color: #fbbf24 !important;
                    border-width: 2px !important;
                  }
                  .main-calendar .react-calendar__month-view__weekdays {
                    font-size: 0.875rem !important;
                    font-weight: 600 !important;
                    color: #cbd5e1 !important;
                    text-transform: uppercase !important;
                    background-color: #0f172a !important;
                    padding: 1rem 0 !important;
                    border-bottom: 1px solid #334155 !important;
                  }
                  .main-calendar .react-calendar__month-view__weekdays__weekday {
                    padding: 0.75rem 1rem !important;
                    text-align: center !important;
                  }
                  .main-calendar .react-calendar__tile abbr {
                    text-decoration: none !important;
                    font-weight: 600 !important;
                    color: #f1f5f9 !important;
                    font-size: 1rem !important;
                  }
                    color: #1f2937 !important;
                    font-size: 1rem !important;
                  }
                `}</style>
                
                <div className="main-calendar">
                  <Calendar
                    value={selectedDate}
                    onChange={setSelectedDate}
                    activeStartDate={calendarDate}
                    onActiveStartDateChange={({ activeStartDate }) => setCalendarDate(activeStartDate)}
                    tileContent={({ date, view }) => {
                      if (view === 'month') {
                        const schedules = getSchedulesForDate(date);
                        return (
                          <div className="mt-2">
                            {schedules.slice(0, 3).map((schedule, index) => {
                              const time = new Date(schedule.sendAt);
                              return (
                                <div
                                  key={index}
                                  className={`text-xs p-1 mb-1 rounded text-white truncate cursor-pointer ${
                                    schedule.status === 'pending' ? 'bg-amber-500 hover:bg-amber-600' :
                                    schedule.status === 'sent' ? 'bg-green-500 hover:bg-green-600' :
                                    schedule.status === 'failed' ? 'bg-red-500 hover:bg-red-600' :
                                    'bg-blue-500 hover:bg-blue-600'
                                  }`}
                                  onClick={() => setEditingItem(schedule)}
                                  title={`${time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${schedule.Contact?.name || schedule.to}`}
                                >
                                  {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {schedule.Contact?.name || schedule.to.split('@')[0]}
                                </div>
                              );
                            })}
                            {schedules.length > 3 && (
                              <div className="text-xs text-gray-500 font-medium">
                                +{schedules.length - 3} mais
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                    tileClassName={tileClassName}
                    locale="pt-BR"
                    showNavigation={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // List View - Modern Cards Layout
        <div className="space-y-4">
        {loading && (
          <div className="p-6 border border-slate-700 bg-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
              <span className="text-yellow-400 text-sm">Carregando agendamentos...</span>
            </div>
          </div>
        )}
        
        {items.length > 0 ? (
          <div className="grid gap-4">
            {items.map(item => {
              const sendDate = new Date(item.sendAt);
              const now = new Date();
              const isOverdue = sendDate < now && item.status === 'pending';
              
              return (
                <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
                  <div className="flex items-start justify-between">
                    {/* Content Section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${
                          item.type === 'media' ? 'bg-purple-900/20 text-purple-400' : 'bg-blue-900/20 text-blue-400'
                        }`}>
                          {item.type === 'media' ? (
                            <PhotoIcon className="w-5 h-5" />
                          ) : (
                            <DocumentTextIcon className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {item.type === 'media' ? 'Envio de Mídia' : 'Mensagem de Texto'}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <ClockIcon className="w-4 h-4" />
                            {sendDate.toLocaleDateString('pt-BR')} às {sendDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {isOverdue && (
                              <span className="px-2 py-0.5 bg-red-900/20 text-red-400 text-xs rounded-full border border-red-500">
                                Atrasado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {item.text && (
                        <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
                          <p className="text-slate-300 text-sm line-clamp-2">{item.text}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Para:</span>
                          <span className="text-white font-medium">{item.Contact?.name || item.to.split('@')[0]}</span>
                          <span className="text-slate-500 font-mono text-xs">{item.to}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status and Actions */}
                    <div className="flex flex-col items-end gap-3 ml-6">
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(item.status)}
                        {item.attempts > 0 && item.status === 'failed' && (
                          <div className="text-xs text-red-400">
                            {item.attempts} tentativa{item.attempts > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setEditingItem(item)}
                              className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-slate-700 rounded-lg transition-colors"
                              title="Editar agendamento"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSendNow(item.id)}
                              className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-700 rounded-lg transition-colors"
                              title="Enviar agora"
                            >
                              <PaperAirplaneIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCancel(item.id)}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                              title="Cancelar agendamento"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-medium text-white">Nenhum agendamento encontrado</h3>
            <p className="mt-2 text-sm text-slate-400">
              {statusFilter || q 
                ? 'Tente ajustar os filtros de busca.' 
                : 'Comece criando seu primeiro agendamento.'
              }
            </p>
            {!statusFilter && !q && (
              <button
                onClick={() => setOpenCreate(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-medium rounded-lg transition-all duration-200"
              >
                <PlusIcon className="w-5 h-5" />
                Criar Agendamento
              </button>
            )}
          </div>
        )}
        </div>
      )}

      {/* Modals */}
      <ScheduleCreateModal 
        isOpen={openCreate} 
        onClose={() => setOpenCreate(false)} 
        onCreated={() => load()} 
      />
      
      {editingItem && (
        <ScheduleEditModal 
          isOpen={true}
          item={editingItem}
          onClose={() => setEditingItem(null)} 
          onUpdated={() => load()} 
        />
      )}
    </div>
  );
}