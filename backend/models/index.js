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
import Contact from './contact.js';
import messageReactionFactory from './messageReaction.js';

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

// Integração <-> Ticket
Integration.belongsToMany(Ticket, { through: IntegrationTicket, foreignKey: 'integrationId' });
Ticket.belongsToMany(Integration, { through: IntegrationTicket, foreignKey: 'ticketId' });

// Integração <-> Queue
Integration.belongsToMany(Queue, { through: IntegrationQueue, foreignKey: 'integrationId' });
Queue.belongsToMany(Integration, { through: IntegrationQueue, foreignKey: 'queueId' });

// Session <-> Contact
Session.hasMany(Contact, { foreignKey: 'sessionId' });
Contact.belongsTo(Session, { foreignKey: 'sessionId' });

// Contact <-> Ticket
Contact.hasMany(Ticket, { foreignKey: 'contactId' });
Ticket.belongsTo(Contact, { foreignKey: 'contactId' });

// Queue <-> Ticket
Queue.hasMany(Ticket, { foreignKey: 'queueId' });
Ticket.belongsTo(Queue, { foreignKey: 'queueId' });

// User <-> Ticket (assigned user)
User.hasMany(Ticket, { foreignKey: 'assignedUserId', as: 'AssignedTickets' });
Ticket.belongsTo(User, { foreignKey: 'assignedUserId', as: 'AssignedUser' });

const MessageReaction = messageReactionFactory(sequelize);

// Chamar associate se existir
if (typeof TicketMessage.associate === 'function') TicketMessage.associate({
  Ticket,
  MessageReaction
});
if (typeof MessageReaction.associate === 'function') MessageReaction.associate({
  TicketMessage,
  User
});

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
  IntegrationQueue,
  Contact,
  MessageReaction
};
