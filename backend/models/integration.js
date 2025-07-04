import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const Integration = sequelize.define('Integration', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('n8n', 'typebot', 'webhook'), allowNull: false },
  config: { type: DataTypes.JSONB, allowNull: true },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'integrations',
  timestamps: true,
});

export default Integration;
