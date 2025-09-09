import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';
import Integration from './integration.js';
import Ticket from './ticket.js';

const IntegrationTicket = sequelize.define('IntegrationTicket', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  integrationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'integrations', key: 'id' },
  },
  ticketId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tickets', key: 'id' },
  },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'integration_tickets',
  timestamps: true,
});

// Definir associações explícitas para permitir include: [Integration]
IntegrationTicket.associate = (models) => {
  IntegrationTicket.belongsTo(models.Integration, { foreignKey: 'integrationId', as: 'Integration' });
  IntegrationTicket.belongsTo(models.Ticket, { foreignKey: 'ticketId', as: 'Ticket' });
};

export default IntegrationTicket;
