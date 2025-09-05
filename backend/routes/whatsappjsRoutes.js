// Deprecated: whatsapp-web.js routes removed. Keeping empty router for compatibility if imported accidentally.
import express from 'express';
const router = express.Router();
router.all('*', (req, res) => res.status(410).json({ error: 'whatsapp-web.js removido. Use /api/baileys' }));
export default router;
