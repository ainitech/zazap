import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { getBaileysSession } from './baileysService.js';
import { Session } from '../models/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para baixar e processar mídia do WhatsApp
export const downloadAndProcessMedia = async (message, sessionId) => {
  try {
    console.log('📥 [MEDIA] Iniciando download de mídia...');
    
    // Verificar se a mensagem contém mídia
    const messageType = getMediaType(message);
    if (!messageType) {
      console.log('❌ [MEDIA] Mensagem não contém mídia');
      return null;
    }

    // Buscar sessão do Baileys
    const session = await Session.findByPk(sessionId);
    if (!session) {
      console.log('❌ [MEDIA] Sessão não encontrada');
      return null;
    }

    const sock = getBaileysSession(session.whatsappId);
    if (!sock) {
      console.log('❌ [MEDIA] Socket Baileys não encontrado');
      return null;
    }

    // Baixar mídia
    const buffer = await downloadMediaMessage(message, 'buffer', {}, {
      logger: undefined,
      reuploadRequest: sock.updateMediaMessage
    });

    if (!buffer) {
      console.log('❌ [MEDIA] Falha ao baixar mídia');
      return null;
    }

    // Processar e salvar arquivo
    const mediaInfo = await processAndSaveMedia(buffer, message, messageType);
    console.log('✅ [MEDIA] Mídia processada com sucesso:', mediaInfo);
    
    return mediaInfo;

  } catch (error) {
    console.error('❌ [MEDIA] Erro ao baixar mídia:', error);
    return null;
  }
};

// Função para identificar tipo de mídia
const getMediaType = (message) => {
  const msg = message.message;
  if (!msg) return null;

  if (msg.audioMessage) return 'audio';
  if (msg.imageMessage) return 'image';
  if (msg.videoMessage) return 'video';
  if (msg.documentMessage) return 'document';
  if (msg.stickerMessage) return 'sticker';

  return null;
};

// Função para processar e salvar mídia
const processAndSaveMedia = async (buffer, message, mediaType) => {
  try {
    const msg = message.message;
    let mediaObj = null;
    let mimeType = '';
    let fileName = '';
    let duration = null;

    // Extrair informações baseadas no tipo
    switch (mediaType) {
      case 'audio':
        mediaObj = msg.audioMessage;
        mimeType = mediaObj.mimetype || 'audio/ogg';
        fileName = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        duration = mediaObj.seconds || null;
        break;
      case 'image':
        mediaObj = msg.imageMessage;
        mimeType = mediaObj.mimetype || 'image/jpeg';
        fileName = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        break;
      case 'video':
        mediaObj = msg.videoMessage;
        mimeType = mediaObj.mimetype || 'video/mp4';
        fileName = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        duration = mediaObj.seconds || null;
        break;
      case 'document':
        mediaObj = msg.documentMessage;
        mimeType = mediaObj.mimetype || 'application/octet-stream';
        fileName = mediaObj.fileName || `document_${Date.now()}`;
        break;
      case 'sticker':
        mediaObj = msg.stickerMessage;
        mimeType = mediaObj.mimetype || 'image/webp';
        fileName = `sticker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        break;
    }

    // Determinar extensão baseada no mimetype
    const extension = getExtensionFromMimeType(mimeType);
    const finalFileName = `${fileName}.${extension}`;

    // Criar diretório de upload se não existir
    const uploadDir = path.join(process.cwd(), 'uploads', 'whatsapp');
    await fs.mkdir(uploadDir, { recursive: true });

    // Caminho do arquivo
    const filePath = path.join(uploadDir, finalFileName);
    
    // Salvar arquivo
    await fs.writeFile(filePath, buffer);
    
    // Para áudios, converter para MP3 se necessário
    if (mediaType === 'audio' && !mimeType.includes('mp3')) {
      const convertedPath = await convertAudioToMp3(filePath, finalFileName);
      if (convertedPath) {
        // Remover arquivo original
        await fs.unlink(filePath);
        return {
          type: mediaType,
          fileName: path.basename(convertedPath),
          filePath: `/uploads/whatsapp/${path.basename(convertedPath)}`,
          mimeType: 'audio/mpeg',
          size: buffer.length,
          duration: duration,
          isPtt: mediaObj.ptt || false
        };
      }
    }

    return {
      type: mediaType,
      fileName: finalFileName,
      filePath: `/uploads/whatsapp/${finalFileName}`,
      mimeType: mimeType,
      size: buffer.length,
      duration: duration,
      isPtt: mediaObj?.ptt || false
    };

  } catch (error) {
    console.error('❌ [MEDIA] Erro ao processar mídia:', error);
    throw error;
  }
};

// Função para converter áudio para MP3
const convertAudioToMp3 = async (inputPath, originalFileName) => {
  try {
    const outputFileName = originalFileName.replace(/\.[^/.]+$/, '.mp3');
    const outputPath = path.join(path.dirname(inputPath), outputFileName);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('mp3')
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .on('end', () => {
          console.log('✅ [MEDIA] Áudio convertido para MP3:', outputFileName);
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error('❌ [MEDIA] Erro ao converter áudio:', error);
          reject(error);
        })
        .save(outputPath);
    });
  } catch (error) {
    console.error('❌ [MEDIA] Erro na conversão de áudio:', error);
    return null;
  }
};

// Função para obter extensão baseada no mimetype
const getExtensionFromMimeType = (mimeType) => {
  const mimeToExt = {
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/avi': 'avi',
    'video/quicktime': 'mov',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt'
  };

  return mimeToExt[mimeType] || 'bin';
};

// Função para validar se uma mídia pode ser baixada
export const canDownloadMedia = (message) => {
  return getMediaType(message) !== null;
};

export default {
  downloadAndProcessMedia,
  canDownloadMedia
};
