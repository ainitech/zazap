import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    unique: true,
    comment: 'UID único para acesso direto ao ticket via link'
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'sessions',
      key: 'id',
    },
  },
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'contacts',
      key: 'id',
    },
    comment: 'ID do contato vinculado ao ticket'
  },
  queueId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'queues',
      key: 'id',
    },
    comment: 'ID da fila vinculada ao ticket'
  },
  assignedUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
    comment: 'ID do usuário responsável pelo ticket'
  },
  contact: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  unreadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'open',
  },
  channel: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'whatsapp',
    comment: 'Canal de origem da conversa (whatsapp, instagram, facebook)'
  },
  chatStatus: {
    type: DataTypes.ENUM('waiting', 'accepted', 'resolved', 'closed'),
    defaultValue: 'waiting',
    allowNull: false,
    comment: 'Status do chat: aguardando, aceito, resolvido ou fechado'
  },
  protocol: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Número de protocolo gerado ao fechar o ticket'
  },
  npsScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Pontuação NPS fornecida pelo cliente (0-10)'
  },
  npsUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    comment: 'Usuário responsável no momento da captura do NPS'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal',
    allowNull: false,
    comment: 'Prioridade do ticket'
  },
  isBot: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Se o ticket está sendo atendido por bot'
  },
}, {
  tableName: 'tickets',
  timestamps: true,
});

export default Ticket;
