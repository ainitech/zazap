import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const Schedule = sequelize.define('Schedule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'FK para sessions.id'
  },
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'FK para contacts.id (opcional)'
  },
  queueId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  to: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Destino WhatsApp (ex: 5511999999999@c.us)'
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'text',
    comment: 'text | media'
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sendAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
    comment: 'pending | processing | sent | failed | canceled'
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lastError: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'schedules',
  indexes: [
    { fields: ['status'] },
    { fields: ['sendAt'] }
  ]
});

export default Schedule;
