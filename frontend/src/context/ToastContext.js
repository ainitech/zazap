import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { apiUrl } from '../utils/apiClient';
import AuthService from '../services/authService.js';

const ToastContext = createContext();

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

// Small icon per type
const typeIcon = (type) => {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '⚠️';
    case 'warning': return '⚠️';
    default: return 'ℹ️';
  }
};

// ToastItem handles its own lifecycle (pause on hover, enter/exit animation)
const ToastItem = ({ toast, onRemove }) => {
  const { id, message, type = 'info', duration = 5000, actions, action } = toast;
  const [closing, setClosing] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [remaining, setRemaining] = useState(duration);
  const timerRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (duration <= 0) return undefined;
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => initiateClose(), remaining);
    return () => clearTimeout(timerRef.current);
  }, []);

  const initiateClose = () => {
    setClosing(true);
    // wait for CSS animation (300ms) before removing
    setTimeout(() => onRemove(id), 300);
  };

  const pauseTimer = () => {
    if (duration <= 0) return;
    clearTimeout(timerRef.current);
    const elapsed = Date.now() - startRef.current;
    setRemaining(prev => Math.max(0, prev - elapsed));
    setHovering(true);
  };

  const resumeTimer = () => {
    if (duration <= 0) return;
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => initiateClose(), remaining);
    setHovering(false);
  };

  // Handle action click inside item so we can animate close after action completes
  const handleAction = async (act, idx = null) => {
    if (!act || act.disabled) return;
    try {
      const result = act.onClick && act.onClick();
      if (result && typeof result.then === 'function') {
        // show disabled state on the UI by setting a flag on the action object
        act.disabled = true; // local mutation for visibility; provider normalizes on new adds
        await result;
      }
    } catch (err) {
      console.error('Toast action error', err);
    } finally {
      initiateClose();
    }
  };

  const ariaLive = type === 'error' ? 'assertive' : 'polite';

  return (
    <div
      role="status"
      aria-live={ariaLive}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      className={`transform transition-all duration-300 ease-out max-w-full sm:max-w-xs ${closing ? '-translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}>
      <div className={`px-4 py-2 rounded-lg shadow-lg text-sm flex items-start gap-3 ${type === 'error' ? 'bg-red-600 text-white' : type === 'success' ? 'bg-green-600 text-white' : 'bg-slate-800 text-white'}`}>
        <div className="flex-shrink-0 mt-0.5">{typeIcon(type)}</div>
        <div className="flex-1">
          <div className="break-words">{message}</div>
          <div className="mt-2 flex gap-2">
            {Array.isArray(actions) && actions.map((a, i) => (
              <button
                key={i}
                onClick={() => handleAction(a, i)}
                disabled={a.disabled}
                aria-label={a.label || 'Ação'}
                className={`text-sm px-3 py-1 rounded-md ${a.disabled ? 'opacity-60 cursor-wait bg-white/10' : 'bg-white/10 hover:bg-white/20'}`}>
                {a.disabled ? (a.loadingLabel || 'Aguarde...') : (a.label || 'Ação')}
              </button>
            ))}
            {!actions && action && (
              <button
                onClick={() => handleAction(action, null)}
                disabled={action.disabled}
                aria-label={action.label || 'Ação'}
                className={`text-sm px-3 py-1 rounded-md ${action.disabled ? 'opacity-60 cursor-wait bg-white/10' : 'bg-white/10 hover:bg-white/20'}`}>
                {action.disabled ? (action.loadingLabel || 'Aguarde...') : (action.label || 'Ação')}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-start">
          <button
            onClick={() => initiateClose()}
            aria-label="Fechar"
            className="ml-2 text-white/80 hover:text-white text-sm px-2 py-1 rounded">
            ✖
          </button>
        </div>
      </div>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, { type = 'info', duration = 5000, action = null, actions = null } = {}) => {
    const id = Date.now() + Math.random();
    // Keep actions immutable-ish for new toast
    const normalizedActions = Array.isArray(actions)
      ? actions.map(a => ({ label: a.label, onClick: a.onClick, loadingLabel: a.loadingLabel }))
      : null;
    const normalizedAction = action ? { label: action.label, onClick: action.onClick, loadingLabel: action.loadingLabel } : null;

    const toast = { id, message, type, duration, actions: normalizedActions, action: normalizedAction };
    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Helper to create a ticket-action toast with common ticket operations.
  const addTicketActionToast = useCallback((ticketId, message = `Ação no ticket ${ticketId}`, { duration = 15000, type = 'info' } = {}) => {
    const doRequest = async (path, method = 'POST', body = null) => {
      try {
        let response;
        if (method === 'POST') {
          response = await AuthService.post(apiUrl(path), body);
        } else if (method === 'PUT') {
          response = await AuthService.put(apiUrl(path), body);
        } else {
          response = await AuthService.get(apiUrl(path));
        }
        
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'request_failed');
        }
        
        return response.json().catch(() => ({}));
      } catch (error) {
        throw error;
      }
    };

    const actions = [
      {
        label: 'Fechar',
        loadingLabel: 'Fechando...',
        onClick: () => doRequest(`/api/tickets/${ticketId}/close`, 'POST')
      },
      {
        label: 'Resolver',
        loadingLabel: 'Resolvendo...',
        onClick: () => doRequest(`/api/tickets/${ticketId}/resolve`, 'POST')
      },
      {
        label: 'Transferir',
        loadingLabel: 'Transferindo...',
        onClick: async () => {
          const target = window.prompt('Id da fila/usuário para transferir o ticket:');
          if (!target) throw new Error('transfer_cancelled');
          // try transfer by queue first
          return doRequest(`/api/tickets/${ticketId}/transfer`, 'POST', { target });
        }
      },
      {
        label: 'Deletar',
        loadingLabel: 'Deletando...',
        onClick: () => doRequest(`/api/tickets/${ticketId}`, 'DELETE')
      }
    ];

    return addToast(message, { type, duration, actions });
  }, [addToast]);

  return (
  <ToastContext.Provider value={{ toasts, addToast, removeToast, addTicketActionToast }}>
      {children}
      <div className="fixed top-6 right-6 flex flex-col gap-3 z-50 items-end">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastContext;
