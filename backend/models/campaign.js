import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const Campaign = sequelize.define('Campaign', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  mediaUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mediaType: {
    type: DataTypes.ENUM('image', 'video', 'audio', 'document'),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'completed', 'paused', 'failed'),
    allowNull: false,
    defaultValue: 'draft'
  },
  segmentationType: {
    type: DataTypes.ENUM('all', 'tags', 'manual'),
    allowNull: false,
    defaultValue: 'all'
  },
  tagIds: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of tag IDs for segmentation'
  },
  contactIds: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of contact IDs for manual selection'
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  totalContacts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  sentCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  deliveredCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  failedCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  readCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  intervalSeconds: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    comment: 'Interval between messages in seconds'
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sessions',
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'campaigns',
  timestamps: true,
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['scheduledAt']
    },
    {
      fields: ['sessionId']
    },
    {
      fields: ['createdBy']
    },
    {
      fields: ['isActive']
    }
  ]
});

// Instance methods
Campaign.prototype.updateStats = async function(type) {
  switch(type) {
    case 'sent':
      this.sentCount += 1;
      break;
    case 'delivered':
      this.deliveredCount += 1;
      break;
    case 'failed':
      this.failedCount += 1;
      break;
    case 'read':
      this.readCount += 1;
      break;
  }
  await this.save();
};

Campaign.prototype.getProgress = function() {
  if (this.totalContacts === 0) return 0;
  return Math.round((this.sentCount / this.totalContacts) * 100);
};

Campaign.prototype.getSuccessRate = function() {
  if (this.sentCount === 0) return 0;
  return Math.round((this.deliveredCount / this.sentCount) * 100);
};

export default Campaign;
