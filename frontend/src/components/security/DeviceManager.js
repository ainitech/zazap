import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const DeviceManager = () => {
  const { getActiveDevices, logoutAll } = useAuth();
  const { addToast } = useToast();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const deviceList = await getActiveDevices();
      setDevices(deviceList);
    } catch (error) {
      addToast('Erro ao carregar dispositivos', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    if (window.confirm('Tem certeza que deseja desconectar de todos os dispositivos? Você precisará fazer login novamente.')) {
      try {
        await logoutAll();
        addToast('Desconectado de todos os dispositivos', { type: 'success' });
      } catch (error) {
        addToast('Erro ao desconectar dispositivos', { type: 'error' });
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getUserAgent = (userAgent) => {
    if (!userAgent) return 'Dispositivo desconhecido';
    
    // Simplificar user agent para mostrar informações relevantes
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Mobile')) return 'Dispositivo móvel';
    
    return 'Navegador desconhecido';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dispositivos Conectados</h3>
        <div className="animate-pulse">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Dispositivos Conectados</h3>
        {devices.length > 1 && (
          <button
            onClick={handleLogoutAll}
            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
          >
            Desconectar Todos
          </button>
        )}
      </div>

      {devices.length === 0 ? (
        <p className="text-gray-500">Nenhum dispositivo ativo encontrado.</p>
      ) : (
        <div className="space-y-3">
          {devices.map((device, index) => (
            <div
              key={device.id}
              className={`p-4 rounded-lg border ${
                index === 0 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">
                      {getUserAgent(device.userAgent)}
                    </h4>
                    {index === 0 && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Atual
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    IP: {device.ipAddress || 'Não disponível'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Conectado em: {formatDate(device.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <p className="text-xs text-gray-500 mt-1">Ativo</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>
          💡 <strong>Dica de Segurança:</strong> Se você não reconhece algum dispositivo, 
          use "Desconectar Todos" para revogar o acesso.
        </p>
      </div>
    </div>
  );
};

export default DeviceManager;
