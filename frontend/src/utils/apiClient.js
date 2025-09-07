// Central API client: builds base URL from env and wraps fetch with auth + cache busting

const getEnvBase = () => {
  try {
    // CRA inlines these at build time; prefer BACKEND_URL, fallback to legacy API_URL
    const base = (process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || '').trim();
    if (!base) return '';
    return base.endsWith('/') ? base.slice(0, -1) : base;
  } catch {
    return '';
  }
};

export const API_BASE_URL = getEnvBase();

// Derive WS base (auto-convert http/https to ws/wss when explicit base provided). If empty, socket.io will connect same-origin.
export const WS_BASE_URL = API_BASE_URL
  ? API_BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
  : '';

export const apiUrl = (path) => {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${p}` : p; // fallback to relative (proxy or same-origin)
};

export const apiFetch = (path, options = {}) => {
  // Não usar localStorage - a autenticação é gerenciada pelo authService
  const headers = { ...(options.headers || {}) };
  
  const url = apiUrl(path);
  const noTs = options.noTs === true;
  const tsParam = noTs ? '' : `${url.includes('?') ? '&' : '?'}_ts=${Date.now()}`;
  return fetch(`${url}${tsParam}`, { 
    ...options, 
    headers, 
    cache: options.cache || 'no-store',
    credentials: 'include' // Importante para enviar cookies httpOnly
  });
};

export const safeJson = async (res) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return res.json();
  }
  // Graceful fallback: try to parse JSON even if content-type is wrong
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // Log a short preview to aid debugging (likely HTML from dev server when proxy/env is misconfigured)
    if (typeof console !== 'undefined') {
      console.error('Resposta não é JSON. Prévia:', (text || '').slice(0, 160));
    }
    throw new Error('Resposta não é JSON');
  }
};
