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
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sessions',
      key: 'id',
    },
  },
}, {
  tableName: 'queues',
  timestamps: true,
});

export default Queue;
