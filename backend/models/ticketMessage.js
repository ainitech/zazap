import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';

const TicketMessage = sequelize.define('TicketMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ticketId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tickets',
      key: 'id',
    },
  },
  sender: {
    type: DataTypes.STRING, // 'user' ou 'contact'
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'ticket_messages',
  timestamps: true, // Habilita createdAt e updatedAt
});

// Associações
TicketMessage.associate = function(models) {
  // Associação com Ticket
  TicketMessage.belongsTo(models.Ticket, {
    foreignKey: 'ticketId',
    as: 'Ticket'
  });
  
  // Associação com reações
  TicketMessage.hasMany(models.MessageReaction, {
    foreignKey: 'messageId',
    as: 'reactions'
  });
};

export default TicketMessage;
