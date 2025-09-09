import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';
import Integration from './integration.js';
import Queue from './queue.js';

const IntegrationQueue = sequelize.define('IntegrationQueue', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  integrationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'integrations', key: 'id' },
  },
  queueId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'queues', key: 'id' },
  },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'integration_queues',
  timestamps: true,
});

IntegrationQueue.associate = (models) => {
  IntegrationQueue.belongsTo(models.Integration, { foreignKey: 'integrationId', as: 'Integration' });
  IntegrationQueue.belongsTo(models.Queue, { foreignKey: 'queueId', as: 'Queue' });
};

export default IntegrationQueue;
