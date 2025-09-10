import React, { useEffect, useRef, useState, useMemo } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import { apiUrl, API_BASE_URL, apiFetch, safeJson } from '../../utils/apiClient';
import TransferModal from './TransferModal';
import { FileText } from 'lucide-react';
import PriorityModal from './PriorityModal';
import TagSelector from '../TagSelector';
import WhatsAppAudioPlayer from './WhatsAppAudioPlayer';
import WWebJSAdvancedActions from './WWebJSAdvancedActions';
import { 
  ChatBubbleBottomCenterTextIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  MicrophoneIcon,
  ArrowRightIcon,
  FlagIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';
import { UserPlusIcon } from '@heroicons/react/24/outline';

// API base is resolved via apiUrl helper

export default function ChatArea({ 
  selectedTicket, 
  messages, 
  newMessage, 
  onNewMessageChange, 
  onSendMessage,
  showContactInfo,
  onToggleContactInfo,
  isRealTime = true,
  isSendingMessage = false,
  onTicketUpdate,
  onBackToList
}) {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  
  // Adicionar CSS customizado no cabeçalho
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Animações para mobile */
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translate3d(0, 30px, 0);
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }
      
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translate3d(30px, 0, 0);
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }
      
      @keyframes slideInLeft {
        from {
          opacity: 0;
          transform: translate3d(-30px, 0, 0);
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }
      
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      /* Scroll personalizado para mobile */
      .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 2px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 2px;
        transition: background 0.2s ease;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.5);
      }
      
      /* Smooth scroll para toda a aplicação */
      * {
        scroll-behavior: smooth;
      }
      
      /* Melhorar touch targets */
      .touch-target {
        min-height: 44px;
        min-width: 44px;
      }
      
      /* Remover highlight azul no touch */
      .no-highlight {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      /* Animações para mensagens */
      .message-enter {
        animation: fadeInUp 0.3s ease-out;
      }
      
      .message-my {
        animation: slideInRight 0.3s ease-out;
      }
      
      .message-other {
        animation: slideInLeft 0.3s ease-out;
      }
      
      /* Efeito ripple para botões */
      .ripple-effect {
        position: relative;
        overflow: hidden;
      }
      
      .ripple-effect::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: translate(-50%, -50%);
        transition: width 0.6s, height 0.6s;
      }
      
      .ripple-effect:active::before {
        width: 300px;
        height: 300px;
      }
      
      /* Melhorias para textarea */
      .auto-resize-textarea {
        resize: none;
        overflow: hidden;
        transition: height 0.2s ease;
      }
      
      .auto-resize-textarea:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
      }
      
      /* Loading dots animation */
      @keyframes loadingDots {
        0%, 20% {
          opacity: 0;
          transform: scale(0.6);
        }
        50% {
          opacity: 1;
          transform: scale(1);
        }
        80%, 100% {
          opacity: 0;
          transform: scale(0.6);
        }
      }
      
      .loading-dot:nth-child(1) { animation-delay: 0s; }
      .loading-dot:nth-child(2) { animation-delay: 0.2s; }
      .loading-dot:nth-child(3) { animation-delay: 0.4s; }
      
      .loading-dot {
        animation: loadingDots 1.4s infinite;
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Estados para informações do contato
  const [contactInfo, setContactInfo] = useState(null);
  const [loadingContact, setLoadingContact] = useState(false);
  
  // Estados para modais
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showWWebJSPanel, setShowWWebJSPanel] = useState(false);

  // Adicionar estado para upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  const fileInputMediaRef = useRef(null);
  const fileInputDocRef = useRef(null);

  // Estado para modal de áudio
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [audioModalSrc, setAudioModalSrc] = useState(null);

  // Estado para preview de PDF
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  // Estados para menu de contexto de mensagem
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);

  // Estados para gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);
  const [recordingError, setRecordingError] = useState(null);

  // Quick Replies state
  const [qrOpen, setQrOpen] = useState(false);
  const [qrItems, setQrItems] = useState([]);
  const [qrQuery, setQrQuery] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const qrRef = useRef(null);
  
  // Tags state
  const [ticketTags, setTicketTags] = useState([]);

  // Reações disponíveis
  const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🙏'];

  // Conectar ao WebSocket
  useEffect(() => {
    if (!socketRef.current) {
  socketRef.current = io(apiUrl('/').replace(/\/$/, ''), { withCredentials: true });

      // Escutar atualizações de contatos
      socketRef.current.on('contact-updated', (updatedContact) => {
        if (selectedTicket?.contactId === updatedContact.id) {
          console.log('📱 Contato atualizado via socket:', updatedContact);
          setContactInfo(updatedContact);
        }
      });

      // Escutar atualizações de tickets (podem incluir novos dados de contato)
      socketRef.current.on('tickets-update', (tickets) => {
        if (selectedTicket?.id) {
          const updatedTicket = tickets.find(t => t.id === selectedTicket.id);
          if (updatedTicket?.Contact) {
            console.log('🎫 Ticket atualizado com dados do contato via socket:', updatedTicket.Contact);
            setContactInfo(updatedTicket.Contact);
          }
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('contact-updated');
        socketRef.current.off('tickets-update');
      }
    };
  }, [selectedTicket]);

  // Buscar informações do contato quando o ticket muda
  useEffect(() => {
    if (selectedTicket?.contactId) {
      // Se o ticket já tem dados do contato, usar eles primeiro
      if (selectedTicket.Contact) {
        console.log('👤 Usando dados do contato do ticket no ChatArea:', selectedTicket.Contact);
        setContactInfo(selectedTicket.Contact);
        // Buscar informações mais recentes em background
        fetchContactInfo();
      } else {
        // Se não tem dados do contato no ticket, buscar
        fetchContactInfo();
      }
    } else {
      setContactInfo(null);
    }
  }, [selectedTicket?.contactId, selectedTicket?.Contact]);

  // Load ticket tags when ticket changes
  useEffect(() => {
    if (selectedTicket?.id) {
      // If ticket already has tags, use them
      if (selectedTicket.tags) {
        setTicketTags(selectedTicket.tags);
      } else {
        // Otherwise fetch tags
        fetchTicketTags();
      }
    } else {
      setTicketTags([]);
    }
  }, [selectedTicket?.id, selectedTicket?.tags]);

  const fetchTicketTags = async () => {
    if (!selectedTicket?.id) return;
    
    try {
  const response = await apiFetch(`/api/tags/ticket/${selectedTicket.id}`);
      
      if (response.ok) {
        const data = await response.json();
        const tags = data.map(item => item.tag).filter(Boolean);
        setTicketTags(tags);
      }
    } catch (error) {
      console.error('Error fetching ticket tags:', error);
    }
  };

  const handleTagsChange = (newTags) => {
    setTicketTags(newTags);
  };

  const fetchContactInfo = async () => {
    if (!selectedTicket?.contactId) return;
    
    try {
      // Só mostrar loading se não temos dados do contato ainda
      if (!contactInfo) {
        setLoadingContact(true);
      }
  const response = await apiFetch(`/api/contacts/${selectedTicket.contactId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('👤 Informações do contato carregadas via API no ChatArea:', data);
        setContactInfo(data);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar informações do contato:', error);
    } finally {
      setLoadingContact(false);
    }
  };

  // Funções para gerenciar tickets
  const handleTransfer = async () => {
    // A lógica de transferência será implementada no TransferModal
    setShowTransferModal(false);
    setShowActionsMenu(false);
    // Atualizar dados após transferência
    if (onTicketUpdate) {
      onTicketUpdate();
    }
  };

  const handlePriorityChange = async (newPriority) => {
    // A lógica de prioridade será implementada no PriorityModal
    setShowPriorityModal(false);
    setShowActionsMenu(false);
    // Atualizar dados após mudança de prioridade
    if (onTicketUpdate) {
      onTicketUpdate();
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    
    try {
  const response = await apiFetch(`/api/tickets/${selectedTicket.id}/resolve`, { method: 'PUT' });

      if (response.ok) {
        setShowActionsMenu(false);
        // Atualizar dados após resolver
        if (onTicketUpdate) {
          onTicketUpdate();
        }
      }
    } catch (error) {
      console.error('Erro ao resolver ticket:', error);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    
    if (!window.confirm('Tem certeza que deseja fechar este ticket?')) return;
    
    try {
  const response = await apiFetch(`/api/tickets/${selectedTicket.id}/close`, { method: 'PUT' });

      if (response.ok) {
        setShowActionsMenu(false);
        // Atualizar dados após fechar
        if (onTicketUpdate) {
          onTicketUpdate();
        }
      }
    } catch (error) {
      console.error('Erro ao fechar ticket:', error);
    }
  };

  const handlePermanentDeleteTicket = async () => {
    if (!selectedTicket) return;
    
    const contactName = selectedTicket.Contact?.name || selectedTicket.Contact?.pushname || selectedTicket.contact;
    
    if (!window.confirm(
      `⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\n` +
      `Isso irá deletar PERMANENTEMENTE:\n` +
      `• O ticket #${selectedTicket.id}\n` +
      `• TODAS as mensagens e arquivos\n` +
      `• TODOS os dados do contato ${contactName}\n` +
      `• TODOS os outros tickets deste contato\n\n` +
      `Tem certeza que deseja continuar?`
    )) return;
    
    if (!window.confirm(
      `🚨 CONFIRMAÇÃO FINAL\n\n` +
      `Você está prestes a APAGAR TUDO sobre o contato:\n` +
      `${contactName} (${selectedTicket.contact})\n\n` +
      `Esta ação NÃO PODE ser desfeita!\n\n` +
      `Digite "DELETAR" para confirmar ou clique Cancelar`
    )) return;
    
    try {
  const response = await apiFetch(`/api/tickets/${selectedTicket.id}/permanent`, { method: 'DELETE' });

      if (response.ok) {
        setShowActionsMenu(false);
        // Atualizar dados após deleção permanente
        if (onTicketUpdate) {
          onTicketUpdate();
        }
        // Mostrar mensagem de sucesso
        alert('✅ Ticket e todas as informações do contato foram removidos permanentemente.');
      } else {
        const errorData = await response.json();
        alert(`❌ Erro: ${errorData.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao deletar ticket permanentemente:', error);
      alert('❌ Erro ao deletar ticket. Tente novamente.');
    }
  };

  // Scroll automático para o final quando novas mensagens chegam
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Fechar menu de ações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showActionsMenu && !event.target.closest('.actions-menu')) {
        setShowActionsMenu(false);
      }
      if (showMessageMenu && !event.target.closest('.message-menu')) {
        setShowMessageMenu(null);
      }
      if (showReactionPicker && !event.target.closest('.reaction-picker')) {
        setShowReactionPicker(null);
      }
      if (qrOpen && !event.target.closest('.quick-replies-popover')) {
        setQrOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu, showMessageMenu, showReactionPicker]);

  // Quick Replies fetch and filter
  const openQuickReplies = async () => {
    setQrOpen(true);
    setQrLoading(true);
    try {
  const res = await apiFetch('/api/quick-replies');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.quickReplies || data.rows || data.items || []);
      setQrItems(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Erro ao carregar respostas rápidas', e);
    } finally {
      setQrLoading(false);
    }
  };

  const filteredQr = useMemo(() => {
    const base = Array.isArray(qrItems) ? qrItems : [];
    const q = qrQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((i) => (i.shortcut||'').toLowerCase().includes(q) || (i.title||'').toLowerCase().includes(q) || (i.content||'').toLowerCase().includes(q));
  }, [qrItems, qrQuery]);

  const insertQuickReply = async (item) => {
    // Check if this is an audio quick reply
    if (item.mediaType === 'audio' && item.mediaUrl) {
      await simulateAudioRecordingAndSend(item);
      setQrOpen(false);
      return;
    }
    
    let toInsert = item.processedContent || item.contentPreview || item.content || '';
    // If we have a shortcut, ask the API for the latest processed content
    if (item.shortcut) {
      try {
  const res = await apiFetch(`/api/quick-replies/shortcut/${encodeURIComponent(item.shortcut)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.processedContent) toInsert = data.processedContent;
        }
      } catch (e) {
        // Fallback to local content
      }
    }
    const base = newMessage || '';
    // Replace a leading /shortcut if present
    const replaced = base.replace(/\/(\w+)?$/, '').trim();
    const space = replaced && !replaced.endsWith(' ') ? ' ' : '';
    onNewMessageChange((replaced + space + (toInsert || '')).trimStart());
    setQrOpen(false);
  };

  // Scroll automático imediato quando enviar mensagem
  useEffect(() => {
    if (isSendingMessage && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isSendingMessage]);

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarInitials = (name) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const getRandomAvatarColor = (name) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleFileButtonClick = (type) => {
    // type: 'media' | 'document'
    if (type === 'media') {
      if (fileInputMediaRef.current) fileInputMediaRef.current.click();
    } else if (type === 'document') {
      if (fileInputDocRef.current) fileInputDocRef.current.click();
    } else {
      if (fileInputRef.current) fileInputRef.current.click();
    }
  };

  const handleSendContact = async () => {
    if (!selectedTicket) return alert('Selecione um ticket primeiro');

    const name = window.prompt('Nome do contato:');
    if (!name) return;
    const phone = window.prompt('Número do contato (apenas dígitos, com DDI):', '5511999999999');
    if (!phone) return;

    // Montar vCard simples
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;TYPE=CELL:${phone}\nEND:VCARD`;

    const blob = new Blob([vcard], { type: 'text/vcard' });
    const file = new File([blob], `${name.replace(/\s+/g, '_')}.vcf`, { type: 'text/vcard' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sender', 'user');

    try {
      setUploadingFile(true);
  const resp = await apiFetch(`/api/ticket-messages/${selectedTicket.id}/media`, { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('Falha ao enviar contato');
      alert('Contato enviado');
    } catch (err) {
      console.error('Erro ao enviar contato:', err);
      alert('Erro ao enviar contato');
    } finally {
      setUploadingFile(false);
    }
  };

  // Suporte a múltiplos arquivos de qualquer tipo
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedTicket) return;
    setUploadingFile(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sender', 'user');
  await apiFetch(`/api/ticket-messages/${selectedTicket.id}/media`, { method: 'POST', body: formData });
      }
      // reset input
      try { e.target.value = ''; } catch (e) {}
    } catch (err) {
      console.error('Erro ao enviar arquivo', err);
      alert('Erro ao enviar arquivo');
    } finally {
      setUploadingFile(false);
    }
  };

  // Função utilitária para gerar URL correta de arquivo
  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return '';
    
    // Se já é uma URL completa, retornar como está
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    
    // Se começa com /, usar diretamente com API_BASE_URL
    if (fileUrl.startsWith('/')) {
      return `${API_BASE_URL}${fileUrl}`;
    }
    
    // Se não começa com /, adicionar /uploads/ se necessário
    if (!fileUrl.startsWith('uploads/')) {
      return `${API_BASE_URL}/uploads/${fileUrl}`;
    }
    
    return `${API_BASE_URL}/${fileUrl}`;
  };

  // Função para deletar mensagem
  const handleDeleteMessage = async (messageId, deleteForAll = false) => {
    if (!window.confirm(deleteForAll ? 
      'Tem certeza que deseja apagar esta mensagem para todos?' : 
      'Tem certeza que deseja apagar esta mensagem apenas para você?'
    )) return;

    try {
      const response = await apiFetch(`/api/ticket-messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteForAll })
      });

      if (response.ok) {
        setShowMessageMenu(null);
        // A mensagem será removida via socket
      } else {
        alert('Erro ao deletar mensagem');
      }
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      alert('Erro ao deletar mensagem');
    }
  };

  // Função para reagir à mensagem
  const handleReactToMessage = async (messageId, reaction) => {
    try {
      const response = await apiFetch(`/api/ticket-messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction, userId: user.id })
      });

      if (response.ok) {
        setShowReactionPicker(null);
        // A reação será atualizada via socket
      } else {
        alert('Erro ao reagir à mensagem');
      }
    } catch (error) {
      console.error('Erro ao reagir à mensagem:', error);
      alert('Erro ao reagir à mensagem');
    }
  };

  // Simular gravação e envio de áudio das respostas rápidas
  const simulateAudioRecordingAndSend = async (quickReplyItem) => {
    if (!selectedTicket || !quickReplyItem.mediaUrl) return;
    
    try {
      console.log('🎵 Iniciando simulação de gravação de áudio da resposta rápida');
      
      // Iniciar simulação de gravação
      setIsRecording(true);
      setRecordingTime(0);
      
      // Notificar WhatsApp que está gravando
      console.log('🎵 Notificando WhatsApp sobre início da gravação');
      await notifyRecordingStatus(true);
      
      // Simular tempo de gravação baseado na duração real do áudio ou nome do arquivo
      const fileName = quickReplyItem.fileName || 'audio';
      const simulatedDuration = Math.min(Math.max(fileName.length * 0.2, 2), 10); // Entre 2-10 segundos
      
      console.log(`🎵 Simulando gravação por ${simulatedDuration} segundos`);
      
      // Mostrar feedback visual de que está "gravando"
      let pulseCount = 0;
      
      // Animar contador de tempo com pulso visual
      const interval = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 0.1;
          pulseCount++;
          
          // A cada 5 decimos de segundo, fazer um "pulso" visual
          if (pulseCount % 5 === 0) {
            console.log(`🎵 Gravando... ${newTime.toFixed(1)}s`);
          }
          
          return newTime >= simulatedDuration ? simulatedDuration : newTime;
        });
      }, 100);
      
      // Aguardar duração simulada
      await new Promise(resolve => setTimeout(resolve, simulatedDuration * 1000));
      
      // Parar animação
      clearInterval(interval);
      setIsRecording(false);
      setRecordingTime(0);
      
      // Notificar WhatsApp que parou de gravar
      console.log('🎵 Notificando WhatsApp sobre fim da gravação');
      await notifyRecordingStatus(false);
      
      // Enviar status "digitando" para simular processamento do áudio
      console.log('🎵 Enviando status "digitando" enquanto processa áudio');
      await notifyTypingStatus(true);
      
      // Pequena pausa antes de enviar (simular processamento)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Parar status de digitação
      await notifyTypingStatus(false);
      
      // Enviar o arquivo de áudio da resposta rápida
      console.log('🎵 Enviando áudio gravado');
      await sendQuickReplyAudio(quickReplyItem, simulatedDuration);
      
    } catch (error) {
      console.error('🎵 Erro ao simular gravação de áudio:', error);
      setIsRecording(false);
      setRecordingTime(0);
      await notifyRecordingStatus(false);
      throw error;
    }
  };

  // Enviar áudio de resposta rápida
  const sendQuickReplyAudio = async (quickReplyItem, duration = null) => {
    if (!selectedTicket || !quickReplyItem.mediaUrl) return;
    
    try {
      setUploadingFile(true);
      
      console.log('🎵 Iniciando envio de áudio de resposta rápida:', {
        mediaUrl: quickReplyItem.mediaUrl,
        ticketId: selectedTicket.id,
        fileName: quickReplyItem.fileName,
        duration: duration
      });
      
      // Fetch do arquivo de áudio
  const audioResponse = await fetch(`${API_BASE_URL}${quickReplyItem.mediaUrl}`, { credentials: 'include' });
      
      console.log('🎵 Resposta do fetch do áudio:', audioResponse.status, audioResponse.statusText);
      
      if (!audioResponse.ok) {
        throw new Error(`Não foi possível carregar o arquivo de áudio: ${audioResponse.status} ${audioResponse.statusText}`);
      }
      
      const audioBlob = await audioResponse.blob();
      console.log('🎵 Blob do áudio carregado:', {
        size: audioBlob.size,
        type: audioBlob.type
      });
      
      // Validar se o áudio tem tamanho mínimo
      if (audioBlob.size < 1000) {
        throw new Error('Arquivo de áudio da resposta rápida muito pequeno');
      }
      
      // Gerar nome único para o arquivo com timestamp
      const timestamp = Date.now();
      
      // Para notas de voz, usar sempre nome apropriado para PTT
      const audioFileName = `voice_quick_reply_${timestamp}.webm`;
      
      // Criar o arquivo com mimetype otimizado para WhatsApp PTT
      const audioFile = new File([audioBlob], audioFileName, { 
        type: 'audio/webm;codecs=opus' // Formato otimizado para PTT
      });
      
      console.log('🎵 Arquivo PTT criado:', {
        name: audioFile.name,
        size: audioFile.size,
        type: audioFile.type,
        originalType: audioBlob.type
      });
      
      // Criar FormData com parâmetros otimizados para PTT
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('sender', 'quick-reply'); // Marcar como quick reply
      formData.append('messageType', 'audio'); // Indicar que é áudio
      formData.append('isVoiceNote', 'true'); // FORÇAR como nota de voz PTT
      
      // Adicionar duração se disponível
      if (duration && duration > 0) {
        formData.append('audioDuration', duration.toString());
        console.log('🎵 Duração da quick reply adicionada:', duration, 'segundos');
      } else {
        // Estimar duração baseada no tamanho do arquivo
        const estimatedDuration = Math.max(1, Math.floor(audioBlob.size / 8000)); // Estimativa baseada em 8KB/s
        formData.append('audioDuration', estimatedDuration.toString());
        console.log('🎵 Duração estimada para quick reply:', estimatedDuration, 'segundos');
      }
      
      // Adicionar conteúdo de texto se houver
      if (quickReplyItem.content) {
        formData.append('content', quickReplyItem.content);
        console.log('🎵 Conteúdo de texto da quick reply adicionado:', quickReplyItem.content);
      }
      
      console.log('🎵 Enviando PTT de quick reply para API...');
      
      // Enviar via API
  const response = await apiFetch(`/api/ticket-messages/${selectedTicket.id}/media`, { method: 'POST', body: formData });
      
      console.log('🎵 Resposta da API para quick reply:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('🎵 Erro da API ao enviar quick reply:', errorData);
        throw new Error(`Erro ao enviar áudio de quick reply: ${response.status} - ${errorData}`);
      }
      
      const responseData = await response.json();
      console.log('🎵 PTT de resposta rápida enviado com sucesso:', responseData);
      
    } catch (error) {
      console.error('🎵 Erro ao enviar PTT de resposta rápida:', error);
      setRecordingError(`Erro ao enviar áudio de quick reply: ${error.message}`);
      alert(`Erro ao enviar áudio de quick reply: ${error.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  // ===============================
  // FUNÇÕES DE GRAVAÇÃO DE ÁUDIO
  // ===============================

  // Iniciar gravação de áudio
  const startRecording = async () => {
    try {
      setRecordingError(null);
      
      // Verificar suporte do navegador
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não suporta gravação de áudio');
      }
      
      // Verificar suporte do MediaRecorder
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder não suportado pelo navegador');
      }
      
      // Solicitar permissão de microfone com configurações otimizadas
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Reduzido para melhor compatibilidade
          channelCount: 1    // Mono para PTT
        } 
      });
      
      // Verificar formatos suportados (prioridade: webm > ogg > mp4)
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/ogg;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Usar padrão do navegador
          }
        }
      }
      
      console.log('🎵 Usando mimetype:', mimeType);
      
      // Criar MediaRecorder com configurações otimizadas
      const recorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log('🎵 Chunk gravado:', event.data.size, 'bytes');
        }
      };
      
      recorder.onstop = () => {
        console.log('🎵 Gravação parada, total de chunks:', chunks.length);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.onerror = (event) => {
        console.error('🎵 Erro no MediaRecorder:', event.error);
        setRecordingError('Erro durante a gravação: ' + event.error);
      };
      
      // Definir estados
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Iniciar gravação
      recorder.start(1000); // Gerar chunks a cada segundo
      
      // Iniciar contador de tempo
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);
      
      // Notificar WhatsApp que está gravando
      await notifyRecordingStatus(true);
      
    } catch (error) {
      console.error('🎵 Erro ao iniciar gravação:', error);
      setRecordingError(`Erro ao acessar microfone: ${error.message}`);
    }
  };

  // Parar gravação de áudio
  const stopRecording = async () => {
    if (!mediaRecorder || !isRecording) return;
    
    try {
      // Parar gravação
      mediaRecorder.stop();
      
      // Limpar interval
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      
      // Aguardar chunks serem processados
      await new Promise(resolve => {
        mediaRecorder.onstop = async () => {
          try {
            // Criar blob do áudio
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            // Resetar estados
            setIsRecording(false);
            setMediaRecorder(null);
            setAudioChunks([]);
            setRecordingTime(0);
            
            // Notificar WhatsApp que parou de gravar
            await notifyRecordingStatus(false);
            
            // Enviar áudio se maior que 1 segundo
            if (recordingTime >= 1) {
              await sendAudioMessage(audioBlob);
            }
            
            resolve();
          } catch (error) {
            console.error('Erro ao processar áudio:', error);
            setRecordingError('Erro ao processar gravação.');
            resolve();
          }
        };
      });
      
    } catch (error) {
      console.error('Erro ao parar gravação:', error);
      setRecordingError('Erro ao finalizar gravação.');
      
      // Cleanup em caso de erro
      setIsRecording(false);
      setMediaRecorder(null);
      setAudioChunks([]);
      setRecordingTime(0);
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
    }
  };

  // Cancelar gravação
  const cancelRecording = async () => {
    if (!isRecording) return;
    
    try {
      // Parar media recorder sem salvar
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
      
      // Limpar interval
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      
      // Resetar estados
      setIsRecording(false);
      setMediaRecorder(null);
      setAudioChunks([]);
      setRecordingTime(0);
      
      // Notificar WhatsApp que parou de gravar
      await notifyRecordingStatus(false);
      
    } catch (error) {
      console.error('Erro ao cancelar gravação:', error);
    }
  };

  // Notificar status de gravação ao WhatsApp
  const notifyRecordingStatus = async (isRecording) => {
    if (!selectedTicket) return;
    
    try {
      console.log(`🎵 Enviando status de gravação: ${isRecording ? 'INICIANDO' : 'PARANDO'}`);
      
      const response = await apiFetch(`/api/tickets/${selectedTicket.id}/recording-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRecording })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`🎵 Status de gravação ${isRecording ? 'iniciado' : 'parado'} com sucesso:`, result);
      } else {
        console.error(`🎵 Erro ao definir status de gravação:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error('🎵 Erro ao notificar status de gravação:', error);
    }
  };

  // Notificar status de digitação ao WhatsApp
  const notifyTypingStatus = async (isTyping) => {
    if (!selectedTicket) return;
    
    try {
      console.log(`⌨️ Enviando status de digitação: ${isTyping ? 'INICIANDO' : 'PARANDO'}`);
      
      const response = await apiFetch(`/api/tickets/${selectedTicket.id}/typing-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`⌨️ Status de digitação ${isTyping ? 'iniciado' : 'parado'} com sucesso:`, result);
      } else {
        console.error(`⌨️ Erro ao definir status de digitação:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error('⌨️ Erro ao notificar status de digitação:', error);
    }
  };

  // Enviar mensagem de áudio
  const sendAudioMessage = async (audioBlob) => {
    if (!selectedTicket || !audioBlob) {
      console.error('🎵 Ticket ou audioBlob não disponível');
      return;
    }
    
    try {
      setUploadingFile(true);
      
      console.log('🎵 Processando áudio para envio:', {
        size: audioBlob.size,
        type: audioBlob.type,
        duration: recordingTime
      });
      
      // Validar se o áudio tem tamanho mínimo
      if (audioBlob.size < 1000) {
        throw new Error('Áudio muito curto ou corrompido');
      }
      
      // Validar duração mínima
      if (recordingTime < 1) {
        throw new Error('Gravação muito curta (mínimo 1 segundo)');
      }
      
      // Criar FormData com informações detalhadas
      const formData = new FormData();
      
      // Gerar nome único com timestamp
      const timestamp = Date.now();
      const fileName = `voice_note_${timestamp}.webm`;
      
      // Criar arquivo com tipo correto
      const audioFile = new File([audioBlob], fileName, { 
        type: audioBlob.type || 'audio/webm;codecs=opus'
      });
      
      // Adicionar dados ao FormData
      formData.append('file', audioFile);
      formData.append('sender', 'user');
      formData.append('messageType', 'audio');
      formData.append('isVoiceNote', 'true'); // CRUCIAL: marcar como PTT
      formData.append('audioDuration', recordingTime.toString());
      
      console.log('🎵 Enviando PTT:', {
        fileName: fileName,
        size: audioFile.size,
        type: audioFile.type,
        duration: recordingTime,
        isVoiceNote: true
      });
      
      // Enviar para API
  const response = await apiFetch(`/api/ticket-messages/${selectedTicket.id}/media`, { method: 'POST', body: formData });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🎵 Erro da API:', response.status, errorText);
        throw new Error(`Erro no servidor: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('🎵 PTT enviado com sucesso:', result);
      
    } catch (error) {
      console.error('🎵 Erro ao enviar PTT:', error);
      setRecordingError(`Erro ao enviar áudio: ${error.message}`);
      alert(`Erro ao enviar áudio: ${error.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  // Formatar tempo de gravação
  const formatRecordingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Componente de ondas sonoras animadas
  const AudioWaves = ({ isActive }) => {
    const waveCount = 15;
    const waves = [];
    
    for (let i = 0; i < waveCount; i++) {
      const animationClass = `animate-audio-wave-${(i % 5) + 1}`;
      const delay = `${i * 100}ms`;
      
      waves.push(
        <div
          key={i}
          className={`w-1 bg-red-500 rounded-full ${isActive ? animationClass : ''}`}
          style={{
            height: isActive ? 'auto' : '8px',
            animationDelay: delay,
            minHeight: '4px'
          }}
        />
      );
    }
    
    return (
      <div className="flex items-center space-x-1">
        {waves}
      </div>
    );
  };

  // Player de áudio WhatsApp-like
  function WhatsAppAudioPlayer({ src }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState(false);
    const [fileValid, setFileValid] = useState(true);

    // Corrige src absoluto para qualquer caminho relativo
    const audioSrc = useMemo(() => {
      return getFileUrl(src);
    }, [src]);

    useEffect(() => {
      setError(false);
      setFileValid(true);
      const audio = audioRef.current;
      if (!audio) return;
      
      const update = () => setCurrentTime(audio.currentTime);
      const loaded = () => setDuration(audio.duration);
      const handleError = (e) => {
        setError(true);
        console.error('Erro de áudio:', { 
          error: e.target?.error, 
          src: audioSrc,
          originalSrc: src 
        });
      };
      
      audio.addEventListener('timeupdate', update);
      audio.addEventListener('loadedmetadata', loaded);
      audio.addEventListener('error', handleError);
      
      return () => {
        audio.removeEventListener('timeupdate', update);
        audio.removeEventListener('loadedmetadata', loaded);
        audio.removeEventListener('error', handleError);
      };
    }, [audioSrc]);

    // Valida se o arquivo existe quando há erro
    useEffect(() => {
      if (error && audioSrc) {
        fetch(audioSrc, { method: 'HEAD' })
          .then(res => {
            if (!res.ok || (res.headers.has('Content-Length') && parseInt(res.headers.get('Content-Length')) === 0)) {
              setFileValid(false);
            }
          })
          .catch(() => setFileValid(false));
      }
    }, [audioSrc, error]);

    const togglePlay = async () => {
      const audio = audioRef.current;
      if (!audio) return;
      
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        try {
          await audio.play();
          setPlaying(true);
        } catch (err) {
          setError(true);
          console.error('Erro ao reproduzir áudio:', err);
        }
      }
    };

    const format = (s) => {
      if (isNaN(s)) return '0:00';
      const m = Math.floor(s / 60);
      const ss = Math.floor(s % 60).toString().padStart(2, '0');
      return `${m}:${ss}`;
    };

    const playAudioDirect = async () => {
      try {
        const audio = new Audio(audioSrc);
        await audio.play();
      } catch (err) {
        console.error('Erro ao reproduzir áudio:', err);
        window.open(audioSrc, '_blank');
      }
    };

    if (error) {
      if (!fileValid) {
        return (
          <div className="flex flex-col items-start w-56 bg-red-500/20 rounded-lg p-3">
            <span className="text-xs text-red-400 mb-2">❌ Arquivo de áudio indisponível</span>
            <span className="text-xs text-slate-400 mb-2 break-all">{src}</span>
            <a 
              href={audioSrc} 
              download 
              className="text-blue-400 hover:text-blue-300 underline text-xs"
            >
              Tentar baixar arquivo
            </a>
          </div>
        );
      }
      
      return (
        <div className="flex items-center space-x-3 w-64 p-2 bg-slate-700/50 rounded-lg">
          <button 
            onClick={playAudioDirect}
            className="p-2 rounded-full bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
            title="Reproduzir áudio"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21 5,3"/>
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex-1 h-1 bg-slate-500 rounded-full mb-1">
              <div className="h-1 bg-green-500 rounded-full w-0"></div>
            </div>
            <span className="text-xs text-slate-300">🎵 Arquivo de áudio</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-3 w-64 p-2 bg-slate-700/30 rounded-lg backdrop-blur-sm">
        <button 
          onClick={togglePlay} 
          className="p-2 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-all duration-200 hover:scale-105"
          title={playing ? "Pausar" : "Reproduzir"}
        >
          {playing ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21 5,3"/>
            </svg>
          )}
        </button>
        <audio
          ref={audioRef}
          src={audioSrc}
          onEnded={() => setPlaying(false)}
          preload="metadata"
        />
        <div className="flex-1">
          <div className="flex-1 h-2 bg-slate-500 rounded-full relative mb-2">
            <div 
              className="absolute top-0 left-0 h-2 bg-yellow-400 rounded-full transition-all duration-300" 
              style={{ width: duration ? `${(currentTime/duration)*100}%` : '0%' }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-slate-300">
            <span>{format(currentTime)}</span>
            <span>{format(duration)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Modal de áudio customizado
  function AudioModal({ open, src, onClose }) {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
        <div className="bg-slate-800 rounded-lg p-8 flex flex-col items-center shadow-2xl">
          <audio src={src} controls autoPlay className="w-96 mb-4" />
          <button onClick={onClose} className="px-4 py-2 bg-yellow-500 text-slate-900 rounded hover:bg-yellow-400 transition-colors font-medium">Fechar</button>
        </div>
      </div>
    );
  }

  if (!selectedTicket) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.1)_0%,transparent_70%)]"></div>
        
        <div className="text-center text-slate-400 animate-fadeIn relative z-10">
          <div className="relative mb-6">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-slate-500/20">
              <ChatBubbleBottomCenterTextIcon className="w-12 h-12 text-slate-300" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full animate-pulse shadow-lg"></div>
          </div>
          <h3 className="text-2xl font-bold mb-3 text-white bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">
            Selecione uma conversa
          </h3>
          <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
            Escolha uma conversa da lista ao lado para começar a enviar mensagens e interagir com seus clientes
          </p>
          
          {/* Decorative elements */}
          <div className="flex justify-center mt-8 space-x-2">
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse animation-delay-200"></div>
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse animation-delay-400"></div>
          </div>
        </div>
      </div>
    );
  }

  // Usar dados reais do contato se disponíveis, senão usar dados do ticket
  const displayName = contactInfo?.name || contactInfo?.pushname || selectedTicket?.Contact?.name || selectedTicket?.Contact?.pushname || selectedTicket.contact;
  const displayNumber = contactInfo?.formattedNumber || selectedTicket?.Contact?.formattedNumber || selectedTicket.contact;
  const avatarUrl = contactInfo?.profilePicUrl || selectedTicket?.Contact?.profilePicUrl;

return (
    <div className="flex-1 flex flex-col bg-slate-700 h-screen max-h-screen">
        {/* Chat Header */}
  <div className="p-3 sm:p-4 border-b border-slate-600/50 bg-gradient-to-r from-slate-800 to-slate-900 backdrop-blur-sm relative z-40">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                    {/* Mobile Back Button */}
                    {onBackToList && (
                        <button
                            onClick={onBackToList}
                            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 mr-1"
                        >
                            <ArrowRightIcon className="w-5 h-5 rotate-180" />
                        </button>
                    )}
                    
                    <div className="relative">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden shadow-lg ring-2 ring-yellow-500/20 transition-all duration-300 hover:ring-yellow-500/40">
                            {avatarUrl ? (
                                <img 
                                    src={avatarUrl} 
                                    alt={displayName}
                                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                                    onError={(e) => {
                                        try {
                                          if (e && e.target) {
                                            if (e.target.style) e.target.style.display = 'none';
                                            if (e.target.nextSibling && e.target.nextSibling.style) {
                                              e.target.nextSibling.style.display = 'flex';
                                            }
                                          }
                                        } catch (err) {
                                          console.warn('onError image handler failed', err);
                                        }
                                    }}
                                />
                            ) : null}
                            <div 
                                className={`w-full h-full flex items-center justify-center ${getRandomAvatarColor(displayName)} ${avatarUrl ? 'hidden' : 'flex'} bg-gradient-to-br shadow-inner`}
                            >
                                {getAvatarInitials(displayName)}
                            </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-base sm:text-lg tracking-tight truncate">{displayName}</h3>
                        <div className="flex items-center space-x-2">
                            <p className="text-slate-300 text-xs sm:text-sm font-medium truncate">
                                {displayNumber.includes('@') ? displayNumber.split('@')[0] : displayNumber}
                            </p>
                            {loadingContact && (
                                <div className="hidden sm:flex items-center space-x-1 bg-blue-500/20 px-2 py-1 rounded-full">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-blue-400 font-medium">Atualizando...</span>
                                </div>
                            )}
                            {isRealTime && !loadingContact && (
                                <div className="flex items-center space-x-1 bg-green-500/20 px-2 py-1 rounded-full backdrop-blur-sm">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-green-400 font-medium">
                                        {isSendingMessage ? (
                                          <span className="flex items-center space-x-1">
                                            <span>Enviando</span>
                                            <div className="flex space-x-0.5">
                                              <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                              <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                              <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                            </div>
                                          </span>
                                        ) : 'Online'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2">
                    <button className="hidden sm:block p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200 hover:scale-105">
                        <VideoCameraIcon className="w-5 h-5" />
                    </button>
                    <button className="hidden sm:block p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200 hover:scale-105">
                        <PhoneIcon className="w-5 h-5" />
                    </button>
                    
                    {/* WWebJS Advanced Actions Button */}
                    <button 
                        onClick={() => setShowWWebJSPanel(!showWWebJSPanel)}
                        className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-200 hover:scale-105 ${
                            showWWebJSPanel 
                                ? 'bg-gradient-to-r from-purple-400 to-purple-500 text-slate-900 shadow-lg shadow-purple-500/25' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                        title="WhatsApp Features"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.087z"/>
                        </svg>
                    </button>
                    
                    {/* Contact Info Button */}
                    <button 
                        onClick={onToggleContactInfo}
                        className="p-2 sm:p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg sm:rounded-xl transition-all duration-200 hover:scale-105"
                    >
                        <InformationCircleIcon className="w-5 h-5" />
                    </button>
                    
                    {/* Menu de Ações */}
                    <div className="relative actions-menu">
                        <button 
                            onClick={() => setShowActionsMenu(!showActionsMenu)}
                            className="p-2 sm:p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg sm:rounded-xl transition-all duration-200 hover:scale-105"
                        >
                            <EllipsisVerticalIcon className="w-5 h-5" />
                        </button>
                        
                        {showActionsMenu && (
                            <div className="absolute right-0 top-12 sm:top-14 w-48 sm:w-56 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl shadow-2xl z-[10000] backdrop-blur-sm">
                                <div className="py-2">
                                    <button
                                        onClick={() => {
                                            setShowTransferModal(true);
                                            setShowActionsMenu(false);
                                        }}
                                        className="w-full flex items-center space-x-3 px-3 sm:px-4 py-3 text-left text-slate-300 hover:bg-slate-700/50 transition-all duration-200 hover:text-white group touch-manipulation"
                                    >
                                        <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                                            <ArrowRightIcon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium text-sm sm:text-base">Transferir Ticket</span>
                                    </button>
                                    
                                    <button
                                        onClick={() => {
                                            setShowPriorityModal(true);
                                            setShowActionsMenu(false);
                                        }}
                                        className="w-full flex items-center space-x-3 px-3 sm:px-4 py-3 text-left text-slate-300 hover:bg-slate-700/50 transition-all duration-200 hover:text-white group touch-manipulation"
                                    >
                                        <div className="p-2 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition-colors">
                                            <FlagIcon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium text-sm sm:text-base">Alterar Prioridade</span>
                                    </button>
                                    
                                    <div className="border-t border-slate-700/50 my-2"></div>
                                    
                                    <button
                                        onClick={handleResolveTicket}
                                        className="w-full flex items-center space-x-3 px-4 py-3 text-left text-green-400 hover:bg-slate-700/50 transition-all duration-200 hover:text-green-300 group"
                                    >
                                        <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                                            <CheckIcon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium">Resolver Ticket</span>
                                    </button>
                                    
                                    <button
                                        onClick={handleCloseTicket}
                                        className="w-full flex items-center space-x-3 px-4 py-3 text-left text-red-400 hover:bg-slate-700/50 transition-all duration-200 hover:text-red-300 group"
                                    >
                                        <div className="p-2 bg-red-500/20 rounded-lg group-hover:bg-red-500/30 transition-colors">
                                            <XMarkIcon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium">Fechar Ticket</span>
                                    </button>
                                    
                                    <div className="border-t border-slate-700/50 my-2"></div>
                                    
                                    <button
                                        onClick={handlePermanentDeleteTicket}
                                        className="w-full flex items-center space-x-3 px-4 py-3 text-left text-red-600 hover:bg-red-900/20 transition-all duration-200 hover:text-red-500 group"
                                    >
                                        <div className="p-2 bg-red-600/20 rounded-lg group-hover:bg-red-600/30 transition-colors">
                                            <TrashIcon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium">🗑️ Deletar Permanentemente</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={onToggleContactInfo}
                        className={`p-3 rounded-xl transition-all duration-200 hover:scale-105 ${
                            showContactInfo 
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 shadow-lg shadow-yellow-500/25' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }`}
                    >
                        <InformationCircleIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            {/* Tags Section */}
            {selectedTicket?.id && (
                <div className="mt-3 pt-3 border-t border-slate-600/30">
                    <TagSelector
                        ticketId={selectedTicket.id}
                        selectedTags={ticketTags}
                        onTagsChange={handleTagsChange}
                        compact={true}
                        className="flex-wrap"
                    />
                </div>
            )}
        </div>

        {/* Messages Area */}
  <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-gradient-to-b from-slate-600 to-slate-700 custom-scrollbar touch-manipulation relative z-10">
            {messages.filter(message => message && message.sender).map((message, index) => {
                const messageAnimation = `message-enter ${message.sender === 'user' || message.sender === 'system' ? 'message-my' : 'message-other'}`;
                
                return (
                    <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : message.sender === 'system' ? 'justify-end' : 'justify-start'} ${messageAnimation}`}
                    >
                        <div className={`flex items-end space-x-3 max-w-xs lg:max-w-md xl:max-w-lg ${
                            message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : message.sender === 'system' ? 'flex-row-reverse space-x-reverse' : ''
                        }`}>
                            <div className="relative group">
                                {message.sender === 'system' ? (
                                    // Avatar especial para mensagens do sistema
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg ring-2 ring-blue-400/30">
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                            ) : (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs overflow-hidden shadow-lg transition-all duration-300 ${
                                    message.sender === 'user' ? 'ring-2 ring-yellow-500/30' : 'ring-2 ring-slate-500/30'
                                } group-hover:scale-110`}>
                                    {message.sender === 'user' ? (
                                        <div className="w-full h-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                                            {user?.name ? getAvatarInitials(user.name) : 'U'}
                                        </div>
                                    ) : (
                                        <>
                                            {avatarUrl ? (
                                                <img 
                                                    src={avatarUrl} 
                                                    alt={displayName}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                    onError={(e) => {
                                                        try {
                                                          if (e && e.target) {
                                                            if (e.target.style) e.target.style.display = 'none';
                                                            if (e.target.nextSibling && e.target.nextSibling.style) {
                                                              e.target.nextSibling.style.display = 'flex';
                                                            }
                                                          }
                                                        } catch (err) {
                                                          console.warn('onError image handler failed', err);
                                                        }
                                                    }}
                                                />
                                            ) : null}
                                            <div 
                                                className={`w-full h-full flex items-center justify-center ${getRandomAvatarColor(displayName)} ${avatarUrl ? 'hidden' : 'flex'} bg-gradient-to-br shadow-inner`}
                                            >
                                                {getAvatarInitials(displayName)}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            {/* Indicador de status online para contato */}
                            {message.sender !== 'user' && message.sender !== 'system' && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            )}
                        </div>
                        <div className={`px-4 py-2 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl relative group ${
                            message.sender === 'user'
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 rounded-br-md'
                                : message.sender === 'system'
                                ? 'bg-gradient-to-r from-blue-50/10 to-indigo-50/10 text-blue-100 rounded-bl-md border border-blue-400/40 backdrop-blur-sm'
                                : 'bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-bl-md border border-slate-600/50'
                        }`}>
                            {/* Menu de contexto da mensagem */}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="relative message-menu">
                                    <button
                                        onClick={() => setShowMessageMenu(showMessageMenu === message.id ? null : message.id)}
                                        className="p-1 bg-black/20 hover:bg-black/40 rounded-full transition-colors duration-200"
                                        title="Opções da mensagem"
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                        </svg>
                                    </button>

                                    {/* Dropdown do menu de contexto */}
                                    {showMessageMenu === message.id && (
                                        <div className="absolute right-0 top-8 w-48 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-lg shadow-2xl z-50 backdrop-blur-sm">
                                            <div className="py-1">
                                                {/* Reagir à mensagem */}
                                                <button
                                                    onClick={() => {
                                                        setShowReactionPicker(showReactionPicker === message.id ? null : message.id);
                                                        setShowMessageMenu(null);
                                                    }}
                                                    className="w-full flex items-center space-x-2 px-3 py-2 text-left text-slate-300 hover:bg-slate-700/50 transition-colors duration-200"
                                                >
                                                    <span>😊</span>
                                                    <span className="text-sm">Reagir</span>
                                                </button>

                                                {/* Responder (futura implementação) */}
                                                <button
                                                    onClick={() => setShowMessageMenu(null)}
                                                    className="w-full flex items-center space-x-2 px-3 py-2 text-left text-slate-300 hover:bg-slate-700/50 transition-colors duration-200"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                    </svg>
                                                    <span className="text-sm">Responder</span>
                                                </button>

                                                <div className="border-t border-slate-700/50 my-1"></div>

                                                {/* Deletar apenas para mim */}
                                                <button
                                                    onClick={() => handleDeleteMessage(message.id, false)}
                                                    className="w-full flex items-center space-x-2 px-3 py-2 text-left text-orange-400 hover:bg-slate-700/50 transition-colors duration-200"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    <span className="text-sm">Apagar para mim</span>
                                                </button>

                                                {/* Deletar para todos (apenas para mensagens próprias) */}
                                                {message.sender === 'user' && (
                                                    <button
                                                        onClick={() => handleDeleteMessage(message.id, true)}
                                                        className="w-full flex items-center space-x-2 px-3 py-2 text-left text-red-400 hover:bg-slate-700/50 transition-colors duration-200"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        <span className="text-sm">Apagar para todos</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Seletor de reações */}
                            {showReactionPicker === message.id && (
                                <div className="absolute bottom-full left-0 mb-2 p-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-lg shadow-2xl z-50 backdrop-blur-sm reaction-picker">
                                    <div className="flex space-x-1">
                                        {availableReactions.map((reaction) => (
                                            <button
                                                key={reaction}
                                                onClick={() => handleReactToMessage(message.id, reaction)}
                                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors duration-200 text-lg hover:scale-110 transform"
                                                title={`Reagir com ${reaction}`}
                                            >
                                                {reaction}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Exibir mídia se houver */}
                            {message.fileUrl && (
                                <div className="mb-3">
                                    {message.fileType && message.fileType.startsWith('image') ? (
                                        <div className="relative group">
                                            <img 
                                                src={getFileUrl(message.fileUrl)}
                                                alt={message.fileName} 
                                                className="max-w-xs max-h-60 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                                                onClick={() => window.open(getFileUrl(message.fileUrl), '_blank')}
                                                onError={(e) => {
                                                    console.error('Erro ao carregar imagem:', message.fileUrl);
                                                    try {
                                                      if (e && e.target) {
                                                        if (e.target.style) e.target.style.display = 'none';
                                                        if (e.target.nextSibling && e.target.nextSibling.style) {
                                                          e.target.nextSibling.style.display = 'block';
                                                        }
                                                      }
                                                    } catch (err) {
                                                      console.warn('onError image handler failed', err);
                                                    }
                                                }}
                                            />
                                            <div className="hidden p-3 bg-red-500/20 rounded-lg text-red-400 text-sm">
                                                ❌ Erro ao carregar imagem: {message.fileName}
                                            </div>
                                            {/* Overlay de zoom ao hover */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    ) : message.fileType && message.fileType.startsWith('video') ? (
                                        <video 
                                            src={getFileUrl(message.fileUrl)}
                                            controls 
                                            className="max-w-xs max-h-60 rounded-lg shadow-md"
                                            onError={(e) => {
                                                  console.error('Erro ao carregar vídeo:', message.fileUrl);
                                                  try {
                                                    if (e && e.target) {
                                                      if (e.target.style) e.target.style.display = 'none';
                                                      if (e.target.nextSibling && e.target.nextSibling.style) {
                                                        e.target.nextSibling.style.display = 'block';
                                                      }
                                                    }
                                                  } catch (err) {
                                                    console.warn('onError video handler failed', err);
                                                  }
                                            }}
                                        >
                                            <div className="hidden p-3 bg-red-500/20 rounded-lg text-red-400 text-sm">
                                                ❌ Erro ao carregar vídeo: {message.fileName}
                                            </div>
                                        </video>
                                    ) : (message.fileType && message.fileType.startsWith('audio')) || 
                                         (message.mimeType && message.mimeType.startsWith('audio')) ? (
                                        <WhatsAppAudioPlayer 
                                            src={getFileUrl(message.fileUrl)} 
                                            duration={message.duration}
                                            isPtt={message.isPtt || false}
                                        />
                                    ) : (
                                        <div className="flex items-center space-x-3 p-3 bg-black/10 rounded-lg border border-white/10">
                                            <button
                                                onClick={() => {
                                                    if (message.fileType && message.fileType.includes('pdf')) {
                                                        setAudioModalSrc(null);
                                                        setShowAudioModal(false);
                                                        setPdfPreviewUrl(getFileUrl(message.fileUrl));
                                                        setShowPdfPreview(true);
                                                    } else {
                                                        window.open(getFileUrl(message.fileUrl), '_blank');
                                                    }
                                                }}
                                                className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors duration-200 focus:outline-none group"
                                                title="Visualizar arquivo"
                                            >
                                                <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors duration-200">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <span className="font-medium block">{message.fileName || 'Documento'}</span>
                                                    <span className="text-xs opacity-70">{message.fileType}</span>
                                                </div>
                                            </button>
                                            <a
                                                href={getFileUrl(message.fileUrl)}
                                                download={message.fileName || true}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                                                title="Baixar arquivo"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                                                </svg>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                            {message.content && (
                                <>
                                    {/* Exibir informações do grupo se for mensagem de grupo */}
                                    {message.isFromGroup && message.participantName && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-5 h-5 rounded-full bg-green-400/20 flex items-center justify-center">
                                                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                                                </svg>
                                            </div>
                                            <span className="text-xs text-green-300 font-medium">
                                                {message.participantName}
                                            </span>
                                            {message.groupName && (
                                                <span className="text-xs text-slate-400">
                                                    • {message.groupName}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    
                                    {message.sender === 'system' && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center">
                                                <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <span className="text-xs text-blue-300 font-medium uppercase tracking-wide">Sistema</span>
                                        </div>
                                    )}
                                    <p className={`text-sm leading-relaxed ${message.sender === 'system' ? 'font-medium' : ''}`}>
                                        {message.content}
                                    </p>
                                    {message.sender === 'system' && (
                                        <div className="mt-2 text-xs text-blue-300/80 italic">
                                            Mensagem automática do sistema
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Exibir reações */}
                            {message.reactions && message.reactions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {message.reactions.reduce((acc, reaction) => {
                                        const existing = acc.find(r => r.reaction === reaction.reaction);
                                        if (existing) {
                                            existing.count++;
                                            existing.users.push(reaction.User);
                                        } else {
                                            acc.push({
                                                reaction: reaction.reaction,
                                                count: 1,
                                                users: [reaction.User]
                                            });
                                        }
                                        return acc;
                                    }, []).map((reactionGroup, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center space-x-1 px-2 py-1 bg-black/20 rounded-full text-xs cursor-pointer hover:bg-black/30 transition-colors duration-200"
                                            title={`${reactionGroup.users.map(u => u?.name || 'Usuário').join(', ')} reagiu com ${reactionGroup.reaction}`}
                                            onClick={() => handleReactToMessage(message.id, reactionGroup.reaction)}
                                        >
                                            <span>{reactionGroup.reaction}</span>
                                            <span className="text-xs">{reactionGroup.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs opacity-70 font-medium">
                                    {formatMessageTime(message.timestamp)}
                                </span>
                                {/* You can add message status icons here if needed */}
                            </div>
                            </div>
                        </div>
                    </div>
                );
            })}
            {/* Referência para scroll automático */}
            <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-3 border-t border-slate-600/30 bg-slate-800">
            {/* Mensagem de erro de gravação */}
            {recordingError && (
                <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <div className="text-red-400 text-sm">
                        {recordingError}
                    </div>
                </div>
            )}
            
            <div className="flex items-end space-x-2">
        {/* Photos/Videos button */}
        <button
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors duration-200 disabled:opacity-50"
          onClick={() => handleFileButtonClick('media')}
          disabled={uploadingFile || isRecording}
          type="button"
          title="Fotos/Vídeos"
        >
          <VideoCameraIcon className="w-4 h-4" />
          <input
            type="file"
            ref={fileInputMediaRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept="image/*,video/*,audio/*"
            multiple
          />
        </button>

        {/* Documents button */}
        <button
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors duration-200 disabled:opacity-50"
          onClick={() => handleFileButtonClick('document')}
          disabled={uploadingFile || isRecording}
          type="button"
          title="Documentos"
        >
          <FileText className="w-4 h-4" />
          <input
            type="file"
            ref={fileInputDocRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept=".pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.zip,.rar,.7z"
            multiple
          />
        </button>

        {/* Contact button */}
        <button
          className="hidden sm:block p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors duration-200 disabled:opacity-50"
          onClick={handleSendContact}
          disabled={uploadingFile || isRecording}
          type="button"
          title="Enviar contato"
        >
          <UserPlusIcon className="w-4 h-4" />
        </button>
                
                {/* Área de input principal */}
                <div className={`flex-1 bg-slate-700 rounded-xl px-3 py-2 flex items-center border border-slate-600/40 min-h-[36px] focus-within:border-yellow-500/60 ${
                    isRecording ? 'opacity-50' : ''
                }`}>
                    {isRecording ? (
                        /* Interface de gravação com ondas sonoras */
                        <div className="flex-1 flex items-center justify-center space-x-4">
                            <AudioWaves isActive={isRecording} />
                            <span className="text-red-400 font-medium">Gravando...</span>
                            <div className="text-white font-mono text-sm bg-black/20 px-2 py-1 rounded">
                                {formatRecordingTime(recordingTime)}
                            </div>
                        </div>
                    ) : (
                        /* Input de texto normal */
                        <textarea
                            rows="1"
                            className="flex-1 bg-transparent text-white placeholder-slate-400 focus:outline-none text-sm resize-none"
                            placeholder="Digite sua mensagem..."
                            value={newMessage}
                            onChange={(e) => {
                              const val = e.target.value;
                              onNewMessageChange(val);
                              
                              // Auto-resize textarea
                              e.target.style.height = 'auto';
                              const newHeight = Math.min(e.target.scrollHeight, 80);
                              e.target.style.height = newHeight + 'px';
                              
                              if (val.endsWith('/') && !isRecording) {
                                if (!qrOpen) openQuickReplies();
                                setQrQuery('');
                              } else if (/\/(\w+)$/.test(val)) {
                                if (!qrOpen) openQuickReplies();
                                const m = val.match(/\/(\w+)$/);
                                setQrQuery(m ? m[1] : '');
                              } else if (qrOpen) {
                                setQrOpen(false);
                              }
                            }}
                            onKeyDown={(e) => {
                                if (
                                    e.key === 'Enter' &&
                                    !e.shiftKey &&
                                    !isSendingMessage &&
                                    !isRecording &&
                                    newMessage.trim()
                                ) {
                                    e.preventDefault();
                                    onSendMessage();
                                }
                            }}
                            disabled={isSendingMessage}
                            style={{ 
                              minHeight: '20px',
                              maxHeight: '80px'
                            }}
                        />
                    )}
                    
                    {/* Botões do lado direito */}
                    <div className="flex items-center space-x-1 ml-2">
                        {isRecording ? (
                            /* Botões durante gravação */
                            <>
                                <button
                                    onClick={cancelRecording}
                                    className="p-2 text-slate-300 hover:text-red-400 hover:bg-red-600/20 rounded-lg transition-colors duration-200"
                                    title="Cancelar gravação"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={stopRecording}
                                    className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors duration-200"
                                    title="Enviar áudio"
                                >
                                    <CheckIcon className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            /* Botões normais */
                            <>
                                {/* Botão de microfone - só aparece quando não tem texto */}
                                {!newMessage.trim() && (
                                    <button
                                        className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-600/20 rounded-lg transition-colors duration-200 disabled:opacity-50"
                                        onClick={startRecording}
                                        disabled={uploadingFile || isSendingMessage}
                                        type="button"
                                        title="Gravar áudio"
                                    >
                                        <MicrophoneIcon className="w-4 h-4" />
                                    </button>
                                )}
                                
                                {/* Botão de enviar - só aparece quando tem texto */}
                                {newMessage.trim() && (
                                    <button
                                        className={`p-2 rounded-lg transition-colors duration-200 ${
                                            isSendingMessage
                                                ? 'bg-gray-600 cursor-not-allowed text-gray-400 opacity-70'
                                                : 'bg-green-600 text-white hover:bg-green-500'
                                        }`}
                                        onClick={onSendMessage}
                                        disabled={isSendingMessage}
                                        type="button"
                                        title={isSendingMessage ? "Enviando..." : "Enviar mensagem"}
                                    >
                                        {isSendingMessage ? (
                                          <div className="animate-spin">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                          </div>
                                        ) : (
                                          <PaperAirplaneIcon className="w-4 h-4" />
                                        )}
                                    </button>
                                )}
                                {/* Quick Replies Button */}
                                {!isRecording && (
                                  <div className="relative quick-replies-popover">
                                    <button
                                      className={`p-2 rounded-lg transition-colors duration-200 ${qrOpen ? 'bg-yellow-500 text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                                      onClick={() => (qrOpen ? setQrOpen(false) : openQuickReplies())}
                                      type="button"
                                      title="Respostas rápidas"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                        <path d="M7.266 3.04a.75.75 0 01.694.805l-.234 3.273h3.809l.234-3.273a.75.75 0 011.499.107l-.234 3.166H16a.75.75 0 010 1.5h-3.092l-.24 3.35H15a.75.75 0 010 1.5h-2.482l-.234 3.166a.75.75 0 01-1.499-.107l.234-3.059H7.21l-.234 3.166a.75.75 0 01-1.499-.107l.234-3.059H4a.75.75 0 010-1.5h1.571l.24-3.35H4a.75.75 0 010-1.5h1.928l.234-3.273a.75.75 0 01.805-.694zM8.48 8.118l-.24 3.35h3.808l.24-3.35H8.48z" />
                                      </svg>
                                    </button>


                                    {qrOpen && (
                                      <div className="absolute bottom-12 right-0 w-72 sm:w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 max-h-64 overflow-y-auto">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-slate-300 text-sm">/</span>
                                          <input
                                            autoFocus
                                            value={qrQuery}
                                            onChange={(e)=>setQrQuery(e.target.value)}
                                            placeholder="Atalho, título ou conteúdo"
                                            className="flex-1 bg-slate-700 text-white text-sm rounded px-2 py-1 outline-none"
                                          />
                                        </div>
                                        <div className="max-h-64 overflow-auto divide-y divide-slate-700">
                                          {qrLoading ? (
                                            <div className="py-6 text-center text-slate-400">Carregando...</div>
                                          ) : filteredQr.length === 0 ? (
                                            <div className="py-6 text-center text-slate-400">Nenhuma resposta encontrada</div>
                                          ) : (
                                            filteredQr.map(item => (
                                              <button
                                                key={item.id}
                                                onClick={() => insertQuickReply(item)}
                                                className="w-full text-left py-2 px-2 hover:bg-slate-700 rounded-lg"
                                              >
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    {item.mediaType === 'audio' && (
                                                      <span className="text-green-400" title="Áudio">🎵</span>
                                                    )}
                                                    {item.mediaType === 'image' && (
                                                      <span className="text-blue-400" title="Imagem">🖼️</span>
                                                    )}
                                                    {item.mediaType === 'video' && (
                                                      <span className="text-purple-400" title="Vídeo">🎬</span>
                                                    )}
                                                    {item.mediaType === 'document' && (
                                                      <span className="text-orange-400" title="Documento">📄</span>
                                                    )}
                                                    <div className="font-medium text-white text-sm">{item.title || item.content?.slice(0,40) || 'Resposta'}</div>
                                                  </div>
                                                  <span className="text-xs text-slate-300 bg-slate-700 rounded px-2 py-0.5">/{item.shortcut}</span>
                                                </div>
                                                {item.content && (
                                                  <div className="text-xs text-slate-300 mt-1 line-clamp-2">{item.content}</div>
                                                )}
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Modais */}
        <TransferModal
            isOpen={showTransferModal}
            onClose={() => setShowTransferModal(false)}
            ticket={selectedTicket}
            onTransfer={handleTransfer}
        />

        <PriorityModal
            isOpen={showPriorityModal}
            onClose={() => setShowPriorityModal(false)}
            ticket={selectedTicket}
            onPriorityChange={handlePriorityChange}
        />

        {/* Modal de áudio */}
        <AudioModal open={showAudioModal} src={audioModalSrc} onClose={() => setShowAudioModal(false)} />

        {/* Modal de preview de PDF */}
        {showPdfPreview && pdfPreviewUrl && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="relative w-full max-w-5xl h-[90vh] bg-gradient-to-br from-slate-900 to-slate-800 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-700">
                        <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
                            <span>📄</span>
                            <span>Visualizar PDF</span>
                        </h3>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => window.open(pdfPreviewUrl, '_blank')}
                                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 hover:scale-105"
                                title="Abrir em nova aba"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-4.553a1.5 1.5 0 00-2.121-2.121L13 7.879M19 19H5a2 2 0 01-2-2V5a2 2 0 012-2h7" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setShowPdfPreview(false)}
                                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 hover:scale-105"
                                title="Fechar"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <iframe
                        src={pdfPreviewUrl}
                        title="Visualizar PDF"
                        className="flex-1 w-full bg-white rounded-b-2xl"
                    />
                </div>
            </div>
        )}

        {/* WWebJS Advanced Actions Panel */}
        <div className={`fixed inset-y-0 right-0 w-96 bg-gradient-to-br from-slate-800 to-slate-900 border-l border-slate-700/50 shadow-2xl transform transition-transform duration-300 ease-in-out z-40 ${
            showWWebJSPanel ? 'translate-x-0' : 'translate-x-full'
        }`}>
            <div className="flex flex-col h-full">
                {/* Panel Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-gradient-to-r from-purple-600/20 to-purple-500/20">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.087z"/>
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">WhatsApp Features</h3>
                            <p className="text-slate-400 text-sm">Recursos Avançados</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowWWebJSPanel(false)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Panel Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    <WWebJSAdvancedActions 
                        sessionId={selectedTicket?.sessionId}
                        contactNumber={selectedTicket?.contact}
                        onClose={() => setShowWWebJSPanel(false)}
                    />
                </div>
            </div>
        </div>

        {/* Overlay for mobile */}
        {showWWebJSPanel && (
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
                onClick={() => setShowWWebJSPanel(false)}
            />
        )}


    </div>
);
}