import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ToastProvider } from './context/ToastContext';
import { API_BASE_URL } from './utils/apiClient';

// Bootstrap: if API_BASE_URL is defined, rewrite fetch requests that target localhost:3001 to use it
(() => {
  try {
    const BASE = API_BASE_URL;
    if (!BASE) return;
    const origFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      try {
        const url = typeof input === 'string' ? input : input?.url;
        if (typeof url === 'string' && url.startsWith('http')) {
          // If code used an explicit localhost default, replace with env base
          if (url.startsWith('http://localhost:3001') || url.startsWith('https://localhost:3001')) {
            const rewritten = BASE + url.replace(/^https?:\/\/localhost:3001/, '');
            return origFetch(rewritten, init);
          }
        }
      } catch {}
      return origFetch(input, init);
    };
  } catch {}
})();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
