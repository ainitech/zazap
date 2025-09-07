import React from 'react';
import PageLayout from '../components/PageLayout';
import DeviceManager from '../components/security/DeviceManager';

const SecurityPage = () => {
  return (
    <PageLayout title="Configurações de Segurança" subtitle="Gerencie a segurança da sua conta">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        
        {/* Informações Gerais */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Sistema de Autenticação Seguro
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  ✅ Tokens de acesso com expiração curta (15 minutos)<br/>
                  ✅ Refresh tokens seguros armazenados em cookies httpOnly<br/>
                  ✅ Renovação automática de sessão<br/>
                  ✅ Controle de dispositivos conectados
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gerenciador de Dispositivos */}
        <DeviceManager />

        {/* Dicas de Segurança */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dicas de Segurança</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Não compartilhe suas credenciais</h4>
                <p className="text-gray-600 text-sm">Nunca compartilhe seu email e senha com outras pessoas.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Monitore dispositivos conectados</h4>
                <p className="text-gray-600 text-sm">Verifique regularmente os dispositivos conectados e desconecte os que não reconhecer.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Faça logout em dispositivos públicos</h4>
                <p className="text-gray-600 text-sm">Sempre faça logout quando usar computadores públicos ou compartilhados.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Sessões expiram automaticamente</h4>
                <p className="text-gray-600 text-sm">Para sua segurança, as sessões expiram automaticamente após 7 dias de inatividade.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </PageLayout>
  );
};

export default SecurityPage;
