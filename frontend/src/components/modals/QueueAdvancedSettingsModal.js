import React, { useState } from 'react';
import { 
  Cog6ToothIcon, 
  XMarkIcon,
  ClockIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  CheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const QueueAdvancedSettingsModal = ({ isOpen, onClose, queue, onSave }) => {
  const [settings, setSettings] = useState({
    autoAssignment: queue?.autoAssignment || true,
    maxConcurrentTickets: queue?.maxConcurrentTickets || 5,
    workingHours: queue?.workingHours || {
      enabled: false,
      start: '09:00',
      end: '18:00',
      timezone: 'America/Sao_Paulo'
    },
    escalationRules: queue?.escalationRules || {
      enabled: false,
      timeLimit: 30, // minutos
      escalateTo: 'supervisor'
    },
    autoResponses: queue?.autoResponses || {
      greeting: true,
      awayMessage: true,
      closureMessage: true
    },
    integrationSettings: queue?.integrationSettings || {
      webhookUrl: '',
      enableNotifications: true,
      notificationTypes: ['new_ticket', 'ticket_assigned', 'ticket_resolved']
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSettingChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSave(settings);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="modal-header">
          <h3 className="modal-title">
            <Cog6ToothIcon className="h-5 w-5" />
            Configurações Avançadas - {queue?.name}
          </h3>
          <button onClick={onClose} className="modal-close-btn">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body space-y-6">
          {/* Atribuição Automática */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5" />
              Atribuição de Tickets
            </h4>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.autoAssignment}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoAssignment: e.target.checked }))}
                    className="sr-only"
                  />
                  <div className={`custom-checkbox ${settings.autoAssignment ? 'checked' : ''}`}>
                    {settings.autoAssignment && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <div>
                  <span className="text-gray-700">Atribuição automática de tickets</span>
                  <p className="text-gray-500 text-sm">Distribui automaticamente novos tickets entre agentes disponíveis</p>
                </div>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de tickets simultâneos por agente
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.maxConcurrentTickets}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxConcurrentTickets: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Horário de Funcionamento */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              Horário de Funcionamento
            </h4>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.workingHours.enabled}
                    onChange={(e) => handleSettingChange('workingHours', 'enabled', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`custom-checkbox ${settings.workingHours.enabled ? 'checked' : ''}`}>
                    {settings.workingHours.enabled && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <span className="text-gray-700">Ativar controle de horário de funcionamento</span>
              </label>

              {settings.workingHours.enabled && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Início</label>
                    <input
                      type="time"
                      value={settings.workingHours.start}
                      onChange={(e) => handleSettingChange('workingHours', 'start', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fim</label>
                    <input
                      type="time"
                      value={settings.workingHours.end}
                      onChange={(e) => handleSettingChange('workingHours', 'end', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Regras de Escalação */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ArrowPathIcon className="h-5 w-5" />
              Escalação Automática
            </h4>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.escalationRules.enabled}
                    onChange={(e) => handleSettingChange('escalationRules', 'enabled', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`custom-checkbox ${settings.escalationRules.enabled ? 'checked' : ''}`}>
                    {settings.escalationRules.enabled && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <div>
                  <span className="text-gray-700">Ativar escalação automática</span>
                  <p className="text-gray-500 text-sm">Escala tickets não respondidos após tempo limite</p>
                </div>
              </label>

              {settings.escalationRules.enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tempo limite (minutos)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="480"
                      value={settings.escalationRules.timeLimit}
                      onChange={(e) => handleSettingChange('escalationRules', 'timeLimit', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Escalar para
                    </label>
                    <select
                      value={settings.escalationRules.escalateTo}
                      onChange={(e) => handleSettingChange('escalationRules', 'escalateTo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="supervisor">Supervisor</option>
                      <option value="manager">Gerente</option>
                      <option value="another_queue">Outra fila</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Respostas Automáticas */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              Respostas Automáticas
            </h4>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.autoResponses.greeting}
                    onChange={(e) => handleSettingChange('autoResponses', 'greeting', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`custom-checkbox ${settings.autoResponses.greeting ? 'checked' : ''}`}>
                    {settings.autoResponses.greeting && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <span className="text-gray-700">Mensagem de boas-vindas automática</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.autoResponses.awayMessage}
                    onChange={(e) => handleSettingChange('autoResponses', 'awayMessage', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`custom-checkbox ${settings.autoResponses.awayMessage ? 'checked' : ''}`}>
                    {settings.autoResponses.awayMessage && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <span className="text-gray-700">Mensagem de ausência automática</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.autoResponses.closureMessage}
                    onChange={(e) => handleSettingChange('autoResponses', 'closureMessage', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`custom-checkbox ${settings.autoResponses.closureMessage ? 'checked' : ''}`}>
                    {settings.autoResponses.closureMessage && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <span className="text-gray-700">Mensagem de encerramento automática</span>
              </label>
            </div>
          </div>

          {/* Configurações de Integração */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <InformationCircleIcon className="h-5 w-5" />
              Integrações e Notificações
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL do Webhook (opcional)
                </label>
                <input
                  type="url"
                  value={settings.integrationSettings.webhookUrl}
                  onChange={(e) => handleSettingChange('integrationSettings', 'webhookUrl', e.target.value)}
                  placeholder="https://sua-api.com/webhook"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={settings.integrationSettings.enableNotifications}
                    onChange={(e) => handleSettingChange('integrationSettings', 'enableNotifications', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`custom-checkbox ${settings.integrationSettings.enableNotifications ? 'checked' : ''}`}>
                    {settings.integrationSettings.enableNotifications && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <span className="text-gray-700">Ativar notificações por webhook</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Salvar Configurações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QueueAdvancedSettingsModal;
