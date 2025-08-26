import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const TicketTag = sequelize.define('TicketTag', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  ticketId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Tickets',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  tagId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Tags',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  addedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  addedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ticket_tags',
  timestamps: true,
  indexes: [
    {
      fields: ['ticketId', 'tagId'],
      unique: true
    },
    {
      fields: ['ticketId']
    },
    {
      fields: ['tagId']
    },
    {
      fields: ['addedBy']
    },
    {
      fields: ['addedAt']
    }
  ]
});

export default TicketTag;
