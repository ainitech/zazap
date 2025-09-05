// Removed: library selection routes no longer needed. Baileys-only now.
import express from 'express';
const router = express.Router();
router.all('*', (req, res) => res.status(410).json({ error: 'Seleção de biblioteca descontinuada. Use Baileys.' }));
export default router;
