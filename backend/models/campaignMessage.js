import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const CampaignMessage = sequelize.define('CampaignMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  campaignId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'campaigns',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  contactId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'contacts',
      key: 'id'
    }
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'sending', 'sent', 'delivered', 'read', 'failed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  messageId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'WhatsApp message ID'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  failedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  retryCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  scheduledFor: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'campaign_messages',
  timestamps: true,
  indexes: [
    {
      fields: ['campaignId']
    },
    {
      fields: ['contactId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['scheduledFor']
    },
    {
      fields: ['phoneNumber']
    }
  ]
});

export default CampaignMessage;
