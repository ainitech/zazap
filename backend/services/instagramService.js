// Integração NÃO OFICIAL com Instagram usando instagram-private-api
// ATENÇÃO: Pode violar termos da plataforma. Use por sua conta e risco.
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { IgApiClient } from 'instagram-private-api';
import { ingestInboundMessage } from './multiChannelIngest.js';
import { emitToTicket, emitToAll } from './socket.js';

const sessions = new Map(); // sessionId -> { ig, username, createdAt, pollTimer, lastThreadItemIds }

// Função helper para determinar formato de entrada do FFmpeg
const getInputFormat = (mimetype) => {
  if (mimetype.includes('mp4')) return 'mp4';
  if (mimetype.includes('mpeg')) return 'mpeg';
  if (mimetype.includes('wav')) return 'wav';
  if (mimetype.includes('ogg')) return 'ogg';
  if (mimetype.includes('webm')) return 'webm';
  return 'auto'; // Deixar FFmpeg detectar automaticamente
};

// Função para converter áudio para formato compatível com Instagram (MP4 com AAC para voice notes)
const convertAudioForInstagram = (inputBuffer, originalMimetype) => {
  return new Promise((resolve, reject) => {
    console.log(`[Instagram] Convertendo áudio ${originalMimetype} para MP4 com AAC...`);
    
    // Criar arquivo temporário de entrada
    const tempDir = path.resolve(process.cwd(), 'uploads', 'temp');
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const inputPath = path.join(tempDir, `input_${timestamp}_${randomId}.audio`);
    const outputPath = path.join(tempDir, `output_${timestamp}_${randomId}.m4a`);
    
    // Garantir que o diretório temp existe
    try {
      if (!fsSync.existsSync(tempDir)) {
        fsSync.mkdirSync(tempDir, { recursive: true });
      }
    } catch (err) {
      console.error(`[Instagram] Erro ao criar diretório temp: ${err.message}`);
      return reject(err);
    }
    
    try {
      // Escrever buffer no arquivo temporário
      fsSync.writeFileSync(inputPath, inputBuffer);
      
      // Converter usando FFmpeg para M4A com codec AAC (formato esperado pelo Instagram para voice notes)
      ffmpeg(inputPath)
        .toFormat('mp4')
        .audioCodec('aac')
        .audioChannels(1) // Mono é obrigatório para voice notes
        .audioFrequency(44100) // 44.1kHz é o padrão do Instagram
        .audioBitrate('64k') // Bitrate otimizado para voice notes
        .outputOptions([
          '-movflags', '+faststart', // Otimização para streaming
          '-fflags', '+genpts' // Gerar timestamps se não existirem
        ])
        .on('start', (command) => {
          console.log(`[Instagram] Iniciando conversão FFmpeg para voice note: ${command}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[Instagram] Progresso da conversão: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          try {
            console.log(`[Instagram] Conversão para voice note concluída, lendo arquivo convertido...`);
            const convertedBuffer = fsSync.readFileSync(outputPath);
            
            // Limpar arquivos temporários
            fsSync.unlinkSync(inputPath);
            fsSync.unlinkSync(outputPath);
            
            console.log(`[Instagram] Áudio convertido com sucesso para voice note M4A (${convertedBuffer.length} bytes)`);
            resolve({
              buffer: convertedBuffer,
              mimetype: 'audio/mp4' // Mimetype correto para voice notes
            });
          } catch (readError) {
            console.error(`[Instagram] Erro ao ler arquivo convertido: ${readError.message}`);
            reject(readError);
          }
        })
        .on('error', (err) => {
          console.error(`[Instagram] Erro na conversão FFmpeg: ${err.message}`);
          
          // Limpar arquivos temporários em caso de erro
          try {
            if (fsSync.existsSync(inputPath)) fsSync.unlinkSync(inputPath);
            if (fsSync.existsSync(outputPath)) fsSync.unlinkSync(outputPath);
          } catch (cleanupError) {
            console.error(`[Instagram] Erro ao limpar arquivos temp: ${cleanupError.message}`);
          }
          
          // Verificar se é erro de FFmpeg não encontrado
          if (err.message.includes('spawn') || err.message.includes('ENOENT')) {
            reject(new Error('FFmpeg não encontrado no sistema. Instale o FFmpeg para conversão de áudio.'));
          } else {
            reject(new Error(`Conversão falhou: ${err.message}`));
          }
        })
        .save(outputPath);
        
    } catch (writeError) {
      console.error(`[Instagram] Erro ao escrever arquivo temporário: ${writeError.message}`);
      reject(writeError);
    }
  });
};

// Converter áudio para vídeo MP4 com imagem estática (única forma de enviar áudio no Instagram)
const convertAudioToVideoMP4 = (audioBuffer, originalMimetype) => {
  return new Promise((resolve, reject) => {
    console.log(`[Instagram] Convertendo áudio ${originalMimetype} para vídeo MP4...`);
    
    // Criar arquivo temporário de entrada
    const tempDir = path.resolve(process.cwd(), 'uploads', 'temp');
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const audioPath = path.join(tempDir, `audio_${timestamp}_${randomId}.audio`);
    const videoPath = path.join(tempDir, `video_${timestamp}_${randomId}.mp4`);
    
    // Criar uma imagem preta como placeholder para o vídeo
    const imagePath = path.join(tempDir, `image_${timestamp}_${randomId}.jpg`);
    
    // Garantir que o diretório temp existe
    try {
      if (!fsSync.existsSync(tempDir)) {
        fsSync.mkdirSync(tempDir, { recursive: true });
      }
    } catch (err) {
      console.error(`[Instagram] Erro ao criar diretório temp: ${err.message}`);
      return reject(err);
    }
    
    try {
      // Escrever buffer do áudio no arquivo temporário
      fsSync.writeFileSync(audioPath, audioBuffer);
      
      // Criar uma imagem preta de 640x640 (quadrado para Instagram)
      const createBlackImage = () => {
        return new Promise((resolveImg, rejectImg) => {
          ffmpeg()
            .input('color=black:s=640x640')
            .inputOptions(['-f', 'lavfi'])
            .outputOptions(['-vframes', '1'])
            .on('end', () => resolveImg())
            .on('error', rejectImg)
            .save(imagePath);
        });
      };
      
      // Primeiro criar a imagem preta
      createBlackImage().then(() => {
        // Converter áudio + imagem em vídeo MP4
        const inputFormat = getInputFormat(originalMimetype);
        const ffmpegCommand = ffmpeg()
          .input(imagePath)
          .inputOptions(['-loop', '1']) // Loop a imagem
          .input(audioPath);
        
        // Se soubermos o formato, especificar
        if (inputFormat !== 'auto') {
          ffmpegCommand.inputOptions([`-f`, inputFormat]);
        }
        
        ffmpegCommand
          .videoCodec('libx264') // Codec de vídeo H.264
          .audioCodec('aac') // Codec de áudio AAC
          .audioBitrate('128k')
          .audioChannels(2) // Stereo
          .audioFrequency(44100) // 44.1kHz
          .outputOptions([
            '-pix_fmt', 'yuv420p', // Formato de pixel compatível
            '-shortest', // Terminar quando o áudio acabar
            '-movflags', '+faststart', // Otimização para streaming
            '-preset', 'fast', // Velocidade de encoding
            '-crf', '28' // Qualidade (menor = melhor qualidade)
          ])
          .on('start', (command) => {
            console.log(`[Instagram] Iniciando conversão áudio->vídeo FFmpeg: ${command}`);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log(`[Instagram] Progresso da conversão: ${Math.round(progress.percent)}%`);
            }
          })
          .on('end', () => {
            try {
              console.log(`[Instagram] Conversão áudio->vídeo concluída, lendo arquivo...`);
              const videoBuffer = fsSync.readFileSync(videoPath);
              
              // Limpar arquivos temporários
              try {
                if (fsSync.existsSync(audioPath)) fsSync.unlinkSync(audioPath);
                if (fsSync.existsSync(imagePath)) fsSync.unlinkSync(imagePath);
                if (fsSync.existsSync(videoPath)) fsSync.unlinkSync(videoPath);
              } catch (cleanErr) {
                console.error(`[Instagram] Erro ao limpar arquivos temp: ${cleanErr.message}`);
              }
              
              console.log(`[Instagram] Vídeo MP4 criado com sucesso (${videoBuffer.length} bytes)`);
              resolve({
                buffer: videoBuffer,
                mimetype: 'video/mp4'
              });
            } catch (readError) {
              console.error(`[Instagram] Erro ao ler vídeo convertido: ${readError.message}`);
              reject(readError);
            }
          })
          .on('error', (err) => {
            console.error(`[Instagram] Erro na conversão FFmpeg: ${err.message}`);
            
            // Limpar arquivos temporários em caso de erro
            try {
              if (fsSync.existsSync(audioPath)) fsSync.unlinkSync(audioPath);
              if (fsSync.existsSync(imagePath)) fsSync.unlinkSync(imagePath);
              if (fsSync.existsSync(videoPath)) fsSync.unlinkSync(videoPath);
            } catch (cleanupError) {
              console.error(`[Instagram] Erro ao limpar arquivos temp: ${cleanupError.message}`);
            }
            
            reject(err);
          })
          .save(videoPath);
      }).catch(err => {
        console.error(`[Instagram] Erro ao criar imagem placeholder: ${err.message}`);
        reject(err);
      });
      
    } catch (writeError) {
      console.error(`[Instagram] Erro ao escrever arquivo temporário: ${writeError.message}`);
      reject(writeError);
    }
  });
};

// Função helper para validar tipos de arquivo suportados pelo Instagram
const validateInstagramMediaType = (mimetype, fileName = '') => {
  // Verificar se é um arquivo de áudio disfarçado (comum no Instagram/Facebook)
  const isAudioFile = fileName.includes('audioclip') || fileName.includes('audio') || 
                      (mimetype === 'video/mp4' && fileName.includes('audioclip')) ||
                      (mimetype === 'video/mpeg' && fileName.includes('audioclip')) ||
                      mimetype === 'audio/mpeg' || mimetype === 'audio/mp3';
  
  if (isAudioFile) {
    console.log(`[Instagram] Detectado arquivo de áudio: ${fileName} (${mimetype})`);
    return 'audio';
  }
  
  if ((mimetype || '').startsWith('image/')) {
    const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    if (!supportedImageTypes.includes(mimetype.toLowerCase())) {
      throw new Error(`Tipo de imagem não suportado pelo Instagram: ${mimetype}. Tipos aceitos: JPEG, PNG, GIF, BMP, WebP`);
    }
    return 'image';
  } else if ((mimetype || '').startsWith('video/')) {
    const supportedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv'];
    if (!supportedVideoTypes.includes(mimetype.toLowerCase())) {
      throw new Error(`Tipo de vídeo não suportado pelo Instagram: ${mimetype}. Tipos aceitos: MP4, AVI, MOV, MKV`);
    }
    return 'video';
  } else if ((mimetype || '').startsWith('audio/')) {
    // Aceitar vários tipos de áudio para conversão automática
    const supportedForConversion = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
      'audio/mp3', 'audio/aac', 'audio/flac', 'audio/wma',
      'audio/webm', 'audio/opus'
    ];
    
    if (!supportedForConversion.includes(mimetype.toLowerCase())) {
      throw new Error(`Tipo de áudio não suportado para conversão: ${mimetype}. Tipos aceitos: MP3, WAV, OGG, mp3, AAC, FLAC, WMA, WebM, Opus`);
    }
    return 'audio';
  } else {
    throw new Error(`Tipo de arquivo não suportado pelo Instagram: ${mimetype}. Instagram suporta apenas imagens (JPEG, PNG, GIF, BMP, WebP), vídeos (MP4, AVI, MOV, MKV) e áudios (MP3, WAV, OGG, mp3, AAC, FLAC, WMA, WebM, Opus - com conversão automática)`);
  }
};

// Função de fallback para conversão simples sem FFmpeg
const convertAudioSimple = (inputBuffer, originalMimetype) => {
  return new Promise((resolve, reject) => {
    console.log(`[Instagram] FFmpeg não disponível, tentando conversão simples...`);
    
    // Para alguns formatos, apenas mudar a extensão/mimetype pode funcionar
    if (originalMimetype.includes('mp4') || originalMimetype.includes('mpeg') || 
        originalMimetype.includes('mp3') || originalMimetype === 'audio/mpeg' || 
        originalMimetype === 'audio/mp3') {
      console.log(`[Instagram] Áudio compatível, convertendo mimetype para MP4`);
      resolve({
        buffer: inputBuffer,
        mimetype: 'video/mp4'
      });
    } else {
      reject(new Error('Conversão não disponível. Instale FFmpeg ou envie arquivo em formato MP4/MPEG.'));
    }
  });
};

const getRoot = () => path.resolve(process.cwd(), 'privated', 'instagram');
const stateFile = (sessionId) => path.resolve(getRoot(), `${sessionId}.json`);

async function persistState(sessionId, ig) {
  try {
    await fs.mkdir(getRoot(), { recursive: true });
    // A API não expõe exportState(); usar serialize
    const json = await ig.state.serialize();
    delete json.constants; // remover dados imutáveis supérfluos
    await fs.writeFile(stateFile(sessionId), JSON.stringify(json, null, 2), 'utf-8');
  } catch (e) {
    console.log(`[Instagram] Falha ao salvar estado: ${e.message}`);
  }
}

async function restoreState(sessionId, ig) {
  try {
    const data = await fs.readFile(stateFile(sessionId), 'utf-8');
    const json = JSON.parse(data);
    await ig.state.deserialize(json);
    return true;
  } catch {
    return false;
  }
}

export const createInstagramSession = async (sessionId, credentials = {}, onReady, onMessage) => {
  const { username, password, proxy } = credentials;
  if (!username || !password) {
    throw new Error('Credenciais Instagram ausentes (username/password)');
  }
  let existing = sessions.get(sessionId);
  if (existing) {
    console.log(`[Instagram] Reutilizando sessão em memória ${sessionId}`);
    onReady && onReady(existing.ig);
    return existing.ig;
  }

  const ig = new IgApiClient();
  if (proxy) ig.state.proxyUrl = proxy;
  ig.state.generateDevice(username);

  const restored = await restoreState(sessionId, ig);
  if (!restored) {
    console.log(`[Instagram] Login necessário para ${sessionId}`);
    try {
      await ig.simulate.preLoginFlow();
    } catch (e) {
      console.log('[Instagram] preLoginFlow falhou (continuando):', e.message);
    }
    await ig.account.login(username, password);
    await persistState(sessionId, ig);
    try {
      await ig.simulate.postLoginFlow();
    } catch (e) {
      // Alguns endpoints podem retornar 404 (ex: suggested_searches). Ignorar.
      console.log('[Instagram] postLoginFlow aviso (ignorado):', e.message);
    }
  } else {
    console.log(`[Instagram] Estado restaurado para ${sessionId}`);
  }

  sessions.set(sessionId, { ig, username, createdAt: Date.now(), onMessage, pollTimer: null, lastThreadItemIds: new Map(), realtime: { started: false, error: null } });
  // Tentar realtime primeiro
  try {
    await startRealtime(sessionId);
  } catch (e) {
    console.log('[Instagram] Realtime indisponível, usando fallback polling:', e.message);
    try { startInboxPolling(sessionId); } catch(err){ console.log('[Instagram] Falha ao iniciar polling fallback:', err.message); }
  }
  onReady && onReady(ig);

  // FUTURO: implementar realtime (MQTT) para receber DMs e chamar ingestInboundMessage.
  // Poderemos usar ig.realtime.connect / direct thread sync.
  return ig;
};

function requireSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) throw new Error('Sessão Instagram não encontrada em memória');
  return s.ig;
}

// Tenta recuperar sessão se saiu da memória (ex: reinício hot reload)
export async function ensureInstagramSession(sessionId) {
  let s = sessions.get(sessionId);
  if (s) return s.ig;
  // Tentar restaurar do arquivo de estado sem relogar (precisa das credenciais? não armazenamos password)
  try {
    console.log(`[Instagram][ensure] Sessão ${sessionId} não estava em memória. Tentando restaurar do arquivo.`);
    const ig = new IgApiClient();
    const restored = await restoreState(sessionId, ig);
    if (restored) {
      sessions.set(sessionId, { ig, username: ig.state?.deviceString || 'unknown', createdAt: Date.now(), pollTimer: null, lastThreadItemIds: new Map(), realtime: { started: false, error: null } });
      try { 
        await startRealtime(sessionId); 
        console.log(`[Instagram][ensure] Realtime iniciado após restore`);
      } catch(e){ 
        console.log('[Instagram][ensure] Realtime falhou após restore:', e.message);
        try { 
          startInboxPolling(sessionId); 
          console.log(`[Instagram][ensure] Polling iniciado como fallback`);
        } catch(pollErr) { 
          console.log('[Instagram][ensure] Polling também falhou:', pollErr.message); 
        }
      }
      console.log(`[Instagram][ensure] Sessão ${sessionId} restaurada em memória (sem credenciais)`);
      return ig;
    } else {
      console.log(`[Instagram][ensure] Não foi possível restaurar estado da sessão ${sessionId}. Requer novo login.`);
    }
  } catch (e) {
    console.log(`[Instagram][ensure] Erro ao tentar restaurar sessão ${sessionId}:`, e.message);
  }
  throw new Error('Sessão Instagram não encontrada em memória e não pôde ser restaurada. Recrie a sessão.');
}

// Resolve destinatário Instagram (pk numérico confirmado) a partir de entrada (pk ou username)
async function resolveRecipient(ig, raw) {
  const logs = [];
  const add = (m) => { logs.push(m); };
  if (!raw) return { ok: false, reason: 'destino vazio', logs };
  const clean = raw.trim();
  // Se veio com prefixo ig:
  const withoutPrefix = clean.replace(/^ig:/, '');
  let candidate = withoutPrefix;
  // Caso pareça username (contém letras ou underscore)
  if (/[^0-9]/.test(candidate)) {
    try {
      add(`Tentando resolver username '${candidate}' via searchExact`);
      const user = await ig.user.searchExact(candidate);
      if (user?.pk) {
        add(`Username '${candidate}' resolvido para pk ${user.pk}`);
        return { ok: true, pk: String(user.pk), logs };
      }
      add(`searchExact não retornou pk para '${candidate}'`);
    } catch (e) {
      add(`Falha searchExact: ${e.message}`);
    }
    // Tentativa fallback: busca ampla
    try {
      const search = await ig.user.search(candidate);
      const first = search?.users?.find(u => u.username?.toLowerCase() === candidate.toLowerCase());
      if (first?.pk) {
        add(`Busca ampla encontrou pk ${first.pk} para username '${candidate}'`);
        return { ok: true, pk: String(first.pk), logs };
      }
    } catch (e) { add(`Falha user.search: ${e.message}`); }
    return { ok: false, reason: 'username_nao_resolvido', logs };
  }
  // Só dígitos: validar se pk existe
  if (/^\d+$/.test(candidate)) {
    try {
      add(`Validando pk numérico ${candidate} via user.info`);
      const info = await ig.user.info(candidate);
      if (info?.pk) {
        add(`pk ${candidate} válido. username=${info.username}`);
        return { ok: true, pk: String(info.pk), logs, username: info.username };
      }
      add(`user.info não retornou pk para ${candidate}`);
      return { ok: false, reason: 'pk_invalido', logs };
    } catch (e) {
      add(`Falha user.info pk ${candidate}: ${e.message}`);
      return { ok: false, reason: 'pk_invalido', logs };
    }
  }
  return { ok: false, reason: 'formato_invalido', logs };
}

function getSessionRecord(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) throw new Error('Sessão Instagram não encontrada em memória');
  return s;
}

async function pollInboxOnce(sessionId) {
  const record = getSessionRecord(sessionId);
  const { ig, lastThreadItemIds } = record;
  if (!ig) return;
  try {
    const inboxFeed = ig.feed.directInbox();
    const threads = await inboxFeed.items();
    const selfUserId = ig.state.cookieUserId;
    for (const thread of threads) {
      const threadId = thread.thread_id || thread.threadId || thread.threadIdV2 || thread.pk || 'unknown';
      if (!thread.items || !Array.isArray(thread.items) || !thread.items.length) continue;
      // Ordenar do mais antigo para o mais novo
      const items = [...thread.items].sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));
      const lastProcessedId = lastThreadItemIds.get(threadId);
      let latestId = lastProcessedId;
      for (const item of items) {
        const itemId = item.item_id || item.id;
        if (!itemId) continue;
        if (lastProcessedId && itemId === lastProcessedId) continue; // já processado (igual ao último)
        if (lastProcessedId && items.find(i => (i.item_id||i.id) === lastProcessedId) && (itemId <= lastProcessedId)) continue; // redundante
        // Apenas processar se item for novo (se não há lastProcessedId processamos todos sequencialmente)
        // Ignorar mensagens enviadas pelo próprio usuário logado
        if (String(item.user_id) === String(selfUserId)) {
          latestId = itemId; // atualizar ponteiro mesmo em mensagens próprias
          continue;
        }
        // Tipos suportados: text, link, reel_share etc -> focar em text por ora
        let content = null;
        let messageType = 'text';
        let mediaUrl = null;
        
        console.log('[Instagram] Polling - processando item_type:', item.item_type);
        
        if (item.item_type === 'text') {
          content = item.text || '';
        } else if (item.item_type === 'link' && item.link?.text) {
          content = item.link.text;
        } else if (item.item_type === 'media_share') {
          content = '[media compartilhada]';
        } else if (item.item_type === 'animated_media') {
          content = '[gif]';
          messageType = 'image';
        } else if (item.item_type === 'raven_media') {
          content = '[midia temporária]';
        } else if (item.item_type === 'media') {
          // Processar imagem/vídeo
          console.log('[Instagram] Polling - processando media:', JSON.stringify(item.media, null, 2));
          if (item.media?.image_versions2?.candidates?.length > 0) {
            mediaUrl = item.media.image_versions2.candidates[0].url;
            content = item.media.caption?.text || '[Imagem]';
            messageType = 'image';
          } else if (item.media?.video_versions?.length > 0) {
            mediaUrl = item.media.video_versions[0].url;
            content = item.media.caption?.text || '[Vídeo]';
            messageType = 'video';
          } else {
            content = '[Mídia não suportada]';
          }
        } else {
          console.log('[Instagram] Polling - tipo não mapeado:', item.item_type, 'item completo:', JSON.stringify(item, null, 2));
          content = `[${item.item_type}]`;
        }
        
        if (!content) {
          // skip tipos ainda não mapeados
          latestId = itemId;
          continue;
        }
        // Encontrar nome do remetente na lista de usuários do thread
        let fromName = null;
        try {
          if (Array.isArray(thread.users)) {
            const u = thread.users.find(u => String(u.pk) === String(item.user_id));
            fromName = u?.username || u?.full_name || null;
          }
        } catch (_) {}
        await ingestInboundMessage({
          channel: 'instagram',
          sessionKey: sessionId,
          fromId: String(item.user_id),
          fromName,
          text: content,
          threadId: threadId,
          messageType,
          mediaUrl,
          raw: { itemId, item_type: item.item_type }
        });
        console.log('[Instagram][polling] 📨 Mensagem do Instagram ingerida com sucesso:', {
          itemId,
          fromId: String(item.user_id),
          fromName,
          content,
          threadId
        });
        latestId = itemId;
      }
      if (latestId && latestId !== lastProcessedId) {
        lastThreadItemIds.set(threadId, latestId);
      }
    }
  } catch (e) {
    const msg = e?.message || '';
    // Silenciar erros transitórios conhecidos
    if (msg.includes('login_required') || msg.includes('Challenge')) {
      console.log('[Instagram] Poll avisa login/challenge, ignorando ciclo:', msg);
    } else {
      console.log('[Instagram] Erro polling inbox:', msg);
    }
  }
}

function startInboxPolling(sessionId) {
  const record = getSessionRecord(sessionId);
  if (record.pollTimer) return; // já ativo
  // Poll a cada 12s (balance entre latência e risco de rate limit)
  record.pollTimer = setInterval(() => {
    pollInboxOnce(sessionId);
  }, 12000);
  // Primeira rodada imediata (não bloquear)
  pollInboxOnce(sessionId);
  console.log(`[Instagram] Polling inbox iniciado para sessão ${sessionId}`);
}

async function startRealtime(sessionId){
  const record = getSessionRecord(sessionId);
  const { ig } = record;
  if (record.realtime.started) return;
  try {
    // Necessário carregar inbox inicial para fornecer irisData e cursor ao realtime
    const inboxReq = await ig.feed.directInbox().request();
    if (!ig.realtime) {
      throw new Error('Cliente realtime não disponível na instância ig');
    }
    await ig.realtime.connect({
      irisData: inboxReq,
      connectTimeout: 7000
    });
    record.realtime.started = true;
    console.log(`[Instagram] Realtime conectado para sessão ${sessionId}`);
    // Listener de eventos direct
    ig.realtime.on('direct', async payload => {
      try {
        console.log('[Instagram] Payload completo recebido:', JSON.stringify(payload, null, 2));
        if (!payload || !payload.message) return;
        const { message } = payload;
        console.log('[Instagram] Message extraído:', JSON.stringify(message, null, 2));
        // message.op: 'add', 'replace', etc.
        if (message.op !== 'add') return;
        const item = message.message;
        if (!item) return;
        console.log('[Instagram] Item da mensagem:', JSON.stringify(item, null, 2));
        const selfUserId = ig.state.cookieUserId;
        if (String(item.user_id) === String(selfUserId)) return; // ignorar próprio
        
        let content = null;
        let messageType = 'text';
        let mediaUrl = null;
        
        console.log('[Instagram] Processando item_type:', item.item_type);
        
        if (item.item_type === 'text') {
          content = item.text || '';
        } else if (item.item_type === 'link' && item.link?.text) {
          content = item.link.text;
        } else if (item.item_type === 'media_share') {
          content = '[media compartilhada]';
        } else if (item.item_type === 'animated_media') {
          content = '[gif]';
          messageType = 'image';
        } else if (item.item_type === 'raven_media') {
          content = '[midia temporária]';
        } else if (item.item_type === 'media') {
          // Processar imagem/vídeo
          console.log('[Instagram] Processando media:', JSON.stringify(item.media, null, 2));
          if (item.media?.image_versions2?.candidates?.length > 0) {
            mediaUrl = item.media.image_versions2.candidates[0].url;
            content = item.media.caption?.text || '[Imagem]';
            messageType = 'image';
          } else if (item.media?.video_versions?.length > 0) {
            mediaUrl = item.media.video_versions[0].url;
            content = item.media.caption?.text || '[Vídeo]';
            messageType = 'video';
          } else {
            content = '[Mídia não suportada]';
          }
        } else {
          console.log('[Instagram] Tipo não mapeado:', item.item_type, 'item completo:', JSON.stringify(item, null, 2));
          content = `[${item.item_type}]`;
        }
        
        if (!content) return;
        // Nome remetente
        let fromName = null;
        try {
          // Tentar extrair do payload caso venha em participants
          if (payload.thread && Array.isArray(payload.thread.users)) {
            const u = payload.thread.users.find(u => String(u.pk) === String(item.user_id));
            fromName = u?.username || u?.full_name || null;
          }
        } catch(_) {}
        await ingestInboundMessage({
          channel: 'instagram',
          sessionKey: sessionId,
          fromId: String(item.user_id),
          fromName,
          text: content,
          threadId: message.thread_id || message.threadId,
          messageType,
          mediaUrl,
          raw: { realtime: true, item_type: item.item_type, item_id: item.item_id || item.id }
        });
      } catch(e){
        const msg = e?.message || e;
        console.log('[Instagram] Erro ingest realtime:', msg, e);
      }
    });
    // Fallback: se realtime cair, iniciar polling
    ig.realtime.on('close', () => {
      console.log(`[Instagram] Realtime fechado sessão ${sessionId}, iniciando fallback polling`);
      record.realtime.started = false;
      try { startInboxPolling(sessionId); } catch(_) {}
    });
  } catch (e) {
    record.realtime.error = e.message;
    throw e;
  }
}

export const stopInstagramSession = (sessionId) => {
  const record = sessions.get(sessionId);
  if (record?.pollTimer) {
    clearInterval(record.pollTimer);
    record.pollTimer = null;
    console.log(`[Instagram] Polling parado para sessão ${sessionId}`);
  }
};

export const sendInstagramText = async (sessionId, to, text, ticketId = null) => {
  let ig;
  try { ig = requireSession(sessionId); } catch { ig = await ensureInstagramSession(sessionId); }
  const cleanTo = (to || '').replace(/^ig:/, '').trim();
  if (!cleanTo) throw new Error('Destino vazio');
  const attemptLogs = [];
  const logAttempt = (msg) => { attemptLogs.push(msg); console.log('[Instagram][SEND-TEXT]', msg); };
  try {
    logAttempt(`Iniciando envio para '${cleanTo}' conteúdo='${text}'`);
    const resolved = await resolveRecipient(ig, to);
    resolved.logs.forEach(l => logAttempt(`resolve: ${l}`));
    if (!resolved.ok) {
      throw new Error(`Falha resolver destinatário (${resolved.reason})`);
    }
    const pk = resolved.pk;
    // 1. Tentar achar thread existente por user pk match
    let inboxThreads = [];
    try {
      inboxThreads = await ig.feed.directInbox().items();
      logAttempt(`Inbox carregada com ${inboxThreads.length} threads`);
    } catch (e) {
      logAttempt(`Falha ao carregar inbox: ${e.message}`);
    }
    let targetThread = inboxThreads.find(th => Array.isArray(th.users) && th.users.some(u => String(u.pk) === pk));
    if (targetThread) {
      const threadId = targetThread.thread_id || targetThread.threadId || targetThread.pk;
      logAttempt(`Thread existente encontrada ${threadId} - enviando texto`);
      const thread = ig.entity.directThread(threadId);
      await thread.broadcastText(text);
    } else {
      logAttempt('Nenhuma thread com PK igual ao destino');
      // 3. Criar thread direta usando pkCandidate
      try {
        logAttempt(`Criando thread direta com pk '${pk}'`);
        const thread = ig.entity.directThread([pk]);
        await thread.broadcastText(text);
        logAttempt('Envio via criação de thread bem sucedido');
      } catch (e) {
        logAttempt(`Falha ao criar/enviar thread direta: ${e.message}`);
        // 4. Tentativa alternativa: usar broadcastText helper
        try {
          logAttempt('Tentando fallback broadcastText direto (array pk)');
          await ig.directThread.broadcastText([pk], text);
          logAttempt('Envio fallback broadcastText bem sucedido');
        } catch (e2) {
          logAttempt(`Fallback broadcastText falhou: ${e2.message}`);
          throw new Error(`Falha geral no envio Instagram. Tentativas: ${attemptLogs.join(' | ')}`);
        }
      }
    }
    // Emitir sucesso
    if (ticketId) {
      const eventData = { ticketId: Number(ticketId), sender: 'user', content: text, timestamp: new Date(), messageType: 'text', channel: 'instagram', status: 'sent' };
      emitToTicket(ticketId, 'message-sent', eventData);
      emitToAll('message-update', eventData);
    }
    return true;
  } catch (error) {
    console.error('[Instagram][SEND-TEXT] Erro final:', error.message);
    if (ticketId) emitToTicket(ticketId, 'message-error', { ticketId: Number(ticketId), error: error.message, timestamp: new Date(), channel: 'instagram' });
    throw error;
  }
};

export const sendInstagramMedia = async (sessionId, to, buffer, mimetype, ticketId = null, fileName = '') => {
  let ig;
  try { ig = requireSession(sessionId); } catch { ig = await ensureInstagramSession(sessionId); }
  
  // Remover prefixo ig: se presente
  const cleanToId = to.replace(/^ig:/, '');
  
  try {
    console.log(`[Instagram] Enviando mídia para ${cleanToId}, tipo: ${mimetype}, arquivo: ${fileName}`);
    
    // Buscar thread existente com o usuário
    const inboxFeed = ig.feed.directInbox();
    const threads = await inboxFeed.items();
    
    let targetThread = null;
    for (const thread of threads) {
      if (thread.users && thread.users.some(u => String(u.pk) === String(cleanToId))) {
        targetThread = thread;
        break;
      }
    }
    
    if (targetThread) {
      // Enviar para thread existente
      const threadId = targetThread.thread_id || targetThread.threadId || targetThread.threadIdV2 || targetThread.pk;
      console.log(`[Instagram] Enviando mídia para thread existente: ${threadId}`);
      const thread = ig.entity.directThread(threadId);
      
      if (!buffer) throw new Error('Arquivo vazio');
      
      // Validar e determinar tipo de mídia (incluindo detecção de áudio disfarçado)
      const mediaType = validateInstagramMediaType(mimetype, fileName);
      
      if (mediaType === 'image') {
        await thread.broadcastPhoto({ file: buffer });
        console.log(`[Instagram] Imagem enviada com sucesso`);
      } else if (mediaType === 'video') {
        await thread.broadcastVideo({ video: buffer });
        console.log(`[Instagram] Vídeo enviado com sucesso`);
      } else if (mediaType === 'audio') {
        // Instagram não suporta mais áudio direto - converter para vídeo MP4
        console.log(`[Instagram] Áudio detectado. Convertendo para vídeo MP4...`);
        
        try {
          // Para arquivos que são na verdade áudio, ajustar o mimetype
          let actualMimetype = mimetype;
          if ((mimetype === 'video/mp4' || mimetype === 'video/mpeg') && fileName.includes('audioclip')) {
            actualMimetype = mimetype.replace('video/', 'audio/');
            console.log(`[Instagram] Arquivo ${mimetype} detectado como áudio: ${fileName} → ${actualMimetype}`);
          }
          
          // Converter áudio para vídeo MP4
          const converted = await convertAudioToVideoMP4(buffer, actualMimetype);
          
          // Enviar como vídeo
          await thread.broadcastVideo({ video: converted.buffer });
          console.log(`[Instagram] Áudio enviado como vídeo MP4 com sucesso!`);
          
        } catch (conversionError) {
          console.error(`[Instagram] Erro na conversão áudio->vídeo: ${conversionError.message}`);
          
          // Se a conversão falhar, tentar fallback simples
          try {
            console.log(`[Instagram] Tentando conversão simples...`);
            const converted = await convertAudioSimple(buffer, mimetype);
            await thread.broadcastVideo({ video: converted.buffer });
            console.log(`[Instagram] Áudio enviado com conversão simples`);
          } catch (fallbackError) {
            // Se tudo falhar, enviar mensagem informativa
            await thread.broadcastText(
              `🎵 Áudio recebido\n\n` +
              `⚠️ Não foi possível converter o áudio para envio.\n` +
              `Erro: ${conversionError.message}\n\n` +
              `Por favor, envie o áudio em formato MP3 ou MP4.`
            );
            console.log(`[Instagram] Enviada mensagem informativa sobre áudio`);
          }
        }
      }
    } else {
      // Criar nova thread
      console.log(`[Instagram] Criando nova thread com mídia para usuário: ${cleanToId}`);
      const thread = ig.entity.directThread([cleanToId]);
      
      if (!buffer) throw new Error('Arquivo vazio');
      
      // Validar e determinar tipo de mídia (incluindo detecção de áudio disfarçado)
      const mediaType = validateInstagramMediaType(mimetype, fileName);
      
      if (mediaType === 'image') {
        await thread.broadcastPhoto({ file: buffer });
        console.log(`[Instagram] Imagem enviada com sucesso`);
      } else if (mediaType === 'video') {
        await thread.broadcastVideo({ video: buffer });
        console.log(`[Instagram] Vídeo enviado com sucesso`);
      } else if (mediaType === 'audio') {
        // Instagram não suporta mais áudio direto - converter para vídeo MP4
        console.log(`[Instagram] Áudio detectado. Convertendo para vídeo MP4...`);
        
        try {
          // Para arquivos que são na verdade áudio, ajustar o mimetype
          let actualMimetype = mimetype;
          if ((mimetype === 'video/mp4' || mimetype === 'video/mpeg') && fileName.includes('audioclip')) {
            actualMimetype = mimetype.replace('video/', 'audio/');
            console.log(`[Instagram] Arquivo ${mimetype} detectado como áudio: ${fileName} → ${actualMimetype}`);
          }
          
          // Converter áudio para vídeo MP4
          const converted = await convertAudioToVideoMP4(buffer, actualMimetype);
          
          // Enviar como vídeo
          await thread.broadcastVideo({ video: converted.buffer });
          console.log(`[Instagram] Áudio enviado como vídeo MP4 com sucesso!`);
          
        } catch (conversionError) {
          console.error(`[Instagram] Erro na conversão áudio->vídeo: ${conversionError.message}`);
          
          // Se a conversão falhar, tentar fallback simples
          try {
            console.log(`[Instagram] Tentando conversão simples...`);
            const converted = await convertAudioSimple(buffer, mimetype);
            await thread.broadcastVideo({ video: converted.buffer });
            console.log(`[Instagram] Áudio enviado com conversão simples`);
          } catch (fallbackError) {
            // Se tudo falhar, enviar mensagem informativa
            await thread.broadcastText(
              `🎵 Áudio recebido\n\n` +
              `⚠️ Não foi possível converter o áudio para envio.\n` +
              `Erro: ${conversionError.message}\n\n` +
              `Por favor, envie o áudio em formato MP3 ou MP4.`
            );
            console.log(`[Instagram] Enviada mensagem informativa sobre áudio`);
          }
        }
      }
    }
    
    console.log(`[Instagram] Mídia processada com sucesso para ${cleanToId}`);
    
    // Emitir evento instantâneo para o frontend se temos ticketId
    if (ticketId) {
      const eventData = {
        ticketId: parseInt(ticketId),
        sender: 'user',
        content: (mimetype || '').startsWith('image/') ? '[Imagem]' : 
                 (mimetype || '').startsWith('video/') ? '[Vídeo]' : 
                 (mimetype || '').startsWith('audio/') ? '[Áudio enviado como vídeo]' : '[Arquivo]',
        timestamp: new Date(),
        messageType: (mimetype || '').startsWith('image/') ? 'image' : 
                     (mimetype || '').startsWith('video/') ? 'video' :
                     (mimetype || '').startsWith('audio/') ? 'video' : 'document',
        channel: 'instagram',
        status: 'sent'
      };
      
      console.log(`[Instagram] Emitindo evento de mídia enviada para ticket ${ticketId}`);
      emitToTicket(ticketId, 'message-sent', eventData);
      emitToAll('message-update', eventData);
    }
    
    return true;
  } catch (error) {
    console.error(`[Instagram] Erro ao enviar mídia:`, error);
    
    // Emitir evento de erro se temos ticketId
    if (ticketId) {
      const errorData = {
        ticketId: parseInt(ticketId),
        error: error.message,
        timestamp: new Date(),
        channel: 'instagram'
      };
      
      emitToTicket(ticketId, 'message-error', errorData);
    }
    
    throw error;
  }
};

export const getInstagramSession = (sessionId) => sessions.get(sessionId);

export const listInstagramSessions = () => {
  const sessionList = Array.from(sessions.entries()).map(([id, data]) => ({
    sessionId: id,
    username: data.username,
    createdAt: new Date(data.createdAt).toISOString(),
    hasRealtime: data.realtime?.started || false,
    hasPolling: !!data.pollTimer,
    realtimeError: data.realtime?.error
  }));
  console.log('[Instagram] Sessões ativas:', sessionList);
  return sessionList;
};
