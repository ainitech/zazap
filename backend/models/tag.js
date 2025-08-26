import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const Tag = sequelize.define('Tag', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'bg-blue-500',
    validate: {
      notEmpty: true
    }
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 50]
    }
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 5
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  usageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  tableName: 'tags',
  timestamps: true,
  paranoid: true, // Enables soft deletes
  indexes: [
    {
      fields: ['name'],
      unique: true
    },
    {
      fields: ['category']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['createdBy']
    }
  ]
});

// Instance methods
Tag.prototype.incrementUsage = async function() {
  this.usageCount += 1;
  await this.save();
};

Tag.prototype.decrementUsage = async function() {
  if (this.usageCount > 0) {
    this.usageCount -= 1;
    await this.save();
  }
};

// Class methods
Tag.getPopularTags = async function(limit = 10) {
  return await this.findAll({
    where: { isActive: true },
    order: [['usageCount', 'DESC']],
    limit
  });
};

Tag.getByCategory = async function(category) {
  return await this.findAll({
    where: { 
      category,
      isActive: true 
    },
    order: [['priority', 'DESC'], ['name', 'ASC']]
  });
};

Tag.searchTags = async function(query) {
  const { Op } = await import('sequelize');
  return await this.findAll({
    where: {
      isActive: true,
      [Op.or]: [
        { name: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
        { category: { [Op.iLike]: `%${query}%` } }
      ]
    },
    order: [['usageCount', 'DESC'], ['name', 'ASC']]
  });
};

export default Tag;
