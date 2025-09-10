import React, { useState } from 'react';
import {
  ChatBubbleBottomCenterTextIcon,
  MapPinIcon,
  UserIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArchiveBoxIcon,
  ArchiveBoxArrowDownIcon,
  BookmarkIcon,
  BookmarkSlashIcon,
  TrashIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  HeartIcon,
  FaceSmileIcon,
  FireIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import WWebJSPollModal from '../modals/WWebJSPollModal';
import LocationModal from '../modals/LocationModal';
import ContactModal from '../modals/ContactModal';
import * as wwebjsService from '../../services/wwebjsAdvancedService';
import { useToast } from '../../context/ToastContext';

const REACTION_EMOJIS = ['👍', '👎', '❤️', '😂', '😮', '😢', '🔥', '✨'];

export default function WWebJSAdvancedActions({ 
  selectedTicket, 
  sessionId, 
  messageId = null, 
  onSuccess = () => {} 
}) {
  const [showPollModal, setShowPollModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toastApi = useToast();

  // Get chat ID from ticket
  const getChatId = () => {
    if (!selectedTicket?.Contact) return null;
    const phoneNumber = selectedTicket.Contact.phoneNumber?.replace(/\D/g, '');
    return phoneNumber ? `${phoneNumber}@c.us` : null;
  };

  const chatId = getChatId();

  const handleSendPoll = async (pollName, pollOptions) => {
    if (!chatId || !sessionId) {
      toastApi.error('Erro: sessão ou contato não encontrado');
      return;
    }

    setIsLoading(true);
    try {
      await wwebjsService.sendPoll(sessionId, chatId, pollName, pollOptions);
      toastApi.success('Enquete enviada com sucesso!');
      setShowPollModal(false);
      onSuccess();
    } catch (error) {
      console.error('Error sending poll:', error);
      toastApi.error('Erro ao enviar enquete: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendLocation = async (latitude, longitude, description) => {
    if (!chatId || !sessionId) {
      toastApi.error('Erro: sessão ou contato não encontrado');
      return;
    }

    setIsLoading(true);
    try {
      await wwebjsService.sendLocation(sessionId, chatId, latitude, longitude, description);
      toastApi.success('Localização enviada com sucesso!');
      setShowLocationModal(false);
      onSuccess();
    } catch (error) {
      console.error('Error sending location:', error);
      toastApi.error('Erro ao enviar localização: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendContact = async (contactId) => {
    if (!chatId || !sessionId) {
      toastApi.error('Erro: sessão ou contato não encontrado');
      return;
    }

    setIsLoading(true);
    try {
      await wwebjsService.sendContact(sessionId, chatId, contactId);
      toastApi.success('Contato enviado com sucesso!');
      setShowContactModal(false);
      onSuccess();
    } catch (error) {
      console.error('Error sending contact:', error);
      toastApi.error('Erro ao enviar contato: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReaction = async (reaction) => {
    if (!messageId || !sessionId) {
      toastApi.error('Erro: mensagem ou sessão não encontrada');
      return;
    }

    setIsLoading(true);
    try {
      await wwebjsService.reactToMessage(sessionId, messageId, reaction);
      toastApi.success(`Reação ${reaction} enviada!`);
      setShowReactions(false);
      onSuccess();
    } catch (error) {
      console.error('Error reacting to message:', error);
      toastApi.error('Erro ao reagir à mensagem: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatAction = async (action) => {
    if (!chatId || !sessionId) {
      toastApi.error('Erro: sessão ou contato não encontrado');
      return;
    }

    setIsLoading(true);
    try {
      let result;
      let successMessage;

      switch (action) {
        case 'mute':
          result = await wwebjsService.muteChat(sessionId, chatId);
          successMessage = 'Chat silenciado';
          break;
        case 'unmute':
          result = await wwebjsService.unmuteChat(sessionId, chatId);
          successMessage = 'Som do chat ativado';
          break;
        case 'archive':
          result = await wwebjsService.archiveChat(sessionId, chatId);
          successMessage = 'Chat arquivado';
          break;
        case 'unarchive':
          result = await wwebjsService.unarchiveChat(sessionId, chatId);
          successMessage = 'Chat desarquivado';
          break;
        case 'pin':
          result = await wwebjsService.pinChat(sessionId, chatId);
          successMessage = 'Chat fixado';
          break;
        case 'unpin':
          result = await wwebjsService.unpinChat(sessionId, chatId);
          successMessage = 'Chat desfixado';
          break;
        case 'markUnread':
          result = await wwebjsService.markChatUnread(sessionId, chatId);
          successMessage = 'Chat marcado como não lido';
          break;
        case 'clear':
          if (window.confirm('Tem certeza que deseja limpar o histórico do chat?')) {
            result = await wwebjsService.clearChat(sessionId, chatId);
            successMessage = 'Histórico do chat limpo';
          } else {
            setIsLoading(false);
            return;
          }
          break;
        default:
          throw new Error('Ação não reconhecida');
      }

      toastApi.success(successMessage);
      onSuccess();
    } catch (error) {
      console.error(`Error with chat action ${action}:`, error);
      toastApi.error(`Erro ao executar ação: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedTicket?.Contact || selectedTicket.Session?.library !== 'wwebjs') {
    return null; // Only show for WWebJS sessions
  }

  return (
    <div className="space-y-4">
      {/* Send Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Enviar Conteúdo</h4>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setShowPollModal(true)}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 p-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
            <span>Enquete</span>
          </button>

          <button
            onClick={() => setShowLocationModal(true)}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 p-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <MapPinIcon className="h-4 w-4" />
            <span>Localização</span>
          </button>

          <button
            onClick={() => setShowContactModal(true)}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 p-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <UserIcon className="h-4 w-4" />
            <span>Contato</span>
          </button>
        </div>
      </div>

      {/* Message Reactions (only show if messageId is provided) */}
      {messageId && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Reagir à Mensagem</h4>
          <div className="flex space-x-2">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                disabled={isLoading}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Management */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Gerenciar Chat</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleChatAction('mute')}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 p-2 text-sm bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 transition-colors disabled:opacity-50"
          >
            <SpeakerXMarkIcon className="h-4 w-4" />
            <span>Silenciar</span>
          </button>

          <button
            onClick={() => handleChatAction('unmute')}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 p-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <SpeakerWaveIcon className="h-4 w-4" />
            <span>Ativar Som</span>
          </button>

          <button
            onClick={() => handleChatAction('pin')}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 p-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <BookmarkIcon className="h-4 w-4" />
            <span>Fixar</span>
          </button>

          <button
            onClick={() => handleChatAction('archive')}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 p-2 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <ArchiveBoxIcon className="h-4 w-4" />
            <span>Arquivar</span>
          </button>

          <button
            onClick={() => handleChatAction('markUnread')}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 p-2 text-sm bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 transition-colors disabled:opacity-50"
          >
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span>Não Lida</span>
          </button>

          <button
            onClick={() => handleChatAction('clear')}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 p-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <WWebJSPollModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        onSend={handleSendPoll}
        isLoading={isLoading}
      />

      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSend={handleSendLocation}
        isLoading={isLoading}
      />

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSend={handleSendContact}
        isLoading={isLoading}
      />
    </div>
  );
}
