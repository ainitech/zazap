import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';
import Ticket from './ticket.js';
import User from './user.js';

const TicketComment = sequelize.define('TicketComment', {
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
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'ticket_comments',
  timestamps: true,
});

Ticket.hasMany(TicketComment, { foreignKey: 'ticketId' });
TicketComment.belongsTo(Ticket, { foreignKey: 'ticketId' });
User.hasMany(TicketComment, { foreignKey: 'userId' });
TicketComment.belongsTo(User, { foreignKey: 'userId' });

export default TicketComment;
