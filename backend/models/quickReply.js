import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const QuickReply = sequelize.define('QuickReply', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nome/título da resposta rápida'
  },
  shortcut: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Atalho para ativar (ex: "audio", "ola")'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Conteúdo de texto da mensagem'
  },
  mediaType: {
    type: DataTypes.ENUM('text', 'image', 'audio', 'video', 'document'),
    allowNull: false,
    defaultValue: 'text',
    comment: 'Tipo de mídia da resposta rápida'
  },
  mediaUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL do arquivo de mídia (se aplicável)'
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nome original do arquivo'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Se a resposta rápida está ativa'
  },
  usageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Contador de quantas vezes foi usada'
  },
  variables: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Variáveis dinâmicas disponíveis'
  }
}, {
  tableName: 'QuickReplies',
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['shortcut']
    },
    {
      fields: ['userId', 'shortcut'],
      unique: true,
      name: 'unique_user_shortcut'
    }
  ]
});

// Associações
QuickReply.associate = (models) => {
  QuickReply.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'User'
  });
};

export default QuickReply;
