import React, { useState, useEffect, createContext, useContext } from 'react';
import { apiFetch } from '../utils/apiClient';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({});
  const [publicSettings, setPublicSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar configurações públicas (sem autenticação)
  const loadPublicSettings = async () => {
    try {
      const response = await apiFetch('/api/settings/public');
      if (response.ok) {
        const data = await response.json();
        setPublicSettings(data);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações públicas:', err);
    }
  };

  // Carregar todas as configurações (com autenticação)
  const loadSettings = async () => {
    try {
      setLoading(true);
      
      console.log('🔧 SettingsContext: Carregando configurações...');
      
      // Tentar carregar configurações autenticadas primeiro
      try {
        const response = await apiFetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          console.log('🔧 SettingsContext: Configurações autenticadas carregadas:', data);
          setSettings(data);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (authErr) {
        console.log('🔧 SettingsContext: Falha na autenticação, carregando configurações públicas');
        await loadPublicSettings();
      }
    } catch (err) {
      console.error('❌ SettingsContext: Erro ao carregar configurações:', err);
      setError(err.message);
      await loadPublicSettings();
    } finally {
      setLoading(false);
    }
  };

  // Atualizar uma configuração específica
  const updateSetting = async (key, value) => {
    try {
      console.log(`🔧 SettingsContext: Atualizando ${key} para:`, value);
      
      const response = await apiFetch(`/api/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      
      const settingData = await response.json();
      console.log(`✅ SettingsContext: ${key} atualizado com sucesso:`, settingData);
      
      setSettings(prev => ({
        ...prev,
        [key]: settingData
      }));
      
      // Recarregar configurações para garantir sincronização
      setTimeout(() => loadSettings(), 100);
      
      return settingData;
    } catch (err) {
      console.error(`❌ SettingsContext: Erro ao atualizar ${key}:`, err);
      throw err;
    }
  };

  // Atualizar múltiplas configurações
  const updateSettings = async (newSettings) => {
    try {
      const response = await apiFetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      
      const updatedSettings = await response.json();
      setSettings(prev => ({
        ...prev,
        ...updatedSettings
      }));
      return updatedSettings;
    } catch (err) {
      console.error('Erro ao atualizar configurações:', err);
      throw err;
    }
  };

  // Upload de logo
  const uploadLogo = async (file) => {
    try {
      const { apiUrl } = await import('../utils/apiClient');
      const formData = new FormData();
      formData.append('logo', file);

      // Usar fetch com credentials para incluir cookies automaticamente
      const response = await fetch(apiUrl('/api/settings/logo/upload'), {
        method: 'POST',
        credentials: 'include', // Incluir cookies automaticamente
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ SettingsContext: Logo enviado com sucesso:', result);
        // Atualizar configuração do logo
        setSettings(prev => ({
          ...prev,
          system_logo: {
            ...prev.system_logo,
            value: result.filename
          }
        }));
        return result;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer upload do logo');
      }
    } catch (err) {
      console.error('❌ SettingsContext: Erro ao fazer upload do logo:', err);
      throw err;
    }
  };

  // Remover logo
  const removeLogo = async () => {
    try {
      const response = await apiFetch('/api/settings/logo', {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      
      setSettings(prev => ({
        ...prev,
        system_logo: {
          ...prev.system_logo,
          value: ''
        }
      }));
      return true;
    } catch (err) {
      console.error('Erro ao remover logo:', err);
      throw err;
    }
  };

  // Obter valor de uma configuração
  const getSetting = (key, defaultValue = null) => {
    const setting = settings[key] || publicSettings[key];
    const value = setting ? setting.value : defaultValue;
    console.log(`🔧 getSetting(${key}):`, value);
    return value;
  };

  // Obter URL do logo
  const getLogoUrl = () => {
    const logoFilename = getSetting('system_logo');
    if (!logoFilename) return null;
    
    // Usar a URL base da API
    const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    return `${baseUrl}/uploads/${logoFilename}`;
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Recarregar configurações quando o estado de autenticação mudar
  useEffect(() => {
    const handleAuthChange = () => {
      console.log('🔧 SettingsContext: Estado de autenticação mudou, recarregando configurações');
      loadSettings();
    };

    // Escutar eventos de mudança de autenticação
    window.addEventListener('authStateChanged', handleAuthChange);
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  const value = {
    settings,
    publicSettings,
    loading,
    error,
    loadSettings,
    loadPublicSettings,
    updateSetting,
    updateSettings,
    uploadLogo,
    removeLogo,
    getSetting,
    getLogoUrl
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
