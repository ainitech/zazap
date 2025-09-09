import Setting from '../models/setting.js';
import fs from 'fs/promises';
import path from 'path';

// Obter todas as configurações
export const getSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll();
    
    // Converter para objeto com chave-valor
    const settingsObject = {};
    settings.forEach(setting => {
      settingsObject[setting.key] = {
        value: setting.type === 'json' ? JSON.parse(setting.value || '{}') : setting.value,
        type: setting.type,
        description: setting.description,
        category: setting.category,
        isPublic: setting.isPublic
      };
    });

    res.json(settingsObject);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Obter configurações públicas (sem autenticação)
export const getPublicSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll({
      where: { isPublic: true }
    });

    const settingsObject = {};
    settings.forEach(setting => {
      settingsObject[setting.key] = {
        value: setting.type === 'json' ? JSON.parse(setting.value || '{}') : setting.value,
        type: setting.type,
        description: setting.description,
        category: setting.category
      };
    });

    res.json(settingsObject);
  } catch (error) {
    console.error('Erro ao buscar configurações públicas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Obter configuração por chave
export const getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ where: { key } });

    if (!setting) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    res.json({
      value: setting.type === 'json' ? JSON.parse(setting.value || '{}') : setting.value,
      type: setting.type,
      description: setting.description,
      category: setting.category,
      isPublic: setting.isPublic
    });
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar configuração
export const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    let setting = await Setting.findOne({ where: { key } });

    // Se não existir, criar automaticamente (facilita adicionar novas keys sem nova seed)
    if (!setting) {
      // Inferir tipo
      let inferredType = 'string';
      if (typeof value === 'number') inferredType = 'number';
      else if (typeof value === 'boolean') inferredType = 'boolean';
      else if (value && typeof value === 'object') inferredType = 'json';

      setting = await Setting.create({
        key,
        value: inferredType === 'json' ? JSON.stringify(value) : String(value ?? ''),
        type: inferredType,
        description: description || null,
        category: 'chat', // default para novas chaves dinâmicas relacionadas a esta feature
        isPublic: false
      });
      console.log(`[settings] Criada nova configuração dinâmica: ${key}`);
    } else {
      // Se for do tipo file e estiver removendo, deletar o arquivo antigo
      if (setting.type === 'file' && setting.value && !value) {
        try {
          const filePath = path.join(process.cwd(), 'uploads', setting.value);
          await fs.unlink(filePath);
        } catch (fileError) {
          console.warn('Erro ao deletar arquivo antigo:', fileError);
        }
      }

      await setting.update({
        value: setting.type === 'json' ? JSON.stringify(value) : value,
        description: description || setting.description
      });
    }

    res.json({
      value: setting.type === 'json' ? JSON.parse(setting.value || '{}') : setting.value,
      type: setting.type,
      description: setting.description,
      category: setting.category,
      isPublic: setting.isPublic
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar múltiplas configurações
export const updateSettings = async (req, res) => {
  try {
    const settings = req.body;
    const results = {};

    for (const [key, value] of Object.entries(settings)) {
      let setting = await Setting.findOne({ where: { key } });

      if (!setting) {
        let inferredType = 'string';
        if (typeof value === 'number') inferredType = 'number';
        else if (typeof value === 'boolean') inferredType = 'boolean';
        else if (value && typeof value === 'object') inferredType = 'json';

        setting = await Setting.create({
          key,
            value: inferredType === 'json' ? JSON.stringify(value) : String(value ?? ''),
            type: inferredType,
            description: null,
            category: 'chat',
            isPublic: false
        });
        console.log(`[settings] Criada nova configuração dinâmica (bulk): ${key}`);
      } else {
        await setting.update({
          value: setting.type === 'json' ? JSON.stringify(value) : value
        });
      }

      results[key] = {
        value: setting.type === 'json' ? JSON.parse(setting.value || '{}') : setting.value,
        type: setting.type,
        description: setting.description,
        category: setting.category,
        isPublic: setting.isPublic
      };
    }

    res.json(results);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Upload de logo
export const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Validação mais flexível do tipo de arquivo
    const validMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/bmp', 'image/svg+xml', 'image/tiff', 'image/ico', 'image/heic'
    ];

    if (!req.file.mimetype.startsWith('image/') && !validMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Formato de arquivo não suportado. Use apenas imagens.' });
    }

    const logoSetting = await Setting.findOne({ where: { key: 'system_logo' } });
    
    if (!logoSetting) {
      return res.status(404).json({ error: 'Configuração de logo não encontrada' });
    }

    // Deletar logo antigo se existir
    if (logoSetting.value) {
      try {
        const oldLogoPath = path.join(process.cwd(), 'uploads', logoSetting.value);
        await fs.unlink(oldLogoPath);
      } catch (fileError) {
        console.warn('Erro ao deletar logo antigo:', fileError);
      }
    }

    // Atualizar configuração com novo arquivo
    await logoSetting.update({
      value: req.file.filename
    });

    res.json({
      message: 'Logo atualizado com sucesso! O sistema otimizou automaticamente a imagem.',
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
      originalSize: req.file.size,
      processedMimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Erro ao fazer upload do logo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Remover logo
export const removeLogo = async (req, res) => {
  try {
    const logoSetting = await Setting.findOne({ where: { key: 'system_logo' } });
    
    if (!logoSetting || !logoSetting.value) {
      return res.status(404).json({ error: 'Logo não encontrado' });
    }

    // Deletar arquivo do logo
    try {
      const logoPath = path.join(process.cwd(), 'uploads', logoSetting.value);
      await fs.unlink(logoPath);
    } catch (fileError) {
      console.warn('Erro ao deletar arquivo do logo:', fileError);
    }

    // Limpar configuração
    await logoSetting.update({ value: '' });

    res.json({ message: 'Logo removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover logo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
