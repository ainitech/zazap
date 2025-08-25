import webpush from 'web-push';
import PushSubscription from '../models/pushSubscription.js';
import fs from 'fs/promises';
import path from 'path';

let VAPID_PUBLIC = process.env.VAPID_PUBLIC;
let VAPID_PRIVATE = process.env.VAPID_PRIVATE;

let VAPID_CONFIGURED = !!(VAPID_PUBLIC && VAPID_PRIVATE);

// If keys are missing, generate development keys automatically and persist to .env
if (!VAPID_CONFIGURED) {
  try {
    console.warn('⚠️ VAPID keys not configured. Generating development VAPID keys...');
    const keys = webpush.generateVAPIDKeys();
    VAPID_PUBLIC = keys.publicKey;
    VAPID_PRIVATE = keys.privateKey;

    const envPath = path.resolve(process.cwd(), '.env');
    let envText = '';
    try {
      envText = await fs.readFile(envPath, 'utf8');
    } catch (e) {
      envText = '';
    }

    if (!envText.includes('VAPID_PUBLIC')) {
      envText += `\nVAPID_PUBLIC=${VAPID_PUBLIC}\nVAPID_PRIVATE=${VAPID_PRIVATE}\n`;
      await fs.writeFile(envPath, envText, 'utf8');
      console.log('🔑 VAPID keys generated and appended to .env');
    } else {
      console.log('🔑 VAPID keys generated (not written because .env already contains VAPID_PUBLIC)');
    }

    VAPID_CONFIGURED = true;
  } catch (err) {
    console.error('❌ Failed to generate/save VAPID keys:', err);
  }
}

if (VAPID_CONFIGURED) {
  try {
    webpush.setVapidDetails('mailto:admin@zazap.local', VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (err) {
    console.error('❌ Invalid VAPID keys provided, push will be disabled:', err.message || err);
    VAPID_CONFIGURED = false;
  }
} else {
  console.warn('⚠️ VAPID not configured. Push will be disabled until keys are set.');
}

export const saveSubscription = async (userId, subscription) => {
  try {
    await PushSubscription.create({ userId: userId || null, subscription });
    return true;
  } catch (err) {
    console.error('Erro ao salvar subscription:', err);
    return false;
  }
};

export const getAllSubscriptions = async () => {
  return await PushSubscription.findAll();
};

export const sendPushToSubscription = async (subscription, payload) => {
  if (!VAPID_CONFIGURED) {
    console.warn('⚠️ sendPushToSubscription called but VAPID not configured. Skipping.');
    return false;
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('Erro ao enviar push:', err);
    return false;
  }
};

export const broadcastPush = async (payload) => {
  if (!VAPID_CONFIGURED) {
    console.warn('⚠️ broadcastPush called but VAPID not configured. Skipping.');
    return;
  }
  const subs = await getAllSubscriptions();
  for (const s of subs) {
    try {
      await sendPushToSubscription(s.subscription, payload);
    } catch (err) {
      console.error('Erro broadcast push para subscription id=', s.id, err);
    }
  }
};

export default {
  saveSubscription,
  getAllSubscriptions,
  sendPushToSubscription,
  broadcastPush
};
