import React, { useState } from 'react';
import { X, Plus, Trash2, Send } from 'lucide-react';
import AuthService from '../../services/authService.js';

const ButtonModal = ({ isOpen, onClose, ticketId, onSendSuccess }) => {
  const [messageType, setMessageType] = useState('poll'); // Apenas 'poll' (enquete)
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [footer, setFooter] = useState('');
  const [buttons, setButtons] = useState([{ id: '', text: '' }, { id: '', text: '' }]);
  const [loading, setLoading] = useState(false);

  const addButton = () => {
    if (buttons.length < 12) {
      setButtons([...buttons, { id: '', text: '' }]);
    }
  };

  const removeButton = (index) => {
    const validOptions = buttons.filter(btn => btn.text.trim());
    if (validOptions.length > 2) {
      setButtons(buttons.filter((_, i) => i !== index));
    }
  };

  const updateButton = (index, field, value) => {
    const updatedButtons = buttons.map((button, i) => 
      i === index ? { ...button, [field]: value } : button
    );
    setButtons(updatedButtons);
  };

  const handleSend = async () => {
    if (!text.trim()) {
      alert('A pergunta da enquete é obrigatória');
      return;
    }

    const validOptions = buttons.filter(btn => btn.text.trim());
    if (validOptions.length < 2) {
      alert('A enquete deve ter pelo menos 2 opções válidas');
      return;
    }

    setLoading(true);

    try {
      const { apiUrl } = await import('../../utils/apiClient');

      const payload = {
        ticketId,
        question: text,
        options: validOptions.map(btn => btn.text.trim()),
        allowMultipleAnswers: false
      };

      const response = await AuthService.post(apiUrl('/api/buttons/poll'), payload);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Enquete enviada:', result);
        if (onSendSuccess) onSendSuccess(result);
        onClose();
        // Reset form
        setText('');
        setTitle('');
        setFooter('');
        setButtons([{ id: '', text: '' }, { id: '', text: '' }]);
      } else {
        const error = await response.json();
        console.error('❌ Erro ao enviar enquete:', error);
        alert(error.error || 'Erro ao enviar enquete');
      }
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      alert('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Criar Enquete</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tipo de mensagem */}
        <div className="mb-6">
          <label className="block text-slate-300 text-sm font-medium mb-2">
            Tipo de mensagem
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="poll"
                checked={messageType === 'poll'}
                onChange={(e) => setMessageType(e.target.value)}
                className="mr-2"
              />
              <span className="text-white">Enquete</span>
            </label>
          </div>
        </div>

        {/* Título */}
        <div className="mb-4">
          <label className="block text-slate-300 text-sm font-medium mb-2">
            Título (opcional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Título da mensagem"
          />
        </div>

        {/* Texto principal */}
        <div className="mb-4">
          <label className="block text-slate-300 text-sm font-medium mb-2">
            Pergunta da enquete *
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Digite a pergunta da enquete..."
            maxLength={300}
            required
          />
          <div className="text-xs text-slate-400 mt-1">
            {text.length}/300 caracteres
          </div>
        </div>

        {/* Opções da enquete */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-slate-300 text-sm font-medium">
              Opções da enquete ({buttons.filter(btn => btn.text.trim()).length}/12)
            </label>
            {buttons.length < 12 && (
              <button
                onClick={addButton}
                className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar opção</span>
              </button>
            )}
          </div>

          {buttons.map((button, index) => (
            <div key={index} className="flex space-x-2 mb-3">
              <input
                type="text"
                value={button.text}
                onChange={(e) => updateButton(index, 'text', e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Opção ${index + 1}`}
                maxLength={100}
                required
              />
              {buttons.filter(btn => btn.text.trim()).length > 2 && (
                <button
                  onClick={() => removeButton(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="mb-6">
          <label className="block text-slate-300 text-sm font-medium mb-2">
            Rodapé (opcional)
          </label>
          <input
            type="text"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Texto do rodapé"
          />
        </div>

        {/* Botões de ação */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !text.trim() || buttons.filter(btn => btn.text.trim()).length < 2}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{loading ? 'Enviando...' : 'Enviar Enquete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ButtonModal;
