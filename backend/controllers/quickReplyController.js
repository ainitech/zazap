import { QuickReply, User } from '../models/index.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuração do multer para upload de mídia
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    // Determinar pasta baseada no tipo de arquivo
    if (file.mimetype.startsWith('audio/')) {
      uploadPath += 'audios/';
    } else if (file.mimetype.startsWith('image/')) {
      uploadPath += 'imagens/';
    } else if (file.mimetype.startsWith('video/')) {
      uploadPath += 'videos/';
    } else {
      uploadPath += 'documentos/';
    }
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-quick-reply${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB limite
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas arquivos de mídia
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|mp3|wav|ogg|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// ================================
// FUNÇÕES DE PROCESSAMENTO DE VARIÁVEIS
// ================================

const processVariables = (content, variables = {}) => {
  if (!content) return content;
  
  let processedContent = content;
  
  // Variáveis padrão do sistema
  const now = new Date();
  const hour = now.getHours();
  
  let saudacao = 'Olá';
  if (hour >= 6 && hour < 12) {
    saudacao = 'Bom dia';
  } else if (hour >= 12 && hour < 18) {
    saudacao = 'Boa tarde';
  } else {
    saudacao = 'Boa noite';
  }
  
  const systemVariables = {
    saudacao,
    hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    data: now.toLocaleDateString('pt-BR'),
    dia_semana: now.toLocaleDateString('pt-BR', { weekday: 'long' }),
    nome_empresa: 'ZaZap',
    ...variables // Variáveis customizadas sobrescrevem as padrão
  };
  
  // Substituir variáveis no formato {{variavel}}
  Object.keys(systemVariables).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    processedContent = processedContent.replace(regex, systemVariables[key]);
  });
  
  return processedContent;
};

// ================================
// CRUD DE RESPOSTAS RÁPIDAS
// ================================

// Listar todas as respostas rápidas do usuário
export const getQuickReplies = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const { page = 1, limit = 50, search = '', type = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {
      userId: req.user.id,
      isActive: true
    };
    
    // Filtro por busca
    if (search) {
      whereClause[Symbol.for('sequelize.or')] = [
        { title: { [Symbol.for('sequelize.iLike')]: `%${search}%` } },
        { shortcut: { [Symbol.for('sequelize.iLike')]: `%${search}%` } },
        { content: { [Symbol.for('sequelize.iLike')]: `%${search}%` } }
      ];
    }
    
    // Filtro por tipo
    if (type !== 'all') {
      whereClause.mediaType = type;
    }
    
    const { count, rows: quickReplies } = await QuickReply.findAndCountAll({
      where: whereClause,
      order: [
        ['usageCount', 'DESC'], // Mais usadas primeiro
        ['title', 'ASC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    // Processar variáveis nos conteúdos para preview
    const processedReplies = quickReplies.map(reply => ({
      ...reply.toJSON(),
      contentPreview: processVariables(reply.content, reply.variables)
    }));
    
    res.json({
      quickReplies: processedReplies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar respostas rápidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar resposta rápida por atalho
export const getQuickReplyByShortcut = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const { shortcut } = req.params;
    
    const quickReply = await QuickReply.findOne({
      where: {
        userId: req.user.id,
        shortcut: shortcut.toLowerCase(),
        isActive: true
      }
    });
    
    if (!quickReply) {
      return res.status(404).json({ error: 'Resposta rápida não encontrada' });
    }
    
    // Processar variáveis
    const processedContent = processVariables(quickReply.content, quickReply.variables);
    
    // Incrementar contador de uso
    await quickReply.increment('usageCount');
    
    res.json({
      ...quickReply.toJSON(),
      processedContent
    });
    
  } catch (error) {
    console.error('Erro ao buscar resposta rápida por atalho:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar sugestões de respostas rápidas baseado no texto digitado
export const searchQuickReplies = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const { query = '' } = req.query;
    
    if (query.length < 1) {
      return res.json({ suggestions: [] });
    }
    
    const suggestions = await QuickReply.findAll({
      where: {
        userId: req.user.id,
        isActive: true,
        [Symbol.for('sequelize.or')]: [
          { shortcut: { [Symbol.for('sequelize.iLike')]: `%${query}%` } },
          { title: { [Symbol.for('sequelize.iLike')]: `%${query}%` } }
        ]
      },
      order: [
        ['usageCount', 'DESC'],
        ['title', 'ASC']
      ],
      limit: 10,
      attributes: ['id', 'title', 'shortcut', 'content', 'mediaType', 'mediaUrl', 'variables']
    });
    
    // Processar variáveis para preview
    const processedSuggestions = suggestions.map(suggestion => ({
      ...suggestion.toJSON(),
      contentPreview: processVariables(suggestion.content, suggestion.variables)
    }));
    
    res.json({ suggestions: processedSuggestions });
    
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar nova resposta rápida
export const createQuickReply = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const { title, shortcut, content, mediaType = 'text', variables = {} } = req.body;
    
    // Validações
    if (!title || !shortcut) {
      return res.status(400).json({ error: 'Título e atalho são obrigatórios' });
    }
    
    // Verificar se atalho já existe para este usuário
    const existingReply = await QuickReply.findOne({
      where: {
        userId: req.user.id,
        shortcut: shortcut.toLowerCase()
      }
    });
    
    if (existingReply) {
      return res.status(400).json({ error: 'Atalho já existe' });
    }
    
    // Preparar dados da resposta rápida
    const quickReplyData = {
      userId: req.user.id,
      title,
      shortcut: shortcut.toLowerCase(),
      content: content || '',
      mediaType,
      variables: typeof variables === 'string' ? JSON.parse(variables) : variables
    };
    
    // Se tem arquivo de mídia
    if (req.file) {
      quickReplyData.mediaUrl = `/${req.file.path.replace(/\\/g, '/')}`;
      quickReplyData.fileName = req.file.originalname;
      
      // Atualizar mediaType baseado no arquivo
      if (req.file.mimetype.startsWith('audio/')) {
        quickReplyData.mediaType = 'audio';
      } else if (req.file.mimetype.startsWith('image/')) {
        quickReplyData.mediaType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        quickReplyData.mediaType = 'video';
      } else {
        quickReplyData.mediaType = 'document';
      }
    }
    
    const quickReply = await QuickReply.create(quickReplyData);
    
    res.status(201).json({
      message: 'Resposta rápida criada com sucesso',
      quickReply: {
        ...quickReply.toJSON(),
        contentPreview: processVariables(quickReply.content, quickReply.variables)
      }
    });
    
  } catch (error) {
    console.error('Erro ao criar resposta rápida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar resposta rápida
export const updateQuickReply = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const { id } = req.params;
    const { title, shortcut, content, mediaType, variables = {}, isActive } = req.body;
    
    const quickReply = await QuickReply.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });
    
    if (!quickReply) {
      return res.status(404).json({ error: 'Resposta rápida não encontrada' });
    }
    
    // Verificar se atalho já existe (se foi alterado)
    if (shortcut && shortcut.toLowerCase() !== quickReply.shortcut) {
      const existingReply = await QuickReply.findOne({
        where: {
          userId: req.user.id,
          shortcut: shortcut.toLowerCase(),
          id: { [Symbol.for('sequelize.ne')]: id }
        }
      });
      
      if (existingReply) {
        return res.status(400).json({ error: 'Atalho já existe' });
      }
    }
    
    // Atualizar campos
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (shortcut !== undefined) updateData.shortcut = shortcut.toLowerCase();
    if (content !== undefined) updateData.content = content;
    if (mediaType !== undefined) updateData.mediaType = mediaType;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (variables !== undefined) updateData.variables = typeof variables === 'string' ? JSON.parse(variables) : variables;
    
    // Se tem novo arquivo de mídia
    if (req.file) {
      // Remover arquivo antigo se existir
      if (quickReply.mediaUrl) {
        const oldFilePath = path.join(process.cwd(), quickReply.mediaUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      
      updateData.mediaUrl = `/${req.file.path.replace(/\\/g, '/')}`;
      updateData.fileName = req.file.originalname;
      
      // Atualizar mediaType baseado no arquivo
      if (req.file.mimetype.startsWith('audio/')) {
        updateData.mediaType = 'audio';
      } else if (req.file.mimetype.startsWith('image/')) {
        updateData.mediaType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        updateData.mediaType = 'video';
      } else {
        updateData.mediaType = 'document';
      }
    }
    
    await quickReply.update(updateData);
    
    const updatedReply = await QuickReply.findByPk(id);
    
    res.json({
      message: 'Resposta rápida atualizada com sucesso',
      quickReply: {
        ...updatedReply.toJSON(),
        contentPreview: processVariables(updatedReply.content, updatedReply.variables)
      }
    });
    
  } catch (error) {
    console.error('Erro ao atualizar resposta rápida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar resposta rápida
export const deleteQuickReply = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const { id } = req.params;
    
    const quickReply = await QuickReply.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });
    
    if (!quickReply) {
      return res.status(404).json({ error: 'Resposta rápida não encontrada' });
    }
    
    // Remover arquivo de mídia se existir
    if (quickReply.mediaUrl) {
      const filePath = path.join(process.cwd(), quickReply.mediaUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await quickReply.destroy();
    
    res.json({ message: 'Resposta rápida deletada com sucesso' });
    
  } catch (error) {
    console.error('Erro ao deletar resposta rápida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Duplicar resposta rápida
export const duplicateQuickReply = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    const { id } = req.params;
    
    const originalReply = await QuickReply.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });
    
    if (!originalReply) {
      return res.status(404).json({ error: 'Resposta rápida não encontrada' });
    }
    
    // Criar cópia
    const duplicateData = {
      ...originalReply.toJSON(),
      title: `${originalReply.title} (Cópia)`,
      shortcut: `${originalReply.shortcut}_copy`,
      usageCount: 0
    };
    
    delete duplicateData.id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    
    // Verificar se o novo atalho já existe
    let counter = 1;
    let newShortcut = duplicateData.shortcut;
    while (await QuickReply.findOne({ where: { userId: req.user.id, shortcut: newShortcut } })) {
      newShortcut = `${originalReply.shortcut}_copy${counter}`;
      counter++;
    }
    duplicateData.shortcut = newShortcut;
    
    const duplicatedReply = await QuickReply.create(duplicateData);
    
    res.status(201).json({
      message: 'Resposta rápida duplicada com sucesso',
      quickReply: {
        ...duplicatedReply.toJSON(),
        contentPreview: processVariables(duplicatedReply.content, duplicatedReply.variables)
      }
    });
    
  } catch (error) {
    console.error('Erro ao duplicar resposta rápida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para upload
export const uploadMiddleware = upload.single('media');

export { processVariables };
