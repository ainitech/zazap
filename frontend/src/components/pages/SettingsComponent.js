import React, { useState, useEffect, useRef } from 'react';
import { 
  Cog6ToothIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  ServerIcon,
  UserGroupIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  TrashIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export default function SettingsComponent() {
  const { user } = useAuth();
  const { 
    settings, 
    loading: settingsLoading, 
    updateSetting, 
    uploadLogo, 
    removeLogo, 
    getSetting, 
    getLogoUrl 
  } = useSettings();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [formValues, setFormValues] = useState({});
  const fileInputRef = useRef(null);

  // Configurações de grupos
  const [groupSettings, setGroupSettings] = useState({
    showGroups: false, // Desativado por padrão
    showIndividuals: true,
    groupNotifications: true,
    autoJoinGroups: false,
    groupAdminOnly: false
  });

  // Persistência em localStorage removida por motivos de segurança / política
  useEffect(() => {
    // Poderia buscar do backend futuramente
  }, []);

  // Salvar configurações (apenas em memória agora)
  const saveGroupSettings = (newSettings) => {
    const oldShowGroups = groupSettings.showGroups;
    setGroupSettings(newSettings);
    if (oldShowGroups !== newSettings.showGroups) {
      window.dispatchEvent(new CustomEvent('groupSettingsChanged', { detail: { showGroups: newSettings.showGroups } }));
    }
    showMessage('Configurações de grupos atualizadas (não persistidas).');
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: UserIcon },
    { id: 'appearance', label: 'Aparência', icon: PaintBrushIcon },
    { id: 'groups', label: 'Grupos', icon: UserGroupIcon },
    { id: 'notifications', label: 'Notificações', icon: BellIcon },
    { id: 'security', label: 'Segurança', icon: ShieldCheckIcon },
    { id: 'system', label: 'Sistema', icon: ServerIcon }
  ];

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  // Função para upload de logo
  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      showMessage('Por favor, selecione apenas arquivos de imagem.', 'error');
      return;
    }

    // Validar tamanho (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('O arquivo deve ter no máximo 5MB.', 'error');
      return;
    }

    try {
      setLogoUploading(true);
      await uploadLogo(file);
      showMessage('Logo atualizado com sucesso!');
    } catch (error) {
      showMessage('Erro ao fazer upload do logo: ' + error.message, 'error');
    } finally {
      setLogoUploading(false);
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Função para remover logo
  const handleLogoRemove = async () => {
    if (!window.confirm('Tem certeza que deseja remover o logo?')) {
      return;
    }

    try {
      setLogoUploading(true);
      await removeLogo();
      showMessage('Logo removido com sucesso!');
    } catch (error) {
      showMessage('Erro ao remover logo: ' + error.message, 'error');
    } finally {
      setLogoUploading(false);
    }
  };

  // Função para atualizar configurações de aparência
  const handleAppearanceUpdate = async (key, value) => {
    try {
      console.log(`🎨 Atualizando ${key} para:`, value);
      await updateSetting(key, value);
      showMessage('Configuração atualizada com sucesso!');
    } catch (error) {
      showMessage('Erro ao atualizar configuração: ' + error.message, 'error');
    }
  };

  // Função com debounce para atualizações automáticas
  const debouncedUpdate = useRef(null);
  const handleInputChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
    
    // Cancelar timeout anterior
    if (debouncedUpdate.current) {
      clearTimeout(debouncedUpdate.current);
    }
    
    // Agendar nova atualização
    debouncedUpdate.current = setTimeout(() => {
      handleAppearanceUpdate(key, value);
    }, 1000); // 1 segundo de delay
  };

  // Limpar timeout ao desmontar componente
  useEffect(() => {
    return () => {
      if (debouncedUpdate.current) {
        clearTimeout(debouncedUpdate.current);
      }
    };
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informações do Perfil</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    defaultValue={user?.name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    defaultValue={user?.email || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => showMessage('Perfil atualizado com sucesso!')}
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações de Notificação</h3>
              <div className="space-y-4">
                {['Notificações por email', 'Notificações push', 'Alertas de novos tickets'].map((setting) => (
                  <div key={setting} className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-700">{setting}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
                <div className="mt-4">
                  <button
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                    onClick={async () => {
                      try {
                        if (!window.zazapSubscribeToPush) {
                          showMessage('Registro de notificações não disponível.', 'error');
                          return;
                        }
                        await window.zazapSubscribeToPush();
                        showMessage('Inscrição push registrada com sucesso!');
                      } catch (err) {
                        showMessage(err.message || 'Falha ao registrar push', 'error');
                      }
                    }}
                  >
                    Ativar Push
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'groups':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações de Grupos</h3>
              <div className="space-y-6">
                
                {/* Visibilidade */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Visibilidade</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Mostrar grupos</span>
                        <p className="text-xs text-gray-500">Exibir conversas de grupos na lista de contatos</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={groupSettings.showGroups}
                          onChange={(e) => saveGroupSettings({...groupSettings, showGroups: e.target.checked})}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Mostrar contatos individuais</span>
                        <p className="text-xs text-gray-500">Exibir conversas individuais na lista de contatos</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={groupSettings.showIndividuals}
                          onChange={(e) => saveGroupSettings({...groupSettings, showIndividuals: e.target.checked})}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Notificações */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Notificações</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Notificações de grupos</span>
                        <p className="text-xs text-gray-500">Receber notificações de mensagens em grupos</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={groupSettings.groupNotifications}
                          onChange={(e) => saveGroupSettings({...groupSettings, groupNotifications: e.target.checked})}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Comportamento */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Comportamento</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Aceitar convites automaticamente</span>
                        <p className="text-xs text-gray-500">Entrar automaticamente em grupos quando adicionado</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={groupSettings.autoJoinGroups}
                          onChange={(e) => saveGroupSettings({...groupSettings, autoJoinGroups: e.target.checked})}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Somente administradores</span>
                        <p className="text-xs text-gray-500">Responder apenas a mensagens de administradores em grupos</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={groupSettings.groupAdminOnly}
                          onChange={(e) => saveGroupSettings({...groupSettings, groupAdminOnly: e.target.checked})}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Filtros */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-md font-medium text-blue-900 mb-3">Informação</h4>
                  <p className="text-sm text-blue-700">
                    Quando os grupos estão habilitados, uma nova aba "Grupos" aparecerá na lista de conversas. 
                    Quando desabilitados, todos os grupos desaparecerão da interface.
                  </p>
                </div>

              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Alterar Senha</h3>
              <div className="space-y-4 max-w-md">
                <input
                  type="password"
                  placeholder="Senha atual"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="password"
                  placeholder="Nova senha"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="password"
                  placeholder="Confirmar nova senha"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Alterar Senha
                </button>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações de Aparência</h3>
              
              {/* Logo do Sistema */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-4">Logo da Empresa</h4>
                <div className="space-y-4">
                  {/* Preview do Logo */}
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                      {getLogoUrl() ? (
                        <img 
                          src={getLogoUrl()} 
                          alt="Logo da empresa" 
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <PhotoIcon className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-2">
                        Logo atual da empresa. Este logo aparecerá na tela de login, barra de menu e PWA.
                      </p>
                      <p className="text-xs text-gray-500">
                        Formatos suportados: JPEG, PNG, GIF, WebP. Tamanho máximo: 5MB.
                      </p>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={logoUploading}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {logoUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                          {getLogoUrl() ? 'Alterar Logo' : 'Enviar Logo'}
                        </>
                      )}
                    </button>
                    
                    {getLogoUrl() && (
                      <button
                        onClick={handleLogoRemove}
                        disabled={logoUploading}
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        Remover Logo
                      </button>
                    )}
                  </div>

                  {/* Input de arquivo oculto */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Nome da Empresa */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-4">Informações da Empresa</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Empresa</label>
                    <input
                      type="text"
                      value={formValues.company_name ?? getSetting('company_name', 'Zazap')}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome da sua empresa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Título do Sistema</label>
                    <input
                      type="text"
                      value={formValues.system_title ?? getSetting('system_title', 'Zazap - Sistema de Atendimento')}
                      onChange={(e) => handleInputChange('system_title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Título que aparece no sistema"
                    />
                  </div>
                </div>
              </div>

              {/* Cor Primária */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-4">Cores do Sistema</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cor Primária</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={formValues.primary_color ?? getSetting('primary_color', '#eab308')}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        className="color-picker"
                      />
                      <input
                        type="text"
                        value={formValues.primary_color ?? getSetting('primary_color', '#eab308')}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="#eab308"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Cor principal usada em botões e destaques</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Em desenvolvimento</h3>
            <p className="mt-1 text-sm text-gray-500">Esta seção estará disponível em breve.</p>
          </div>
        );
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-1">Gerencie suas preferências e configurações do sistema</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg flex items-center space-x-2 ${
          messageType === 'error' 
            ? 'bg-red-50 border border-red-200 text-red-700' 
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {messageType === 'error' ? (
            <ExclamationTriangleIcon className="h-5 w-5" />
          ) : (
            <CheckIcon className="h-5 w-5" />
          )}
          <span>{message}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
