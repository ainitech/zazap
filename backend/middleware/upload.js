import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as Jimp from 'jimp';
import ffmpeg from 'fluent-ffmpeg';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'outros';
    const mime = file.mimetype;
    const ext = path.extname(file.originalname).toLowerCase();
    // Organização por tipo principal
    if (mime.startsWith('image/')) folder = 'imagens';
    else if (mime.startsWith('video/')) folder = 'videos';
    else if (mime.startsWith('audio/')) folder = 'audios';
    else if (
      mime === 'application/pdf' ||
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'application/vnd.ms-excel' ||
      mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) folder = 'documentos';
    // Organização por extensão para arquivos "diferentes"
    else if (ext === '.exe') folder = 'executaveis';
    else if (ext === '.zip' || ext === '.rar' || ext === '.7z') folder = 'arquivos_compactados';
    else if (ext === '.apk') folder = 'apks';
    else if (ext === '.csv' || ext === '.json' || ext === '.xml') folder = 'dados';
    else if (ext === '.html' || ext === '.js' || ext === '.ts' || ext === '.css') folder = 'codigo';
    else if (ext === '.dll' || ext === '.sys') folder = 'sistema';
    // Se não reconhecido, vai para 'outros'
    
    // Use relative path to avoid duplication
    const dest = `uploads/${folder}`;
    
    // Create directory if it doesn't exist (using absolute path for creation)
    const absoluteDest = path.join(process.cwd(), dest);
    fs.mkdirSync(absoluteDest, { recursive: true });
    
    // Return relative path to multer
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

const upload = multer({ storage });

// Middleware para comprimir imagens após upload
export const compressImageMiddleware = async (req, res, next) => {
  if (!req.file) return next();
  
  // Convert relative path to absolute for file operations
  const filePath = path.isAbsolute(req.file.path) 
    ? req.file.path 
    : path.join(process.cwd(), req.file.path);
    
  const mime = req.file.mimetype;
  
  // Compressão de imagem
  if (mime.startsWith('image/')) {
    try {
      const image = await Jimp.read(filePath);
      image.resize(1280, Jimp.AUTO);
      if (mime === 'image/jpeg' || mime === 'image/jpg') {
        await image.quality(80).writeAsync(filePath);
      } else if (mime === 'image/png') {
        await image.deflateLevel(6).writeAsync(filePath);
      } else {
        await image.writeAsync(filePath);
      }
      req.file.size = fs.statSync(filePath).size;
    } catch (err) {
      console.error('Erro ao comprimir imagem:', err);
    }
    return next();
  }

  // Conversão de áudio para mp3
  if (mime.startsWith('audio/')) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.mp3') {
      // Se já for mp3, não faz nada
      return next();
    }
    try {
      const mp3Path = filePath.replace(/\.[^/.]+$/, '.mp3');
      await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .toFormat('mp3')
          .on('end', resolve)
          .on('error', reject)
          .save(mp3Path);
      });
      // Exclui o arquivo original
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      // Atualiza req.file para refletir o novo arquivo mp3
      req.file.filename = path.basename(mp3Path);
      // Keep relative path for req.file.path
      req.file.path = req.file.path.replace(/\.[^/.]+$/, '.mp3');
      req.file.mimetype = 'audio/mpeg';
      req.file.originalname = req.file.originalname.replace(/\.[^/.]+$/, '.mp3');
      req.file.size = fs.statSync(mp3Path).size;
    } catch (err) {
      console.error('Erro ao converter áudio para mp3:', err);
    }
    return next();
  }
  next();
};

export default upload;
