import express from 'express';
import multer from 'multer';
import path from 'path';
import { compressImageMiddleware } from '../middleware/upload.js';
import {
  getSettings,
  getPublicSettings,
  getSetting,
  updateSetting,
  updateSettings,
  uploadLogo,
  removeLogo
} from '../controllers/settingController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Configuração do multer para upload de logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB - aumentado para aceitar imagens maiores
  },
  fileFilter: (req, file, cb) => {
    // Aceitar qualquer arquivo de imagem
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'), false);
    }
  }
});

// Rotas públicas
router.get('/public', getPublicSettings);

// Rotas protegidas
router.get('/', authMiddleware, getSettings);
router.get('/:key', authMiddleware, getSetting);
router.put('/:key', authMiddleware, updateSetting);
router.put('/', authMiddleware, updateSettings);

// Upload e remoção de logo
router.post('/logo/upload', authMiddleware, upload.single('logo'), compressImageMiddleware, uploadLogo);
router.delete('/logo', authMiddleware, removeLogo);

export default router;
