import React, { useEffect, useRef, useState, useMemo } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';
import TransferModal from './TransferModal';
import { FileText } from 'lucide-react';
import PriorityModal from './PriorityModal';
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
  XMarkIcon
} from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Adicionando estilos CSS customizados
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
  }
  
  .animate-slideIn {
    animation: slideIn 0.3s ease-out;
  }
  
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
  }
  
  .scrollbar-thumb-slate-500::-webkit-scrollbar-thumb {
    background-color: #64748b;
    border-radius: 3px;
  }
  
  .scrollbar-track-slate-700::-webkit-scrollbar-track {
    background-color: #334155;
  }
  
  .message-bubble {
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

// Injetar estilos
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

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
  onTicketUpdate
}) {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  
  // Estados para informações do contato
  const [contactInfo, setContactInfo] = useState(null);
  const [loadingContact, setLoadingContact] = useState(false);
  
  // Estados para modais
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);

  // Adicionar estado para upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Estado para modal de áudio
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [audioModalSrc, setAudioModalSrc] = useState(null);

  // Estado para preview de PDF
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  // Estados para menu de contexto de mensagem
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);

  // Reações disponíveis
  const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🙏'];

  // Conectar ao WebSocket
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(API_URL, {
        auth: {
          token: localStorage.getItem('token')
        }
      });

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

  const fetchContactInfo = async () => {
    if (!selectedTicket?.contactId) return;
    
    try {
      // Só mostrar loading se não temos dados do contato ainda
      if (!contactInfo) {
        setLoadingContact(true);
      }
      const response = await fetch(`${API_URL}/api/contacts/${selectedTicket.contactId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
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
      const response = await fetch(`${API_URL}/api/tickets/${selectedTicket.id}/resolve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

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
      const response = await fetch(`${API_URL}/api/tickets/${selectedTicket.id}/close`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu, showMessageMenu, showReactionPicker]);

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

  const handleFileButtonClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Suporte a múltiplos arquivos de qualquer tipo
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !selectedTicket) return;
    setUploadingFile(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sender', 'user');
        await fetch(`${API_URL}/api/ticket-messages/${selectedTicket.id}/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });
      }
      e.target.value = '';
    } catch (err) {
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
    
    // Se começa com /, usar diretamente com API_URL
    if (fileUrl.startsWith('/')) {
      return `${API_URL}${fileUrl}`;
    }
    
    // Se não começa com /, adicionar /uploads/ se necessário
    if (!fileUrl.startsWith('uploads/')) {
      return `${API_URL}/uploads/${fileUrl}`;
    }
    
    return `${API_URL}/${fileUrl}`;
  };

  // Função para deletar mensagem
  const handleDeleteMessage = async (messageId, deleteForAll = false) => {
    if (!window.confirm(deleteForAll ? 
      'Tem certeza que deseja apagar esta mensagem para todos?' : 
      'Tem certeza que deseja apagar esta mensagem apenas para você?'
    )) return;

    try {
      const response = await fetch(`${API_URL}/api/ticket-messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
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
      const response = await fetch(`${API_URL}/api/ticket-messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
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
        <div className="p-4 border-b border-slate-600/50 bg-gradient-to-r from-slate-800 to-slate-900 backdrop-blur-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden shadow-lg ring-2 ring-yellow-500/20 transition-all duration-300 hover:ring-yellow-500/40">
                            {avatarUrl ? (
                                <img 
                                    src={avatarUrl} 
                                    alt={displayName}
                                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div 
                                className={`w-full h-full flex items-center justify-center ${getRandomAvatarColor(displayName)} ${avatarUrl ? 'hidden' : 'flex'} bg-gradient-to-br shadow-inner`}
                            >
                                {getAvatarInitials(displayName)}
                            </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-lg tracking-tight">{displayName}</h3>
                        <div className="flex items-center space-x-2">
                            <p className="text-slate-300 text-sm font-medium">
                                {displayNumber.includes('@') ? displayNumber.split('@')[0] : displayNumber}
                            </p>
                            {loadingContact && (
                                <div className="flex items-center space-x-1 bg-blue-500/20 px-2 py-1 rounded-full">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-blue-400 font-medium">Atualizando...</span>
                                </div>
                            )}
                            {isRealTime && !loadingContact && (
                                <div className="flex items-center space-x-1 bg-green-500/20 px-2 py-1 rounded-full">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-green-400 font-medium">
                                        {isSendingMessage ? 'Enviando...' : 'Online'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200 hover:scale-105">
                        <VideoCameraIcon className="w-5 h-5" />
                    </button>
                    <button className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200 hover:scale-105">
                        <PhoneIcon className="w-5 h-5" />
                    </button>
                    
                    {/* Menu de Ações */}
                    <div className="relative actions-menu">
                        <button 
                            onClick={() => setShowActionsMenu(!showActionsMenu)}
                            className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200 hover:scale-105"
                        >
                            <EllipsisVerticalIcon className="w-5 h-5" />
                        </button>
                        
                        {showActionsMenu && (
                            <div className="absolute right-0 top-14 w-56 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl shadow-2xl z-50 backdrop-blur-sm">
                                <div className="py-2">
                                    <button
                                        onClick={() => {
                                            setShowTransferModal(true);
                                            setShowActionsMenu(false);
                                        }}
                                        className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-300 hover:bg-slate-700/50 transition-all duration-200 hover:text-white group"
                                    >
                                        <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                                            <ArrowRightIcon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium">Transferir Ticket</span>
                                    </button>
                                    
                                    <button
                                        onClick={() => {
                                            setShowPriorityModal(true);
                                            setShowActionsMenu(false);
                                        }}
                                        className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-300 hover:bg-slate-700/50 transition-all duration-200 hover:text-white group"
                                    >
                                        <div className="p-2 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition-colors">
                                            <FlagIcon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium">Alterar Prioridade</span>
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
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-slate-600 to-slate-700 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-700">
            {messages.map((message, index) => (
                <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div className={`flex items-end space-x-3 max-w-xs lg:max-w-md xl:max-w-lg animate-fadeIn ${
                        message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                        <div className="relative group">
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
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
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
                            {/* Indicador de status online para contato */}
                            {message.sender !== 'user' && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            )}
                        </div>
                        <div className={`px-4 py-2 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl relative group ${
                            message.sender === 'user'
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 rounded-br-md'
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
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'block';
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
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                        >
                                            <div className="hidden p-3 bg-red-500/20 rounded-lg text-red-400 text-sm">
                                                ❌ Erro ao carregar vídeo: {message.fileName}
                                            </div>
                                        </video>
                                    ) : message.fileType && message.fileType.startsWith('audio') ? (
                                        <WhatsAppAudioPlayer src={getFileUrl(message.fileUrl)} />
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
                                <p className="text-sm leading-relaxed">{message.content}</p>
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
            ))}
            {/* Referência para scroll automático */}
            <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-slate-600/50 bg-gradient-to-r from-slate-800 to-slate-900">
            <div className="flex items-end space-x-3">
                <button
                    className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-50"
                    onClick={handleFileButtonClick}
                    disabled={uploadingFile}
                    type="button"
                >
                    <PaperClipIcon className="w-5 h-5" />
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        multiple
                    />
                </button>
                <div className="flex-1 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full px-4 py-3 flex items-center border border-slate-600/50 shadow-lg backdrop-blur-sm">
                    <input
                        type="text"
                        className="flex-1 bg-transparent text-white placeholder-slate-400 focus:outline-none"
                        placeholder="Digite sua mensagem..."
                        value={newMessage}
                        onChange={(e) => onNewMessageChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (
                                e.key === 'Enter' &&
                                !isSendingMessage &&
                                newMessage.trim()
                            ) {
                                onSendMessage();
                            }
                        }}
                        disabled={isSendingMessage}
                    />
                    <button
                        className={`ml-3 p-3 rounded-full transition-all duration-200 shadow-lg ${
                            isSendingMessage || !newMessage.trim()
                                ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                                : 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-slate-900 hover:from-yellow-300 hover:to-yellow-400 hover:scale-105 shadow-yellow-500/25'
                        }`}
                        onClick={onSendMessage}
                        disabled={isSendingMessage || !newMessage.trim()}
                        type="button"
                    >
                        <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
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
    </div>
);
}
