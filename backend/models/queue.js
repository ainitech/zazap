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
  outOfHoursMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mensagem fora do horário de expediente'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Indica se a fila está ativa'
  },
  archivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data em que a fila foi arquivada'
  },
  autoReceiveMessages: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Se a fila deve receber mensagens automaticamente'
  },
  autoAssignment: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Se deve fazer atribuição automática de usuários'
  },
  autoReply: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Se deve enviar resposta automática'
  },
  autoClose: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Se deve fechar ticket automaticamente por inatividade'
  },
  autoCloseTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Tempo em minutos para fechamento automático'
  },
  feedbackCollection: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Se deve coletar feedback do cliente'
  },
  feedbackMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mensagem para coleta de feedback'
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
