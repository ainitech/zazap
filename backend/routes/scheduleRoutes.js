import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import upload, { compressImageMiddleware } from '../middleware/upload.js';
import { listSchedules, getCounts, createSchedule, updateSchedule, cancelSchedule, triggerSendNow } from '../controllers/scheduleController.js';

const router = express.Router();

router.get('/', authenticateToken, listSchedules);
router.get('/counts', authenticateToken, getCounts);
router.post('/', authenticateToken, upload.single('file'), compressImageMiddleware, createSchedule);
router.put('/:id', authenticateToken, upload.single('file'), compressImageMiddleware, updateSchedule);
router.delete('/:id', authenticateToken, cancelSchedule);
router.post('/:id/send-now', authenticateToken, triggerSendNow);

export default router;
