import React, { useState, useEffect } from 'react';
import { 
  DocumentDuplicateIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const QueueDuplicateModal = ({ isOpen, onClose, onDuplicate, queueName }) => {
  const [newName, setNewName] = useState('');
  const [includeAgents, setIncludeAgents] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && queueName) {
      setNewName(`${queueName} (Cópia)`);
    }
  }, [isOpen, queueName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsLoading(true);
    try {
      await onDuplicate({
        newName: newName.trim(),
        includeAgents,
        includeSettings
      });
      
      // Reset form
      setNewName('');
      setIncludeAgents(true);
      setIncludeSettings(true);
      onClose();
    } catch (error) {
      console.error('Erro ao duplicar fila:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md">
        <div className="modal-header">
          <h3 className="modal-title">
            <DocumentDuplicateIcon className="h-5 w-5" />
            Duplicar Fila
          </h3>
          <button onClick={onClose} className="modal-close-btn">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Atenção</p>
                <p>A fila duplicada será criada como <strong>inativa</strong> por segurança.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Nova Fila
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Digite o nome da nova fila"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">O que incluir na duplicação:</p>
            
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={includeAgents}
                  onChange={(e) => setIncludeAgents(e.target.checked)}
                  className="sr-only"
                />
                <div className={`custom-checkbox ${includeAgents ? 'checked' : ''}`}>
                  {includeAgents && <CheckIcon className="h-3 w-3 text-white" />}
                </div>
              </div>
              <div className="text-sm">
                <span className="text-gray-700 group-hover:text-gray-900">Agentes atribuídos</span>
                <p className="text-gray-500 text-xs">Copiar associações de usuários com a fila</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={includeSettings}
                  onChange={(e) => setIncludeSettings(e.target.checked)}
                  className="sr-only"
                />
                <div className={`custom-checkbox ${includeSettings ? 'checked' : ''}`}>
                  {includeSettings && <CheckIcon className="h-3 w-3 text-white" />}
                </div>
              </div>
              <div className="text-sm">
                <span className="text-gray-700 group-hover:text-gray-900">Configurações da fila</span>
                <p className="text-gray-500 text-xs">Mensagens de saudação, horários, integrações, etc.</p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !newName.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Duplicando...
                </>
              ) : (
                <>
                  <DocumentDuplicateIcon className="h-4 w-4" />
                  Duplicar Fila
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QueueDuplicateModal;
