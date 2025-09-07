import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

import { apiUrl, API_BASE_URL, apiFetch } from '../../utils/apiClient';

export default function QuickRepliesComponent() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [content, setContent] = useState('');
  const [variablesText, setVariablesText] = useState(''); // JSON string
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const controller = useRef(null);

  console.log('🔧 QuickRepliesComponent: Inicializando, user:', user, 'token:', !!token);

  const fetchItems = async () => {
    console.log('🔧 QuickRepliesComponent: Buscando respostas rápidas...');
    setLoading(true);
    try {
  const res = await apiFetch('/api/quick-replies');
      console.log('🔧 QuickRepliesComponent: Resposta da API:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('🔧 QuickRepliesComponent: Erro na API:', errorData);
        throw new Error('Erro ao carregar respostas rápidas');
      }
      
      const data = await res.json();
      console.log('🔧 QuickRepliesComponent: Dados recebidos:', data);
      const list = Array.isArray(data) ? data : (data.quickReplies || data.rows || []);
      console.log('🔧 QuickRepliesComponent: Lista processada:', list.length, 'itens');
      setItems(list);
    } catch (e) {
      console.error('🔧 QuickRepliesComponent: Erro ao buscar:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.shortcut || '').toLowerCase().includes(q) ||
      (i.content || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="p-6 min-h-screen bg-slate-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1" />
        <button
          className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200"
          onClick={() => { setShowCreateModal(true); setError(''); setSuccess(''); }}
        >
          Nova resposta rápida
        </button>
      </div>

      {/* Search and list */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          placeholder="Buscar por título, atalho ou conteúdo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={fetchItems}
          className="px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg hover:bg-slate-600 transition-colors"
        >
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="text-white">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-white">{item.title || '(sem título)'}</div>
                <span className="text-xs bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded px-2 py-0.5">/{item.shortcut}</span>
              </div>
              {item.mediaUrl ? (
                <div className="mb-2">
                  {item.mediaType?.startsWith('image') ? (
                    <img src={`${API_BASE_URL}${item.mediaUrl}`} alt={item.fileName} className="max-h-40 rounded" />
                  ) : item.mediaType?.startsWith('audio') ? (
                    <audio controls src={`${API_BASE_URL}${item.mediaUrl}`} className="w-full" />
                  ) : item.mediaType?.startsWith('video') ? (
                    <video controls src={`${API_BASE_URL}${item.mediaUrl}`} className="w-full rounded" />
                  ) : (
                    <a href={`${API_BASE_URL}${item.mediaUrl}`} className="text-yellow-400 underline hover:text-yellow-300" target="_blank" rel="noreferrer">
                      {item.fileName || 'Baixar arquivo'}
                    </a>
                  )}
                </div>
              ) : null}
              {item.content ? (
                <div className="text-sm text-slate-300 whitespace-pre-wrap">{item.content}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop behind modal */}
          <div className="absolute inset-0 bg-black/60" onClick={()=>setShowCreateModal(false)} />
          {/* Centered modal content */}
          <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl p-5" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Criar resposta rápida</h2>
              <button className="p-2 text-slate-400 hover:text-white" onClick={()=>setShowCreateModal(false)} aria-label="Fechar">
                ✕
              </button>
            </div>
            {error && <div className="mb-3 text-red-400 text-sm bg-red-900/20 border border-red-500 rounded px-3 py-2">{error}</div>}
            {success && <div className="mb-3 text-green-400 text-sm bg-green-900/20 border border-green-500 rounded px-3 py-2">{success}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Título</label>
                <input
                  type="text"
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Ex.: Saudação padrão"
                  value={title}
                  onChange={(e)=>setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Atalho</label>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-2 rounded bg-slate-700 border border-slate-600 text-white">/</span>
                  <input
                    type="text"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Ex.: saudacao"
                    value={shortcut}
                    onChange={(e)=>setShortcut(e.target.value.replace(/\s+/g,'').toLowerCase())}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Digite sem espaços; será usado como /atalho no chat</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">Conteúdo (texto)</label>
                <textarea
                  rows={4}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Texto da resposta. Suporta variáveis: {{saudacao}}, {{hora}}, {{data}}, {{dia_semana}}, {{nome_empresa}}."
                  value={content}
                  onChange={(e)=>setContent(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Arquivo opcional</label>
                <input
                  type="file"
                  className="w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-yellow-500 file:to-yellow-600 file:text-white hover:file:from-yellow-600 hover:file:to-yellow-700"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar,.7z"
                  onChange={(e)=> setFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-slate-400 mt-1">Se enviar arquivo, o tipo será detectado automaticamente.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Variáveis (JSON opcional)</label>
                <textarea
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder='Ex.: { "nome_empresa": "Minha Empresa" }'
                  value={variablesText}
                  onChange={(e)=>setVariablesText(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 justify-end">
              <button className="px-4 py-2 bg-slate-700 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors" onClick={()=>setShowCreateModal(false)}>Cancelar</button>
              <button
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 disabled:opacity-60 disabled:hover:from-yellow-500 disabled:hover:to-yellow-600"
                disabled={submitting}
                onClick={async ()=>{
                  setError(''); setSuccess('');
                  if (!title.trim() || !shortcut.trim()) {
                    setError('Título e atalho são obrigatórios');
                    return;
                  }
                  // parse variables
                  let variables;
                  if (variablesText.trim()) {
                    try { variables = JSON.parse(variablesText); }
                    catch { setError('Variáveis devem ser um JSON válido'); return; }
                  }
                  setSubmitting(true);
                  try {
                    if (file) {
                      const fd = new FormData();
                      fd.append('title', title.trim());
                      fd.append('shortcut', shortcut.trim());
                      fd.append('content', content);
                      fd.append('mediaType', 'text');
                      if (variables) fd.append('variables', JSON.stringify(variables));
                      fd.append('media', file);
                      const res = await apiFetch('/api/quick-replies', { method: 'POST', body: fd });
                      if (!res.ok) {
                        const e = await res.json().catch(()=>({ error:'Erro ao criar'}));
                        throw new Error(e.error || 'Erro ao criar');
                      }
                    } else {
                      const res = await apiFetch('/api/quick-replies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), shortcut: shortcut.trim(), content, mediaType: 'text', ...(variables ? { variables } : {}) }) });
                      if (!res.ok) {
                        const e = await res.json().catch(()=>({ error:'Erro ao criar'}));
                        throw new Error(e.error || 'Erro ao criar');
                      }
                    }
                    setSuccess('Resposta criada com sucesso');
                    setTitle(''); setShortcut(''); setContent(''); setVariablesText(''); setFile(null);
                    await fetchItems();
                    setShowCreateModal(false);
                  } catch (e) {
                    setError(e.message || 'Erro ao criar');
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? 'Salvando...' : 'Criar'}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
