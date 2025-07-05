import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
}, {
  tableName: 'tickets',
  timestamps: true,
});

export default Ticket;
