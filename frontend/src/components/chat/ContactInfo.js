import React, { useState, useEffect, useRef } from 'react';
import { 
  VideoCameraIcon,
  PhoneIcon,
  InformationCircleIcon,
  PhotoIcon,
  PlayIcon,
  MusicalNoteIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { FileText } from 'lucide-react';
import io from 'socket.io-client';
import { apiUrl, apiFetch, safeJson } from '../../utils/apiClient';

export default function ContactInfo({ selectedTicket, showContactInfo, onClose }) {
  const [contactInfo, setContactInfo] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('media'); // 'media' or 'documents'
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [ticketInfo, setTicketInfo] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const socketRef = useRef(null);


  // Conectar ao WebSocket quando o componente monta
  useEffect(() => {
    if (!socketRef.current) {
  socketRef.current = io(apiUrl('/').replace(/\/$/, ''), { transports: ['websocket'], autoConnect: true, withCredentials: true });

      // Listener para atualizações de contato
      socketRef.current.on('contact-updated', (updatedContact) => {
        console.log('👤 Contato atualizado via socket:', updatedContact);
        if (selectedTicket?.contactId === updatedContact.id) {
          setContactInfo(updatedContact);
        }
      });

      // Listener para novos contatos
      socketRef.current.on('contact-created', (newContact) => {
        console.log('🆕 Novo contato criado via socket:', newContact);
        if (selectedTicket?.contactId === newContact.id) {
          setContactInfo(newContact);
        }
      });

      console.log('🔌 WebSocket conectado no ContactInfo');
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        console.log('🔌 WebSocket desconectado do ContactInfo');
      }
    };
  }, []);

  // Atualizar quando o ticket selecionado muda
  useEffect(() => {
    if (selectedTicket?.contactId) {
      // Se o ticket já tem dados do contato, usar eles primeiro
      if (selectedTicket.Contact) {
        console.log('👤 Usando dados do contato do ticket:', selectedTicket.Contact);
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


  // Buscar mídias e anexos (todas as mídias do contato)
  useEffect(() => {
    const fetchAllContactMedia = async () => {
      if (selectedTicket?.contactId) {
        try {
          const response = await apiFetch(`/api/contacts/contact/${selectedTicket.contactId}/media`);
          if (response.ok) {
            const mediaData = await safeJson(response);
            setMediaFiles(mediaData);
            console.log('📸 Todas as mídias do contato carregadas:', mediaData);
          }
        } catch (error) {
          console.error('Erro ao buscar todas as mídias do contato:', error);
        }
      } else {
        setMediaFiles([]);
      }
    };
    fetchAllContactMedia();
  }, [selectedTicket?.contactId]);

  // Buscar ticket atualizado ao abrir o painel e atualizar em tempo real via socket
  useEffect(() => {
    const fetchTicketInfo = async (ticketId) => {
      if (!ticketId) {
        setTicketInfo(null);
        return;
      }
      try {
        const response = await apiFetch(`/api/tickets?ticketId=${ticketId}`);
        if (response.ok) {
          const data = await safeJson(response);
          setTicketInfo(Array.isArray(data) ? data[0] : data);
        }
      } catch (error) {
        console.error('Erro ao buscar informações do ticket:', error);
      }
    };

    fetchTicketInfo(selectedTicket?.id);

    // Listener para atualizações de status/prioridade do ticket via socket
    if (socketRef.current && selectedTicket?.id) {
      const handleTicketUpdate = (updatedTicket) => {
        if (updatedTicket.id === selectedTicket.id) {
          // Atualiza apenas status/prioridade, sem sobrescrever outros campos
          setTicketInfo((prev) => ({
            ...prev,
            ...updatedTicket
          }));
        }
      };
      socketRef.current.on('ticket-status-updated', handleTicketUpdate);
      socketRef.current.on('ticket-priority-updated', handleTicketUpdate);
      // Também escuta eventos de atualização geral do ticket
      socketRef.current.on('ticket-updated', handleTicketUpdate);
      return () => {
        if (socketRef.current) {
          socketRef.current.off('ticket-status-updated', handleTicketUpdate);
          socketRef.current.off('ticket-priority-updated', handleTicketUpdate);
          socketRef.current.off('ticket-updated', handleTicketUpdate);
        }
      };
    }
  }, [selectedTicket?.id]);

  const fetchContactInfo = async () => {
    try {
      // Só mostrar loading se não temos dados do contato ainda
      if (!contactInfo) {
        setLoading(true);
      }
      const response = await apiFetch(`/api/contacts/${selectedTicket.contactId}`);
      if (response.ok) {
        const data = await safeJson(response);
        console.log('👤 Informações do contato carregadas via API:', data);
        setContactInfo(data);
      }
    } catch (error) {
      console.error('Erro ao buscar informações do contato:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMediaAndAttachments = async () => {
    try {
      const [mediaResponse, attachmentsResponse] = await Promise.all([
        apiFetch(`/api/tickets/${selectedTicket.id}/media`),
        apiFetch(`/api/tickets/${selectedTicket.id}/attachments`)
      ]);

      if (mediaResponse.ok) {
        const mediaData = await safeJson(mediaResponse);
        setMediaFiles(mediaData);
        console.log('📸 Mídias carregadas:', mediaData);
      }

      if (attachmentsResponse.ok) {
        const attachmentsData = await safeJson(attachmentsResponse);
        setAttachments(attachmentsData);
        console.log('📎 Anexos carregados:', attachmentsData);
      }
    } catch (error) {
      console.error('Erro ao buscar mídias e anexos:', error);
    }
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

  if (!showContactInfo || !selectedTicket) {
    return null;
  }

  // Usar dados reais do contato se disponíveis, senão usar dados do ticket
  const displayName = contactInfo?.name || contactInfo?.pushname || selectedTicket.contact;
  const displayNumber = contactInfo?.formattedNumber || selectedTicket.contact;
  const avatarUrl = contactInfo?.profilePicUrl;
  const ticketStatus = ticketInfo?.chatStatus || selectedTicket?.chatStatus || 'waiting';
  const ticketPriority = ticketInfo?.priority || selectedTicket?.priority || 'normal';

  return (
    <div className="w-full lg:w-80 bg-gradient-to-b from-slate-900 to-slate-800 border-l border-slate-600 flex flex-col shadow-2xl">
      {/* Mobile Header with Close Button */}
      {onClose && (
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-600/50 bg-slate-800/90 backdrop-blur-sm">
          <h2 className="text-white font-semibold text-lg">Informações do Contato</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Contact Header */}
      <div className="p-4 sm:p-8 border-b border-slate-600/50 text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent"></div>
        
        <div className="relative z-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full mx-auto mb-4 sm:mb-6 flex items-center justify-center text-white text-lg sm:text-xl font-bold overflow-hidden shadow-xl ring-4 ring-yellow-500/20 transition-all duration-300 hover:ring-yellow-500/40 hover:scale-105">
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
          <h3 className="text-white text-lg sm:text-xl font-bold mb-2 tracking-tight">{displayName}</h3>
          <p className="text-slate-300 text-sm mb-4 sm:mb-6 font-medium">
            {displayNumber.includes('@') ? displayNumber.split('@')[0] : displayNumber}
          </p>
        </div>
        
        {/* Status e prioridade do ticket */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 mb-4 sm:mb-6">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all duration-200 hover:scale-105 ${
            ticketStatus === 'accepted' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/25' :
            ticketStatus === 'resolved' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/25' :
            ticketStatus === 'closed' ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-gray-500/25' :
            'bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 shadow-yellow-500/25'
          }`}>
            {ticketStatus === 'accepted' ? '✓ Em Atendimento' :
             ticketStatus === 'resolved' ? '✓ Resolvido' :
             ticketStatus === 'closed' ? '✗ Fechado' :
             '⏳ Aguardando'}
          </span>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all duration-200 hover:scale-105 ${
            ticketPriority === 'urgent' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/25' :
            ticketPriority === 'high' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/25' :
            ticketPriority === 'low' ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-blue-500/25' :
            'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-slate-500/25'
          }`}>
            {ticketPriority === 'urgent' ? '🔥 Urgente' :
             ticketPriority === 'high' ? '⚡ Alta' :
             ticketPriority === 'low' ? '📝 Baixa' :
             '➖ Normal'}
          </span>
        </div>
        
        {loading && (
          <div className="text-slate-300 text-sm mb-4 sm:mb-6 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Carregando informações...</span>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse animation-delay-150"></div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-center space-x-3 sm:space-x-4">
          <button className="p-3 sm:p-4 bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-900 rounded-full hover:from-yellow-300 hover:to-yellow-400 transition-all duration-200 shadow-lg hover:shadow-yellow-500/25 hover:scale-110 group touch-manipulation">
            <VideoCameraIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-200" />
          </button>
          <button className="p-3 sm:p-4 bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-900 rounded-full hover:from-yellow-300 hover:to-yellow-400 transition-all duration-200 shadow-lg hover:shadow-yellow-500/25 hover:scale-110 group touch-manipulation">
            <PhoneIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-200" />
          </button>
          <button className="p-3 sm:p-4 bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-900 rounded-full hover:from-yellow-300 hover:to-yellow-400 transition-all duration-200 shadow-lg hover:shadow-yellow-500/25 hover:scale-110 group touch-manipulation">
            <InformationCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-200" />
          </button>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="p-3 sm:p-4 border-b border-slate-600/50 relative">
        <div className="flex flex-col gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-white font-semibold text-sm sm:text-base">Arquivos</h4>
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
              {mediaFiles.length + attachments.length}
            </span>
          </div>
          <div className="flex space-x-1 bg-slate-700/50 rounded-lg p-1 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 touch-manipulation ${
                activeTab === 'media' 
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 shadow-lg' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
              }`}
            >
              <span>🖼️</span>
              <span>Mídias</span>
              {mediaFiles.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'media' ? 'bg-slate-900/20' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {mediaFiles.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 touch-manipulation ${
                activeTab === 'documents' 
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 shadow-lg' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
              }`}
            >
              <span>📄</span>
              <span>Docs</span>
              {attachments.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'documents' ? 'bg-slate-900/20' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {attachments.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'media' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {mediaFiles.length > 0 ? (
              mediaFiles.slice(0, 5).map((media, index) => (
                <div
                  key={index}
                  className="aspect-square bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg sm:rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/10 border border-slate-600/30 touch-manipulation"
                  onClick={() => {
                    setSelectedMedia(media);
                    setShowMediaModal(true);
                  }}
                >
                  <div className="relative w-full h-full">
                    {media.type === 'image' ? (
                      <img 
                        src={media.url} 
                        alt="Media" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : media.type === 'video' ? (
                      <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                        <div className="p-3 bg-yellow-500/20 rounded-full backdrop-blur-sm">
                          <PlayIcon className="w-6 h-6 text-yellow-400" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                        <div className="p-3 bg-blue-500/20 rounded-full backdrop-blur-sm">
                          <PhotoIcon className="w-6 h-6 text-blue-400" />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center text-slate-400 text-sm py-8 bg-slate-700/30 rounded-xl border-2 border-dashed border-slate-600">
                <PhotoIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma mídia encontrada</p>
              </div>
            )}
            {mediaFiles.length > 5 && (
              <div className="aspect-square bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center border border-slate-600/30 group cursor-pointer transition-all duration-300 hover:scale-105">
                <div className="text-center">
                  <span className="text-slate-300 text-lg font-bold">+{mediaFiles.length - 5}</span>
                  <p className="text-slate-400 text-xs mt-1">mais</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-3">
            {attachments.length > 0 ? (
              attachments.map((doc, index) => {
                const handleDocClick = () => {
                  if (doc.mimetype && doc.mimetype.includes('pdf')) {
                    setPdfUrl(doc.url);
                    setShowPdfModal(true);
                  } else {
                    window.open(doc.url, '_blank');
                  }
                };
                return (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-xl border border-slate-600/30 hover:border-yellow-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/5 group">
                    <div className="p-3 bg-gradient-to-br from-yellow-400/20 to-yellow-500/20 rounded-lg group-hover:from-yellow-400/30 group-hover:to-yellow-500/30 transition-all duration-300">
                      <FileText className="w-6 h-6 text-yellow-400 cursor-pointer group-hover:scale-110 transition-transform duration-300" onClick={handleDocClick} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate cursor-pointer hover:text-yellow-400 transition-colors duration-200" onClick={handleDocClick}>
                        {doc.filename || doc.name || 'Documento'}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">{doc.size || 'Tamanho desconhecido'}</p>
                    </div>
                    <button 
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-600/50 rounded-lg transition-all duration-200 group-hover:scale-110" 
                      onClick={() => window.open(doc.url, '_blank')} 
                      title="Baixar"
                    >
                      <ArrowDownTrayIcon className="w-5 h-5" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-slate-400 text-sm py-8 bg-slate-700/30 rounded-xl border-2 border-dashed border-slate-600">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum documento encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para visualizar mídias */}
      {showMediaModal && selectedMedia && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative max-w-6xl max-h-[90vh] w-full">
            <button
              onClick={() => setShowMediaModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-yellow-400 bg-black/50 hover:bg-black/70 rounded-full p-3 transition-all duration-200 z-10 backdrop-blur-sm"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50">
              {selectedMedia.type === 'image' ? (
                <img
                  src={selectedMedia.url}
                  alt="Media"
                  className="w-full max-h-[80vh] object-contain"
                />
              ) : selectedMedia.type === 'video' ? (
                <video
                  controls
                  className="w-full max-h-[80vh] object-contain"
                  src={selectedMedia.url}
                />
              ) : (
                <div className="p-12 text-center">
                  <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                  <p className="text-white text-lg">Tipo de mídia não suportado</p>
                  <p className="text-slate-400 text-sm mt-2">Não é possível visualizar este tipo de arquivo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para visualizar PDF */}
      {showPdfModal && pdfUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-5xl h-[90vh] bg-slate-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/50">
              <h3 className="text-white font-semibold text-lg">📄 Visualizar PDF</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.open(pdfUrl, '_blank')}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                  title="Abrir em nova aba"
                >
                  <EyeIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
                  title="Fechar"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <iframe
              src={pdfUrl}
              title="Visualizar PDF"
              className="flex-1 w-full bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
