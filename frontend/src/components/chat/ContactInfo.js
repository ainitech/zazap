import React, { useState, useEffect, useRef } from 'react';
import { 
  VideoCameraIcon,
  PhoneIcon,
  InformationCircleIcon,
  DocumentIcon,
  PhotoIcon,
  PlayIcon,
  MusicalNoteIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function ContactInfo({ selectedTicket, showContactInfo }) {
  const [contactInfo, setContactInfo] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('media'); // 'media' or 'documents'
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const socketRef = useRef(null);

  // Conectar ao WebSocket quando o componente monta
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(API_URL, {
        transports: ['websocket'],
        autoConnect: true
      });

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

  // Buscar mídias e anexos
  useEffect(() => {
    if (selectedTicket?.id) {
      fetchMediaAndAttachments();
    }
  }, [selectedTicket]);

  const fetchContactInfo = async () => {
    try {
      // Só mostrar loading se não temos dados do contato ainda
      if (!contactInfo) {
        setLoading(true);
      }
      const response = await fetch(`${API_URL}/api/contacts/${selectedTicket.contactId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
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
        fetch(`${API_URL}/api/tickets/${selectedTicket.id}/media`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch(`${API_URL}/api/tickets/${selectedTicket.id}/attachments`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        setMediaFiles(mediaData);
        console.log('📸 Mídias carregadas:', mediaData);
      }

      if (attachmentsResponse.ok) {
        const attachmentsData = await attachmentsResponse.json();
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

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
      {/* Contact Header */}
      <div className="p-6 border-b border-slate-700 text-center">
        <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-lg font-medium overflow-hidden">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`w-full h-full flex items-center justify-center ${getRandomAvatarColor(displayName)} ${avatarUrl ? 'hidden' : 'flex'}`}
          >
            {getAvatarInitials(displayName)}
          </div>
        </div>
        <h3 className="text-white text-lg font-medium mb-1">{displayName}</h3>
        <p className="text-slate-400 text-sm mb-4">
          {displayNumber.includes('@') ? displayNumber.split('@')[0] : displayNumber}
        </p>
        
        {loading && (
          <div className="text-slate-400 text-xs mb-4">
            Carregando informações...
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex justify-center space-x-3">
          <button className="p-3 bg-yellow-500 text-slate-900 rounded-full hover:bg-yellow-400">
            <VideoCameraIcon className="w-5 h-5" />
          </button>
          <button className="p-3 bg-yellow-500 text-slate-900 rounded-full hover:bg-yellow-400">
            <PhoneIcon className="w-5 h-5" />
          </button>
          <button className="p-3 bg-yellow-500 text-slate-900 rounded-full hover:bg-yellow-400">
            <InformationCircleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium">Mídias e Anexos</h4>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('media')}
              className={`px-3 py-1 text-xs rounded ${
                activeTab === 'media' 
                  ? 'bg-yellow-500 text-slate-900' 
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              Mídias
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-3 py-1 text-xs rounded ${
                activeTab === 'documents' 
                  ? 'bg-yellow-500 text-slate-900' 
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              Docs
            </button>
          </div>
        </div>

        {activeTab === 'media' && (
          <div className="grid grid-cols-3 gap-2">
            {mediaFiles.length > 0 ? (
              mediaFiles.slice(0, 5).map((media, index) => (
                <div
                  key={index}
                  className="aspect-square bg-slate-700 rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => {
                    setSelectedMedia(media);
                    setShowMediaModal(true);
                  }}
                >
                  {media.type === 'image' ? (
                    <img 
                      src={media.url} 
                      alt="Media" 
                      className="w-full h-full object-cover"
                    />
                  ) : media.type === 'video' ? (
                    <div className="w-full h-full bg-slate-600 flex items-center justify-center">
                      <PlayIcon className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-slate-600 flex items-center justify-center">
                      <PhotoIcon className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center text-slate-400 text-sm py-4">
                Nenhuma mídia encontrada
              </div>
            )}
            {mediaFiles.length > 5 && (
              <div className="aspect-square bg-slate-700 rounded-lg flex items-center justify-center">
                <span className="text-slate-400 text-sm">+{mediaFiles.length - 5}</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-2">
            {attachments.length > 0 ? (
              attachments.map((doc, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-slate-700 rounded-lg">
                  <DocumentIcon className="w-8 h-8 text-yellow-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{doc.name}</p>
                    <p className="text-slate-400 text-xs">{doc.size}</p>
                  </div>
                  <button className="text-slate-400 hover:text-white">
                    <ArrowDownTrayIcon className="w-5 h-5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 text-sm py-4">
                Nenhum documento encontrado
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para visualizar mídia */}
      {showMediaModal && selectedMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setShowMediaModal(false)}
              className="absolute top-2 right-2 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            
            {selectedMedia.type === 'image' ? (
              <img
                src={selectedMedia.url}
                alt="Media"
                className="max-w-full max-h-full object-contain"
              />
            ) : selectedMedia.type === 'video' ? (
              <video
                controls
                className="max-w-full max-h-full"
                src={selectedMedia.url}
              />
            ) : (
              <div className="bg-slate-800 p-8 rounded-lg">
                <p className="text-white">Tipo de mídia não suportado</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
