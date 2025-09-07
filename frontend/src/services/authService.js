import { API_BASE_URL } from '../utils/apiClient.js';

class AuthService {
  // Cache temporário para evitar múltiplas renovações simultâneas
  static _refreshPromise = null;
  static _tokenExpiry = null;

  // Método para limpar dados de autenticação antigos
  static cleanup() {
    try {
      // Remover dados do sessionStorage se necessário
      sessionStorage.removeItem('user');
      // Limpar cache de token
      this._refreshPromise = null;
      this._tokenExpiry = null;
      console.log('🧹 Dados de autenticação antigos removidos');
    } catch (error) {
      console.error('Erro ao limpar dados antigos:', error);
    }
  }

  // Inicializar o serviço
  static async initialize() {
    try {
      const user = this.getCurrentUser();
      if (!user) return { success: false };
      // Se temos user e não temos expiração cacheada, tentamos um refresh silencioso
      if (!this._tokenExpiry) {
        try {
          await this.refreshToken();
          return { success: true, user };
        } catch (e) {
          // Falhou refresh silencioso; limpar user
          sessionStorage.removeItem('user');
          return { success: false };
        }
      }
      return { success: true, user };
    } catch (e) {
      return { success: false };
    }
  }

  // Fazer login
  static async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Para incluir cookies httpOnly
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao fazer login');
      }

      const { user, accessToken } = await response.json();
      
      // Armazenar dados do usuário em sessionStorage (mais seguro que localStorage)
      sessionStorage.setItem('user', JSON.stringify(user));
      
      // Cachear tempo de expiração do token (para evitar renovações desnecessárias)
      this._setTokenExpiry(accessToken);
      
      console.log('✅ Login realizado com sucesso');
      return { user, accessToken };
    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error;
    }
  }

  // Fazer logout
  static async logout() {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Erro ao fazer logout no servidor:', error);
    } finally {
      // Limpar dados locais
      sessionStorage.removeItem('user');
      this._refreshPromise = null;
      this._tokenExpiry = null;
      console.log('🚪 Logout realizado');
    }
  }

  // Renovar token de acesso (com cache para evitar renovações simultâneas)
  static async refreshToken() {
    // Se já há uma renovação em andamento, aguardar ela
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    // Criar promise de renovação
    this._refreshPromise = this._doRefreshToken();
    
    try {
      const result = await this._refreshPromise;
      return result;
    } finally {
      // Limpar cache após completar
      this._refreshPromise = null;
    }
  }

  // Método interno para renovação
  static async _doRefreshToken() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Token inválido ou expirado');
      }

      const { accessToken } = await response.json();
      
      // Cachear tempo de expiração
      this._setTokenExpiry(accessToken);
      
      console.log('🔄 Token renovado com sucesso');
      return accessToken;
    } catch (error) {
      console.error('❌ Erro ao renovar token:', error);
      // Limpar dados se refresh falhou
      sessionStorage.removeItem('user');
      this._refreshPromise = null;
      this._tokenExpiry = null;
      throw error;
    }
  }

  // Obter usuário atual
  static getCurrentUser() {
    try {
      const userStr = sessionStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Erro ao obter usuário:', error);
      return null;
    }
  }

  // Verificar se usuário está autenticado
  static isAuthenticated() {
    return this.getCurrentUser() !== null;
  }

  // Obter token de acesso atual (compatibilidade com SocketContext)
  static getAccessToken() {
    // Sempre retorna null - forçando uso de cookies httpOnly
    return null;
  }

  // Definir token de acesso (compatibilidade com SocketContext)
  static setAccessToken(token) {
    // Não faz nada - tokens são gerenciados via cookies httpOnly
    console.log('🔒 Token gerenciado via cookies seguros');
  }

  // Verificar se token está próximo do vencimento
  static _isTokenExpiringSoon() {
    if (!this._tokenExpiry) return true;
    const now = Date.now();
    const timeUntilExpiry = this._tokenExpiry - now;
    // Renovar se expira em menos de 2 minutos
    return timeUntilExpiry < 2 * 60 * 1000;
  }

  // Extrair e cachear tempo de expiração do JWT
  static _setTokenExpiry(token) {
    try {
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      this._tokenExpiry = payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      console.warn('Não foi possível extrair expiração do token');
      this._tokenExpiry = null;
    }
  }

  // Fazer requisição autenticada (otimizada para cookies httpOnly)
  static async request(url, options = {}) {
    const makeRequest = async () => {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Não incluir Authorization header - cookies httpOnly fazem toda autenticação
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // CRITICAL: Incluir cookies httpOnly
      });

      return response;
    };

    try {
      // Primeira tentativa
      let response = await makeRequest();

      // Se falhou com 401 e temos usuário, tentar renovar token
      if (response.status === 401 && this.getCurrentUser()) {
        try {
          console.log('🔄 Tentando renovar token após 401...');
          await this.refreshToken();
          response = await makeRequest();
        } catch (refreshError) {
          console.error('Falha ao renovar token:', refreshError);
          // Se refresh falhou, usuário precisa fazer login novamente
          sessionStorage.removeItem('user');
          this._refreshPromise = null;
          this._tokenExpiry = null;
          throw new Error('Sessão expirada. Faça login novamente.');
        }
      }

      return response;
    } catch (error) {
      console.error('Erro na requisição:', error);
      throw error;
    }
  }

  // Métodos de conveniência para diferentes tipos de requisição
  static async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  static async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  // Listar dispositivos conectados
  static async getDevices() {
    try {
      const response = await this.get(`${API_BASE_URL}/api/auth/devices`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dispositivos');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error);
      throw error;
    }
  }

  // Revogar dispositivo
  static async revokeDevice(deviceId) {
    try {
      const response = await this.delete(`${API_BASE_URL}/api/auth/devices/${deviceId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao revogar dispositivo');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao revogar dispositivo:', error);
      throw error;
    }
  }

  // Revogar todos os dispositivos (exceto o atual)
  static async revokeAllDevices() {
    try {
      const response = await this.post(`${API_BASE_URL}/api/auth/revoke-all`);
      
      if (!response.ok) {
        throw new Error('Erro ao revogar todos os dispositivos');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao revogar todos os dispositivos:', error);
      throw error;
    }
  }

  // Alterar senha
  static async changePassword(currentPassword, newPassword) {
    try {
      const response = await this.put(`${API_BASE_URL}/api/auth/change-password`, {
        currentPassword,
        newPassword
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao alterar senha');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      throw error;
    }
  }

  // Método para verificar status da sessão
  static async checkSession() {
    try {
      const response = await this.get(`${API_BASE_URL}/api/auth/me`);
      
      if (response.ok) {
        const user = await response.json();
        sessionStorage.setItem('user', JSON.stringify(user));
        return user;
      } else if (response.status === 401) {
        // Token expirado, tentar renovar
        const newToken = await this.refreshToken();
        if (newToken) {
          // Tentar novamente com novo token
          const retryResponse = await this.get(`${API_BASE_URL}/api/auth/me`);
          if (retryResponse.ok) {
            const user = await retryResponse.json();
            sessionStorage.setItem('user', JSON.stringify(user));
            return user;
          }
        }
      }
      
      // Se chegou aqui, sessão é inválida
      sessionStorage.removeItem('user');
      this._refreshPromise = null;
      this._tokenExpiry = null;
      return null;
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      sessionStorage.removeItem('user');
      this._refreshPromise = null;
      this._tokenExpiry = null;
      return null;
    }
  }
}

export default AuthService;
