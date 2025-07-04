
import sequelize from '../services/sequelize.js';
import User from './user.js';
import Session from './session.js';
import Ticket from './ticket.js';
import Queue from './queue.js';
import UserQueue from './userQueue.js';
import TicketComment from './ticketComment.js';
import TicketMessage from './ticketMessage.js';
import Integration from './integration.js';
import IntegrationTicket from './integrationTicket.js';
import IntegrationQueue from './integrationQueue.js';

// Definir associações
User.hasMany(Session, { foreignKey: 'userId' });
Session.belongsTo(User, { foreignKey: 'userId' });

Session.hasMany(Ticket, { foreignKey: 'sessionId' });
Ticket.belongsTo(Session, { foreignKey: 'sessionId' });

Session.hasMany(Queue, { foreignKey: 'sessionId' });
Queue.belongsTo(Session, { foreignKey: 'sessionId' });

// User <-> Queue (many-to-many)
User.belongsToMany(Queue, { through: UserQueue, foreignKey: 'userId' });
Queue.belongsToMany(User, { through: UserQueue, foreignKey: 'queueId' });

// Ticket <-> TicketComment
Ticket.hasMany(TicketComment, { foreignKey: 'ticketId' });
TicketComment.belongsTo(Ticket, { foreignKey: 'ticketId' });
User.hasMany(TicketComment, { foreignKey: 'userId' });
TicketComment.belongsTo(User, { foreignKey: 'userId' });

// Ticket <-> TicketMessage
Ticket.hasMany(TicketMessage, { foreignKey: 'ticketId' });
TicketMessage.belongsTo(Ticket, { foreignKey: 'ticketId' });

// Integração <-> Ticket
Integration.belongsToMany(Ticket, { through: IntegrationTicket, foreignKey: 'integrationId' });
Ticket.belongsToMany(Integration, { through: IntegrationTicket, foreignKey: 'ticketId' });

// Integração <-> Queue
Integration.belongsToMany(Queue, { through: IntegrationQueue, foreignKey: 'integrationId' });
Queue.belongsToMany(Integration, { through: IntegrationQueue, foreignKey: 'queueId' });

export { 
  sequelize,
  User, 
  Session, 
  Ticket, 
  Queue, 
  UserQueue, 
  TicketComment, 
  TicketMessage, 
  Integration, 
  IntegrationTicket, 
  IntegrationQueue 
};
