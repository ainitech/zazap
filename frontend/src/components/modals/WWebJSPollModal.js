import React, { useState } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function WWebJSPollModal({ isOpen, onClose, onSend, isLoading = false }) {
  const [pollName, setPollName] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [error, setError] = useState('');

  const handleAddOption = () => {
    if (pollOptions.length < 12) { // WhatsApp limit
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (pollOptions.length > 2) { // Minimum 2 options
      const newOptions = pollOptions.filter((_, i) => i !== index);
      setPollOptions(newOptions);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!pollName.trim()) {
      setError('Nome da enquete é obrigatório');
      return;
    }

    const validOptions = pollOptions.filter(option => option.trim() !== '');
    if (validOptions.length < 2) {
      setError('Pelo menos 2 opções são necessárias');
      return;
    }

    if (validOptions.length > 12) {
      setError('Máximo de 12 opções permitidas');
      return;
    }

    onSend(pollName.trim(), validOptions);
  };

  const handleClose = () => {
    setPollName('');
    setPollOptions(['', '']);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Criar Enquete WhatsApp</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Poll Name */}
          <div>
            <label htmlFor="pollName" className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Enquete
            </label>
            <input
              type="text"
              id="pollName"
              value={pollName}
              onChange={(e) => setPollName(e.target.value)}
              placeholder="Ex: Qual sua cor favorita?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              maxLength={255}
              disabled={isLoading}
            />
          </div>

          {/* Poll Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opções ({pollOptions.filter(opt => opt.trim() !== '').length}/12)
            </label>
            <div className="space-y-2">
              {pollOptions.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Opção ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    maxLength={100}
                    disabled={isLoading}
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 text-red-500 hover:text-red-700 transition-colors"
                      disabled={isLoading}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {pollOptions.length < 12 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2 flex items-center space-x-1 text-green-600 hover:text-green-800 transition-colors"
                disabled={isLoading}
              >
                <PlusIcon className="h-4 w-4" />
                <span className="text-sm">Adicionar opção</span>
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !pollName.trim() || pollOptions.filter(opt => opt.trim() !== '').length < 2}
            >
              {isLoading ? 'Enviando...' : 'Enviar Enquete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
