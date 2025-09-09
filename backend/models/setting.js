import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Chave única da configuração (ex: system_logo, company_name)'
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Valor da configuração em formato JSON ou texto'
  },
  type: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'file'),
    allowNull: false,
    defaultValue: 'string',
    comment: 'Tipo do valor da configuração'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Descrição da configuração'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'general',
    comment: 'Categoria da configuração (general, appearance, system, etc.)'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Se a configuração pode ser acessada publicamente (sem autenticação)'
  }
}, {
  tableName: 'settings',
  timestamps: true,
  indexes: [
    {
      fields: ['key']
    },
    {
      fields: ['category']
    }
  ]
});

export default Setting;
