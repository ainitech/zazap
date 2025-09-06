// Função para detectar corretamente o tipo de mensagem no Baileys
export const detectBaileysMessageType = (message) => {
  if (!message || !message.message) {
    return 'text';
  }

  const messageObj = message.message;
  
  // Verificar tipos específicos em ordem de prioridade
  
  // Mensagens de texto
  if (messageObj.conversation) {
    return 'text';
  }
  
  if (messageObj.extendedTextMessage) {
    return 'text';
  }
  
  // Mensagens de mídia
  if (messageObj.imageMessage) {
    return 'image';
  }
  
  if (messageObj.videoMessage) {
    return 'video';
  }
  
  if (messageObj.audioMessage) {
    // Verificar se é PTT (nota de voz)
    if (messageObj.audioMessage.ptt) {
      return 'audio'; // ou 'ptt' se preferir diferenciar
    }
    return 'audio';
  }
  
  if (messageObj.documentMessage) {
    return 'document';
  }
  
  if (messageObj.stickerMessage) {
    return 'sticker';
  }
  
  if (messageObj.locationMessage) {
    return 'location';
  }
  
  if (messageObj.contactMessage) {
    return 'contact';
  }
  
  if (messageObj.pollCreationMessage) {
    return 'poll';
  }
  
  if (messageObj.pollUpdateMessage) {
    return 'poll_response';
  }
  
  if (messageObj.reactionMessage) {
    return 'reaction';
  }
  
  // Outros tipos específicos do WhatsApp
  if (messageObj.liveLocationMessage) {
    return 'live_location';
  }
  
  if (messageObj.buttonsMessage) {
    return 'buttons';
  }
  
  if (messageObj.listMessage) {
    return 'list';
  }
  
  if (messageObj.templateMessage) {
    return 'template';
  }
  
  // Se não conseguiu detectar, usar o primeiro campo como fallback
  const firstKey = Object.keys(messageObj)[0];
  
  // Log para debug
  console.log('🔍 Tipo de mensagem não reconhecido:', {
    firstKey,
    availableKeys: Object.keys(messageObj),
    messageStructure: JSON.stringify(messageObj, null, 2).substring(0, 500)
  });
  
  // Tentar classificar pelo nome da chave
  if (firstKey && firstKey.includes('text') || firstKey.includes('conversation')) {
    return 'text';
  }
  
  if (firstKey && (firstKey.includes('image') || firstKey.includes('photo'))) {
    return 'image';
  }
  
  if (firstKey && firstKey.includes('video')) {
    return 'video';
  }
  
  if (firstKey && firstKey.includes('audio')) {
    return 'audio';
  }
  
  if (firstKey && firstKey.includes('document')) {
    return 'document';
  }
  
  // Se não conseguiu detectar, retornar 'text' como padrão seguro
  return 'text';
};

// Função para extrair conteúdo de texto da mensagem
export const extractBaileysMessageContent = (message) => {
  if (!message || !message.message) {
    return '';
  }

  const messageObj = message.message;
  
  // Tentar extrair texto em ordem de prioridade
  if (messageObj.conversation) {
    return messageObj.conversation;
  }
  
  if (messageObj.extendedTextMessage?.text) {
    return messageObj.extendedTextMessage.text;
  }
  
  // Para mensagens com mídia, tentar extrair caption
  if (messageObj.imageMessage?.caption) {
    return messageObj.imageMessage.caption;
  }
  
  if (messageObj.videoMessage?.caption) {
    return messageObj.videoMessage.caption;
  }
  
  if (messageObj.documentMessage?.caption) {
    return messageObj.documentMessage.caption;
  }
  
  // Para outros tipos de mídia sem texto
  if (messageObj.audioMessage) {
    return messageObj.audioMessage.ptt ? '🎵 Nota de voz' : '🎵 Áudio';
  }
  
  if (messageObj.imageMessage) {
    return '📷 Imagem';
  }
  
  if (messageObj.videoMessage) {
    return '🎥 Vídeo';
  }
  
  if (messageObj.documentMessage) {
    return `📄 ${messageObj.documentMessage.fileName || 'Documento'}`;
  }
  
  if (messageObj.stickerMessage) {
    return '😀 Figurinha';
  }
  
  if (messageObj.locationMessage) {
    return '📍 Localização';
  }
  
  if (messageObj.contactMessage) {
    return '👤 Contato';
  }
  
  if (messageObj.pollCreationMessage) {
    return '📊 Enquete';
  }
  
  if (messageObj.pollUpdateMessage) {
    return '✅ Resposta da enquete';
  }
  
  if (messageObj.reactionMessage) {
    return `👍 Reação: ${messageObj.reactionMessage.text}`;
  }
  
  // Fallback genérico
  return 'Mensagem de mídia';
};

export default {
  detectBaileysMessageType,
  extractBaileysMessageContent
};
