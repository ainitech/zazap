import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const PushSubscription = sequelize.define('PushSubscriptions', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID do usuário que realizou a subscription (opcional)'
  },
  subscription: {
    type: DataTypes.JSONB,
    allowNull: false
  }
}, {
  tableName: 'PushSubscriptions',
  timestamps: true
});

export default PushSubscription;
