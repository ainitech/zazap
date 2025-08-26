import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const Queue = sequelize.define('Queue', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Nome da fila (ex: 📞 Atendimento!)'
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sessions',
      key: 'id',
    },
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '#0420BF',
    comment: 'Cor da fila em hexadecimal'
  },
  botOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Ordem da fila no bot'
  },
  closeTicket: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Se deve fechar ticket automaticamente'
  },
  rotation: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'round-robin',
    comment: 'Tipo de rotação da fila (round-robin, sequential, random)'
  },
  integration: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Tipo de integração'
  },
  fileList: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Lista de arquivos da fila'
  },
  greetingMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mensagem de saudação da fila'
  },
  options: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Opções adicionais da fila'
  }
}, {
  tableName: 'queues',
  timestamps: true,
});

export default Queue;
