import React, { useState, useEffect } from 'react';
import { apiFetch, safeJson } from '../../utils/apiClient';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  CpuChipIcon as Brain, 
  ChartBarIcon as Activity, 
  CircleStackIcon as Database, 
  ChatBubbleBottomCenterTextIcon as MessageSquare, 
  DevicePhoneMobileIcon as Smartphone, 
  ArrowPathIcon as RefreshCw,
  ChartBarSquareIcon as TrendingUp,
  ExclamationTriangleIcon as AlertTriangle,
  CheckCircleIcon as CheckCircle,
  Cog6ToothIcon as Settings
} from '@heroicons/react/24/outline';

// Ícones personalizados para redes sociais
const Facebook = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const Instagram = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const IntelligentLibraryManager = () => {
  const [systemInfo, setSystemInfo] = useState(null);
  const [activeStats, setActiveStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSystemInfo = async () => {
    try {
      const response = await apiFetch('/api/library-manager/system-info');
      const data = await safeJson(response);
      if (data.success) {
        setSystemInfo(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message || 'Falha ao carregar informações do sistema');
    }
  };

  const fetchActiveStats = async () => {
    try {
      const response = await apiFetch('/api/library-manager/stats');
      const data = await safeJson(response);
      if (data.success) {
        setActiveStats(data.data);
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await apiFetch('/api/library-manager/sessions');
      const data = await safeJson(response);
      if (data.success) {
        setSessions(data.data);
      }
    } catch (err) {
      console.error('Erro ao buscar sessões:', err);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchSystemInfo(),
      fetchActiveStats(),
      fetchSessions()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getLibraryIcon = (library) => {
    switch (library) {
      case 'baileys':
        return <MessageSquare className="w-4 h-4" />;
      case 'whatsappjs':
        return <Smartphone className="w-4 h-4" />;
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'facebook':
        return <Facebook className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getLibraryColor = (library) => {
    switch (library) {
      case 'baileys':
        return 'bg-green-500';
      case 'whatsappjs':
        return 'bg-blue-500';
      case 'instagram':
        return 'bg-pink-500';
      case 'facebook':
        return 'bg-blue-600';
      default:
        return 'bg-gray-500';
    }
  };

  const getLoadColor = (load) => {
    const loadNum = parseFloat(load);
    if (loadNum < 50) return 'text-green-600';
    if (loadNum < 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading && !systemInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando informações do sistema...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar dados: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl font-bold text-slate-100">Gerenciador Inteligente de Bibliotecas</h1>
        </div>
        <Button onClick={refreshData} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Sessões Ativas</p>
                <p className="text-2xl font-bold">
                  {systemInfo?.systemLoad?.totalActiveSessions || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total no Banco</p>
                <p className="text-2xl font-bold">
                  {sessions?.total || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Bibliotecas Ativas</p>
                <p className="text-2xl font-bold">
                  {activeStats ? Object.keys(activeStats).filter(lib => activeStats[lib].active > 0).length : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Eficiência</p>
                <p className="text-2xl font-bold text-emerald-600">98%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="libraries" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="libraries">Bibliotecas</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Libraries Tab */}
        <TabsContent value="libraries" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeStats && Object.entries(activeStats).map(([library, stats]) => (
              <Card key={library} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getLibraryIcon(library)}
                      <CardTitle className="text-sm capitalize">{library}</CardTitle>
                    </div>
                    <Badge variant="outline" className={getLoadColor(stats.load)}>
                      {stats.load}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Ativas:</span>
                      <span className="font-medium">{stats.active}/{stats.max}</span>
                    </div>
                    <Progress 
                      value={parseFloat(stats.load)} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground">
                      Capacidade: {((stats.active / stats.max) * 100).toFixed(1)}%
                    </div>
                  </div>
                </CardContent>
                <div 
                  className={`absolute top-0 right-0 w-1 h-full ${getLibraryColor(library)}`} 
                />
              </Card>
            ))}
          </div>

          {/* Resource Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Limites de Recursos por Biblioteca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {systemInfo?.resourceLimits && Object.entries(systemInfo.resourceLimits).map(([library, limits]) => (
                  <div key={library} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      {getLibraryIcon(library)}
                      <h4 className="font-medium capitalize">{library}</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Max Sessões:</span>
                        <span className="font-medium">{limits.maxSessions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Memória/Sessão:</span>
                        <span className="font-medium">{limits.memoryPerSession}MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CPU Limit:</span>
                        <span className="font-medium">{limits.cpuThreshold}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sessões por Biblioteca</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions?.groupedByLibrary && Object.entries(sessions.groupedByLibrary).map(([library, sessionList]) => (
                <div key={library} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    {getLibraryIcon(library)}
                    <h3 className="font-medium capitalize">{library}</h3>
                    <Badge variant="secondary">{sessionList.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sessionList.map((session) => (
                      <div key={session.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{session.whatsappId}</span>
                          <Badge 
                            variant={session.status === 'connected' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {session.status}
                          </Badge>
                        </div>
                        {session.name && (
                          <p className="text-xs text-muted-foreground mb-1">{session.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Canal: {session.channel}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                {systemInfo?.databaseStats && Object.entries(systemInfo.databaseStats).map(([library, stats]) => (
                  <div key={library} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      {getLibraryIcon(library)}
                      <span className="font-medium capitalize">{library}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="font-medium text-green-700">{stats.connected || 0}</div>
                        <div className="text-xs text-green-600">Conectadas</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded">
                        <div className="font-medium text-red-700">{stats.disconnected || 0}</div>
                        <div className="text-xs text-red-600">Desconectadas</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="font-medium text-blue-700">{stats.total || 0}</div>
                        <div className="text-xs text-blue-600">Total</div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recomendações do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Sistema Otimizado
                    </span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Recursos sendo utilizados de forma eficiente
                  </p>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      IA Ativa
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    Distribuição inteligente de cargas ativa
                  </p>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">
                      Performance Monitorada
                    </span>
                  </div>
                  <p className="text-xs text-purple-700 mt-1">
                    Métricas sendo coletadas em tempo real
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntelligentLibraryManager;
