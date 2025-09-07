import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { saveSubscription, broadcastPush } from '../services/push.js';

const router = express.Router();

// Salvar subscription
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) return res.status(400).json({ error: 'subscription inválida' });
    const ok = await saveSubscription(userId, subscription);
    if (ok) return res.json({ success: true });
    return res.status(500).json({ error: 'Falha ao salvar subscription' });
  } catch (err) {
    console.error('Erro /push/subscribe', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint de teste para enviar um push para todas as subscriptions
router.post('/send-test', authMiddleware, async (req, res) => {
  try {
    const payload = req.body || { title: 'Teste', body: 'Mensagem de teste' };
    await broadcastPush(payload);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro /push/send-test', err);
    res.status(500).json({ error: err.message });
  }
});

// Expor chave pública VAPID para o cliente (sem autenticação)
router.get('/public', async (req, res) => {
  try {
    const VAPID_PUBLIC = process.env.VAPID_PUBLIC || '';
    if (!VAPID_PUBLIC) return res.status(404).send('');
    res.send(VAPID_PUBLIC);
  } catch (err) {
    console.error('Erro /push/public', err);
    res.status(500).send('');
  }
});

export default router;
