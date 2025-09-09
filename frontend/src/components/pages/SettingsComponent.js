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

  // Estados para alteração de perfil
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);

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
    // Carregar dados do usuário no formulário
    if (user) {
      setProfileData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

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
    { id: 'chat', label: 'Chat', icon: Cog6ToothIcon },
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

  // ====== CHAT SETTINGS HANDLERS ======
  const chatSettingValue = (key, def='') => (settings[key]?.value ?? def);
  const [chatForm, setChatForm] = useState({
    attendantIntro: '',
    protocolEnabled: true,
    farewellTemplate: '',
    npsEnabled: true,
    npsRequest: ''
  });

  useEffect(() => {
    setChatForm({
      attendantIntro: chatSettingValue('chat_attendant_intro_template','Olá! Meu nome é {nome} e vou continuar seu atendimento. Como posso ajudar?'),
      protocolEnabled: (chatSettingValue('chat_protocol_enabled','true') === 'true' || chatSettingValue('chat_protocol_enabled','true') === '1'),
      farewellTemplate: chatSettingValue('chat_farewell_template','Atendimento encerrado.{protocoloParte}'),
      npsEnabled: (chatSettingValue('chat_nps_enabled','true') === 'true' || chatSettingValue('chat_nps_enabled','true') === '1'),
      npsRequest: chatSettingValue('chat_nps_request_template','Sua opinião é muito importante! Responda com uma nota de 0 a 10: quanto você recomendaria nosso atendimento?')
    });
  }, [settings]);

  const handleChatFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setChatForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const saveChatSettings = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await Promise.all([
        updateSetting('chat_attendant_intro_template', chatForm.attendantIntro),
        updateSetting('chat_protocol_enabled', chatForm.protocolEnabled ? 'true' : 'false'),
        updateSetting('chat_farewell_template', chatForm.farewellTemplate),
        updateSetting('chat_nps_enabled', chatForm.npsEnabled ? 'true' : 'false'),
        updateSetting('chat_nps_request_template', chatForm.npsRequest)
      ]);
      showMessage('Configurações de chat salvas.');
    } catch (err) {
      console.error(err);
      showMessage('Erro ao salvar configurações de chat.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar dados do perfil
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    if (!profileData.name.trim()) {
      showMessage('Nome é obrigatório.', 'error');
      return;
    }

    if (!profileData.email.trim()) {
      showMessage('Email é obrigatório.', 'error');
      return;
    }

    try {
      setProfileLoading(true);
      
      const updateData = {
        name: profileData.name.trim(),
        email: profileData.email.trim()
      };

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const result = await response.json();
        showMessage('Perfil atualizado com sucesso!');
        
        // Atualizar contexto de auth se disponível
        // window.location.reload(); // Opcional para recarregar dados
      } else {
        const error = await response.json();
        showMessage(error.message || 'Erro ao atualizar perfil.', 'error');
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      showMessage('Erro ao conectar com o servidor.', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // Função para alterar senha
  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (!profileData.currentPassword) {
      showMessage('Senha atual é obrigatória.', 'error');
      return;
    }

    if (!profileData.newPassword) {
      showMessage('Nova senha é obrigatória.', 'error');
      return;
    }

    if (profileData.newPassword.length < 6) {
      showMessage('Nova senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }

    if (profileData.newPassword !== profileData.confirmPassword) {
      showMessage('Confirmação de senha não confere.', 'error');
      return;
    }

    try {
      setProfileLoading(true);
      
      const passwordData = {
        currentPassword: profileData.currentPassword,
        newPassword: profileData.newPassword
      };

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(passwordData)
      });

      if (response.ok) {
        showMessage('Senha alterada com sucesso!');
        setProfileData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        const error = await response.json();
        showMessage(error.message || 'Erro ao alterar senha.', 'error');
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      showMessage('Erro ao conectar com o servidor.', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // Função para upload de logo
  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validação mais flexível - aceitar qualquer arquivo de imagem
    const validImageTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 
      'image/bmp', 'image/svg+xml', 'image/tiff', 'image/ico', 'image/heic'
    ];
    
    const isValidImage = file.type.startsWith('image/') || validImageTypes.includes(file.type);
    
    if (!isValidImage) {
      showMessage('Por favor, selecione um arquivo de imagem válido.', 'error');
      return;
    }

    // Validar tamanho aumentado para 10MB para aceitar imagens maiores
    if (file.size > 10 * 1024 * 1024) {
      showMessage('O arquivo deve ter no máximo 10MB.', 'error');
      return;
    }

    try {
      setLogoUploading(true);
      await uploadLogo(file);
      showMessage('Logo atualizado com sucesso! O sistema ajustou automaticamente o tamanho e qualidade.');
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
          <div className="space-y-8">
            {/* Informações do Perfil */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informações do Perfil</h3>
              <form onSubmit={handleProfileUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {profileLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Alteração de Senha */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Alterar Senha</h3>
              <form onSubmit={handlePasswordChange}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual *</label>
                    <input
                      type="password"
                      value={profileData.currentPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite sua senha atual"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha *</label>
                      <input
                        type="password"
                        value={profileData.newPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Digite a nova senha"
                        minLength="6"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha *</label>
                      <input
                        type="password"
                        value={profileData.confirmPassword}
                        onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Confirme a nova senha"
                        minLength="6"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {profileLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Alterando...
                      </>
                    ) : (
                      'Alterar Senha'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Informações da Conta */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informações da Conta</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">ID do Usuário:</span>
                  <span className="ml-2 text-gray-600">{user?.id}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Criado em:</span>
                  <span className="ml-2 text-gray-600">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Último acesso:</span>
                  <span className="ml-2 text-gray-600">
                    {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString('pt-BR') : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="ml-2 text-green-600 font-medium">Ativo</span>
                </div>
              </div>
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

      case 'chat':
        return (
          <form onSubmit={saveChatSettings} className="space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Configurações de Chat</h3>
              <p className="text-sm text-gray-500">Personalize mensagens automáticas e coleta de feedback.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Template de Apresentação</label>
                <textarea
                  name="attendantIntro"
                  value={chatForm.attendantIntro}
                  onChange={handleChatFormChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500">Variáveis: {'{nome}'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Template de Despedida</label>
                <textarea
                  name="farewellTemplate"
                  value={chatForm.farewellTemplate}
                  onChange={handleChatFormChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500">Variáveis: {'{protocolo} {protocoloParte}'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Pergunta NPS</label>
                <textarea
                  name="npsRequest"
                  value={chatForm.npsRequest}
                  onChange={handleChatFormChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={!chatForm.npsEnabled}
                />
                <p className="text-xs text-gray-500">Usada se coleta de NPS estiver habilitada.</p>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <input
                  id="protocolEnabled"
                  name="protocolEnabled"
                  type="checkbox"
                  checked={chatForm.protocolEnabled}
                  onChange={handleChatFormChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="protocolEnabled" className="text-sm font-medium text-gray-700">Gerar protocolo</label>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <input
                  id="npsEnabled"
                  name="npsEnabled"
                  type="checkbox"
                  checked={chatForm.npsEnabled}
                  onChange={handleChatFormChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="npsEnabled" className="text-sm font-medium text-gray-700">Coletar NPS</label>
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
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
                        Logo da empresa. Este logo aparecerá na tela de login, barra de menu e PWA.
                      </p>
                      <p className="text-xs text-gray-500">
                        Aceita qualquer formato de imagem (JPEG, PNG, GIF, WebP, BMP, SVG, etc.). 
                        O sistema ajusta automaticamente o tamanho e qualidade. Máximo: 10MB.
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
                    accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.tiff,.ico,.heic"
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
