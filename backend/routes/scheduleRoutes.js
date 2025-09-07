import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import upload, { compressImageMiddleware } from '../middleware/upload.js';
import { listSchedules, getCounts, createSchedule, updateSchedule, cancelSchedule, triggerSendNow } from '../controllers/scheduleController.js';

const router = express.Router();

router.get('/', authMiddleware, listSchedules);
router.get('/counts', authMiddleware, getCounts);
router.post('/', authMiddleware, upload.single('file'), compressImageMiddleware, createSchedule);
router.put('/:id', authMiddleware, upload.single('file'), compressImageMiddleware, updateSchedule);
router.delete('/:id', authMiddleware, cancelSchedule);
router.post('/:id/send-now', authMiddleware, triggerSendNow);

export default router;
