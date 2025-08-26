import React from 'react';
import {
  XMarkIcon,
  ChartBarIcon,
  UsersIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CalendarDaysIcon,
  EyeIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

const CampaignStatsModal = ({ campaign, isOpen, onClose }) => {
  if (!isOpen || !campaign) return null;

  const stats = {
    total: campaign.totalContacts || 0,
    sent: campaign.sentMessages || 0,
    delivered: campaign.deliveredMessages || 0,
    failed: campaign.failedMessages || 0,
    pending: (campaign.totalContacts || 0) - (campaign.sentMessages || 0),
    successRate: campaign.totalContacts > 0 
      ? Math.round(((campaign.deliveredMessages || 0) / campaign.totalContacts) * 100) 
      : 0
  };

  const deliveryRate = campaign.sentMessages > 0 
    ? Math.round(((campaign.deliveredMessages || 0) / campaign.sentMessages) * 100) 
    : 0;

  const progressPercentage = campaign.totalContacts > 0 
    ? Math.round((campaign.sentMessages / campaign.totalContacts) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Estatísticas da Campanha
            </h2>
            <p className="text-gray-400 mt-1">
              {campaign.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-300 hover:bg-slate-700 rounded-lg transition-all"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Cards de Estatísticas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-slate-700 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Total</p>
                  <p className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</p>
                </div>
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <UsersIcon className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-700 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Enviadas</p>
                  <p className="text-2xl font-bold text-white">{stats.sent.toLocaleString()}</p>
                </div>
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <PaperAirplaneIcon className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-700 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Entregues</p>
                  <p className="text-2xl font-bold text-white">{stats.delivered.toLocaleString()}</p>
                </div>
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <CheckCircleIcon className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-700 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Falharam</p>
                  <p className="text-2xl font-bold text-white">{stats.failed.toLocaleString()}</p>
                </div>
                <div className="bg-red-500/20 p-2 rounded-lg">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-700 rounded-xl p-4 border border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">Pendentes</p>
                  <p className="text-2xl font-bold text-white">{stats.pending.toLocaleString()}</p>
                </div>
                <div className="bg-yellow-500/20 p-2 rounded-lg">
                  <ClockIcon className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Taxas e Progresso */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
              <div className="text-center">
                <div className="bg-purple-500/20 p-3 rounded-lg w-fit mx-auto mb-3">
                  <ChartBarIcon className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  Taxa de Sucesso
                </h3>
                <p className="text-3xl font-bold text-purple-400 mb-2">
                  {stats.successRate}%
                </p>
                <p className="text-sm text-gray-400">
                  Mensagens entregues do total
                </p>
              </div>
            </div>

            <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
              <div className="text-center">
                <div className="bg-blue-500/20 p-3 rounded-lg w-fit mx-auto mb-3">
                  <EyeIcon className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  Taxa de Entrega
                </h3>
                <p className="text-3xl font-bold text-blue-400 mb-2">
                  {deliveryRate}%
                </p>
                <p className="text-sm text-gray-400">
                  Entregues das enviadas
                </p>
              </div>
            </div>

            <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
              <div className="text-center">
                <div className="bg-green-500/20 p-3 rounded-lg w-fit mx-auto mb-3">
                  <CalendarDaysIcon className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  Progresso
                </h3>
                <p className="text-3xl font-bold text-green-400 mb-2">
                  {progressPercentage}%
                </p>
                <p className="text-sm text-gray-400">
                  Da campanha concluída
                </p>
              </div>
            </div>
          </div>

          {/* Barra de Progresso Detalhada */}
          <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
            <h3 className="text-lg font-semibold text-white mb-4">
              Progresso Detalhado
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Progresso Geral</span>
                <span className="font-medium text-white">
                  {stats.sent} / {stats.total} ({progressPercentage}%)
                </span>
              </div>
              
              <div className="w-full bg-slate-600 rounded-full h-3">
                <div className="relative h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                  {stats.failed > 0 && (
                    <div
                      className="bg-red-500 h-full absolute top-0"
                      style={{ 
                        left: `${progressPercentage}%`,
                        width: `${Math.min(100 - progressPercentage, (stats.failed / stats.total) * 100)}%`
                      }}
                    ></div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-400">Enviadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-400">Falharam</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
                  <span className="text-gray-400">Pendentes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Informações da Campanha */}
          <div className="bg-slate-700 rounded-xl p-6 border border-slate-600">
            <h3 className="text-lg font-semibold text-white mb-4">
              Informações da Campanha
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Nome da Campanha
                </label>
                <p className="text-white">{campaign.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Status
                </label>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                  campaign.status === 'completed' ? 'bg-green-900/30 text-green-400 border-green-800' :
                  campaign.status === 'sending' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
                  campaign.status === 'failed' ? 'bg-red-900/30 text-red-400 border-red-800' :
                  campaign.status === 'paused' ? 'bg-orange-900/30 text-orange-400 border-orange-800' :
                  'bg-slate-700 text-gray-300 border-slate-600'
                }`}>
                  {campaign.status === 'draft' ? 'Rascunho' :
                   campaign.status === 'scheduled' ? 'Agendado' :
                   campaign.status === 'sending' ? 'Enviando' :
                   campaign.status === 'completed' ? 'Concluído' :
                   campaign.status === 'paused' ? 'Pausado' :
                   campaign.status === 'failed' ? 'Falhou' : campaign.status}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Data de Criação
                </label>
                <p className="text-white">
                  {new Date(campaign.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Sessão WhatsApp
                </label>
                <p className="text-white">
                  {campaign.Session?.whatsappId || 'N/A'}
                </p>
              </div>
              
              {campaign.scheduledAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Agendado para
                  </label>
                  <p className="text-white">
                    {new Date(campaign.scheduledAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Tipo de Segmentação
                </label>
                <p className="text-white">
                  {campaign.segmentationType === 'all' ? 'Todos os contatos' :
                   campaign.segmentationType === 'tags' ? 'Por tags' :
                   campaign.segmentationType === 'manual' ? 'Seleção manual' : 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Mensagem
              </label>
              <div className="bg-slate-600 rounded-lg p-3 border border-slate-500">
                <p className="text-white whitespace-pre-wrap">
                  {campaign.message}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex justify-end p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignStatsModal;
