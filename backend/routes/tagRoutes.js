import express from 'express';
import tagController from '../controllers/tagController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Tag management routes
router.get('/', tagController.getTags);
router.get('/stats', tagController.getTagStats);
router.get('/popular', tagController.getPopularTags);
router.get('/search', tagController.searchTags);
router.get('/category/:category', tagController.getTagsByCategory);
router.get('/:id', tagController.getTag);
router.post('/', tagController.createTag);
router.put('/:id', tagController.updateTag);
router.delete('/:id', tagController.deleteTag);

// Ticket-tag association routes
router.post('/ticket/:ticketId/tag/:tagId', tagController.addTagToTicket);
router.delete('/ticket/:ticketId/tag/:tagId', tagController.removeTagFromTicket);
router.get('/ticket/:ticketId', tagController.getTicketTags);

export default router;
