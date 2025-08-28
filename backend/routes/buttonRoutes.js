import express from 'express';
import { sendButtonMessage, sendListMessage } from '../controllers/buttonController.js';
import { sendPollMessage } from '../controllers/pollController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Aplicar middleware de autenticação a todas as rotas
router.use(authMiddleware);

/**
 * @route POST /api/buttons/send
 * @desc Enviar mensagem com botões interativos
 * @body {
 *   ticketId: number,
 *   text: string,
 *   buttons: [
 *     { id?: string, text: string },
 *     ...
 *   ],
 *   title?: string,
 *   footer?: string
 * }
 */
router.post('/send', sendButtonMessage);

/**
 * @route POST /api/buttons/list
 * @desc Enviar lista interativa (menu)
 * @body {
 *   ticketId: number,
 *   text: string,
 *   buttonText: string,
 *   sections: [
 *     {
 *       title: string,
 *       rows: [
 *         { id?: string, title: string, description?: string },
 *         ...
 *       ]
 *     },
 *     ...
 *   ],
 *   title?: string,
 *   footer?: string
 * }
 */
router.post('/list', sendListMessage);

/**
 * @route POST /api/buttons/poll
 * @desc Enviar enquete (alternativa aos botões)
 * @body {
 *   ticketId: number,
 *   question: string,
 *   options: [string, ...],
 *   allowMultipleAnswers?: boolean
 * }
 */
router.post('/poll', sendPollMessage);

export default router;
