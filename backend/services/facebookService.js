// Integração NÃO OFICIAL com Facebook Messenger usando fca-unofficial
// ATENÇÃO: Pode violar termos. Use por sua conta e risco.
import fs from 'fs/promises';
import path from 'path';
import login from 'fca-unofficial';
import { ingestInboundMessage } from './multiChannelIngest.js';

const sessions = new Map(); // sessionId -> { api, createdAt }

const getRoot = () => path.resolve(process.cwd(), 'privated', 'facebook');
const appStateFile = (sessionId) => path.resolve(getRoot(), `${sessionId}.json`);

async function loadAppState(sessionId) {
  try {
    const c = await fs.readFile(appStateFile(sessionId), 'utf-8');
    return JSON.parse(c);
  } catch { return null; }
}
async function saveAppState(sessionId, appState) {
  await fs.mkdir(getRoot(), { recursive: true });
  await fs.writeFile(appStateFile(sessionId), JSON.stringify(appState, null, 2), 'utf-8');
}

export const createFacebookSession = async (sessionId, credentials = {}, onReady, onMessage) => {
  const { email, password } = credentials;
  if (!email || !password) throw new Error('Credenciais Facebook ausentes (email/password)');
  if (sessions.has(sessionId)) {
    onReady && onReady(sessions.get(sessionId).api);
    return sessions.get(sessionId).api;
  }

  const state = await loadAppState(sessionId);
  const loginOpts = { forceLogin: true, userAgent: 'Mozilla/5.0 ZaZapBot', listenEvents: true, logLevel: 'silent' };
  const loginData = state ? { appState: state } : { email, password };

  return new Promise((resolve, reject) => {
    login(loginData, loginOpts, async (err, api) => {
      if (err) return reject(err);
      try {
        // Persistir appState
        const appState = api.getAppState();
        await saveAppState(sessionId, appState);

        // Listener de mensagens
        api.setOptions({ listenEvents: true });
        api.listenMqtt((errListen, event) => {
          if (errListen) return console.log('[Facebook] Erro listener', errListen.message);
          if (event.type === 'message') {
            const payload = {
              from: event.senderID,
              body: event.body,
              threadID: event.threadID,
              messageID: event.messageID,
              timestamp: Date.now()
            };
            onMessage && onMessage(payload);
            ingestInboundMessage({
              channel: 'facebook',
              sessionKey: sessionId,
              fromId: event.senderID,
              text: event.body,
              threadId: event.threadID,
              raw: payload
            });
          }
        });

        sessions.set(sessionId, { api, createdAt: Date.now() });
        onReady && onReady(api);
        resolve(api);
      } catch (e) {
        reject(e);
      }
    });
  });
};

function requireSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) throw new Error('Sessão Facebook não encontrada');
  return s.api;
}

export const sendFacebookText = async (sessionId, to, text) => {
  const api = requireSession(sessionId);
  await api.sendMessage(text, to);
};

export const sendFacebookMedia = async (sessionId, to, buffer, mimetype) => {
  const api = requireSession(sessionId);
  if (!buffer) throw new Error('Arquivo vazio');
  await api.sendMessage({ body: 'Arquivo', attachment: buffer }, to);
};

export const getFacebookSession = (sessionId) => sessions.get(sessionId);
