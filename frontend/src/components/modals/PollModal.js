import React, { useState } from 'react';
import { X, Plus, Trash2, Send, BarChart3 } from 'lucide-react';
import AuthService from '../../services/authService.js';

const PollModal = ({ isOpen, onClose, ticketId, onSendSuccess }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [loading, setLoading] = useState(false);

  const addOption = () => {
    if (options.length < 12) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index, value) => {
    const updatedOptions = options.map((option, i) =>
      i === index ? value : option
    );
    setOptions(updatedOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!question.trim()) {
      alert('Por favor, digite a pergunta da enquete.');
      return;
    }

    const validOptions = options.filter(option => option.trim() !== '');
    if (validOptions.length < 2) {
      alert('A enquete deve ter pelo menos 2 opções válidas.');
      return;
    }

    setLoading(true);

    try {
      const response = await AuthService.post('/api/buttons/poll', {
        ticketId,
        question: question.trim(),
        options: validOptions,
        allowMultipleAnswers
      });

      const result = await response.json();

      if (response.ok) {
        alert('Enquete enviada com sucesso!');
        onSendSuccess && onSendSuccess();
        handleClose();
      } else {
        alert(`Erro ao enviar enquete: ${result.error || result.message}`);
      }
    } catch (error) {
      console.error('Erro ao enviar enquete:', error);
      alert('Erro ao enviar enquete. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuestion('');
    setOptions(['', '']);
    setAllowMultipleAnswers(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Criar Enquete
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Pergunta da enquete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pergunta da Enquete *
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Digite a pergunta da enquete..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={300}
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              {question.length}/300 caracteres
            </div>
          </div>

          {/* Opções */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opções ({options.filter(opt => opt.trim() !== '').length}/12)
            </label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Opção ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-2 text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 12 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar opção
              </button>
            )}
          </div>

          {/* Configurações */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allowMultiple"
              checked={allowMultipleAnswers}
              onChange={(e) => setAllowMultipleAnswers(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="allowMultiple" className="text-sm text-gray-700">
              Permitir múltiplas respostas
            </label>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !question.trim() || options.filter(opt => opt.trim() !== '').length < 2}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Enquete
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PollModal;
