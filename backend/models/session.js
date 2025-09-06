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
  library: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'disconnected',
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
