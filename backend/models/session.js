import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  whatsappId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  realNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  library: {
    type: DataTypes.ENUM('baileys', 'whatsappjs', 'instagram', 'facebook'),
    allowNull: false,
    defaultValue: 'baileys',
    comment: 'Biblioteca utilizada para esta sessão'
  },
  // Canal da sessão: whatsapp, instagram, facebook
  channel: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'whatsapp',
    comment: 'Canal / plataforma da sessão (whatsapp, instagram, facebook)'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'disconnected',
  },
  importAllChats: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Se verdadeiro, ao conectar a sessão Baileys fará importação de todo histórico de chats.'
  },
  importFromDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Data inicial para filtro de importação (inclusive)'
  },
  importToDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Data final para filtro de importação (inclusive)'
  },
  defaultQueueId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'queues',
      key: 'id'
    }
  }
}, {
  tableName: 'sessions',
  timestamps: true,
});

export default Session;
