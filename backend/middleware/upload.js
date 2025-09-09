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

// Middleware para comprimir e otimizar imagens após upload
export const compressImageMiddleware = async (req, res, next) => {
  if (!req.file) return next();
  
  // Convert relative path to absolute for file operations
  const filePath = path.isAbsolute(req.file.path) 
    ? req.file.path 
    : path.join(process.cwd(), req.file.path);
    
  const mime = req.file.mimetype;
  
  // Processamento de imagem mais robusto
  if (mime.startsWith('image/')) {
    try {
      console.log('🖼️ Processando imagem:', filePath);
      
      // Verificar se o arquivo existe antes de processar
      if (!fs.existsSync(filePath)) {
        console.error('❌ Arquivo não encontrado:', filePath);
        return cb(null, file);
      }
      
      // Ler a imagem com Jimp (suporta vários formatos)
      const image = await Jimp.read(filePath);
      
      // Verificar se a imagem foi carregada corretamente
      if (!image || typeof image.getWidth !== 'function') {
        console.error('❌ Falha ao carregar imagem com Jimp');
        return cb(null, file);
      }
      
      console.log('📏 Dimensões originais:', image.getWidth(), 'x', image.getHeight());
      
      // Redimensionar mantendo proporção - máximo 512px para logos
      const maxSize = 512;
      if (image.getWidth() > maxSize || image.getHeight() > maxSize) {
        console.log('🔄 Redimensionando imagem...');
        if (image.getWidth() > image.getHeight()) {
          image.resize(maxSize, Jimp.AUTO);
        } else {
          image.resize(Jimp.AUTO, maxSize);
        }
        console.log('✅ Nova dimensão:', image.getWidth(), 'x', image.getHeight());
      }
      
      // Para logos, converter SVG ou outros formatos para PNG de alta qualidade
      if (mime === 'image/svg+xml' || mime === 'image/bmp' || mime === 'image/tiff') {
        // Converter para PNG para melhor compatibilidade
        const pngPath = filePath.replace(/\.[^/.]+$/, '.png');
        await image.writeAsync(pngPath);
        
        // Remover arquivo original se for diferente
        if (pngPath !== filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        // Atualizar informações do arquivo
        req.file.filename = path.basename(pngPath);
        req.file.path = req.file.path.replace(/\.[^/.]+$/, '.png');
        req.file.mimetype = 'image/png';
        req.file.originalname = req.file.originalname.replace(/\.[^/.]+$/, '.png');
        req.file.size = fs.statSync(pngPath).size;
      } else {
        // Aplicar compressão baseada no formato
        if (mime === 'image/jpeg' || mime === 'image/jpg') {
          await image.quality(85).writeAsync(filePath);
        } else if (mime === 'image/png') {
          await image.deflateLevel(6).writeAsync(filePath);
        } else {
          // Para outros formatos, salvar como PNG
          const pngPath = filePath.replace(/\.[^/.]+$/, '.png');
          await image.writeAsync(pngPath);
          
          if (pngPath !== filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          
          req.file.filename = path.basename(pngPath);
          req.file.path = req.file.path.replace(/\.[^/.]+$/, '.png');
          req.file.mimetype = 'image/png';
          req.file.originalname = req.file.originalname.replace(/\.[^/.]+$/, '.png');
        }
        
        // Atualizar tamanho do arquivo
        const finalPath = req.file.path.includes('.png') ? req.file.path.replace(/\.[^/.]+$/, '.png') : filePath;
        if (fs.existsSync(finalPath)) {
          req.file.size = fs.statSync(finalPath).size;
        }
      }
      
      console.log('✅ Imagem processada com sucesso');
    } catch (err) {
      console.error('❌ Erro ao processar imagem:', err.message);
      console.error('📁 Arquivo:', filePath);
      console.error('🗂️ MIME type:', mime);
      // Se falhar, continuar sem processar - arquivo original será mantido
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
