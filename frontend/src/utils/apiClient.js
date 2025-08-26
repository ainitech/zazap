// Central API client: builds base URL from env and wraps fetch with auth + cache busting

const getEnvBase = () => {
  try {
    // Prefer window overrides, then CRA env vars (support both BACKEND_URL and legacy API_URL)
    const w = typeof window !== 'undefined'
      ? (window.__REACT_APP_BACKEND_URL || window.__REACT_APP_API_URL)
      : undefined;
    const e = typeof process !== 'undefined'
      ? (process.env?.REACT_APP_BACKEND_URL || process.env?.REACT_APP_API_URL)
      : undefined;
    const base = (w || e || 'http://localhost:3001').trim(); // Force backend URL as fallback
    if (!base) return 'http://localhost:3001';
    return base.endsWith('/') ? base.slice(0, -1) : base;
  } catch {
    return 'http://localhost:3001';
  }
};

export const API_BASE_URL = getEnvBase();

export const apiUrl = (path) => {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${p}` : p; // fallback to relative (proxy)
};

export const apiFetch = (path, options = {}) => {
  const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('token') : null;
  const headers = { ...(options.headers || {}) };
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;

  const url = apiUrl(path);
  const noTs = options.noTs === true;
  const tsParam = noTs ? '' : `${url.includes('?') ? '&' : '?'}_ts=${Date.now()}`;
  return fetch(`${url}${tsParam}`, { ...options, headers, cache: options.cache || 'no-store' });
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
