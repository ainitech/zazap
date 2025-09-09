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
import PushSubscription from './pushSubscription.js';
import QuickReply from './quickReply.js';
import messageReactionFactory from './messageReaction.js';
import Schedule from './schedule.js';
import Tag from './tag.js';
import TicketTag from './ticketTag.js';
import Campaign from './campaign.js';
import CampaignMessage from './campaignMessage.js';
import refreshTokenFactory from './refreshToken.js';
import Setting from './setting.js';

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

// Associações diretas para permitir eager loading nas tabelas de junção
IntegrationTicket.belongsTo(Integration, { foreignKey: 'integrationId', as: 'Integration' });
IntegrationTicket.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'Ticket' });

// Integração <-> Queue
Integration.belongsToMany(Queue, { through: IntegrationQueue, foreignKey: 'integrationId' });
Queue.belongsToMany(Integration, { through: IntegrationQueue, foreignKey: 'queueId' });

IntegrationQueue.belongsTo(Integration, { foreignKey: 'integrationId', as: 'Integration' });
IntegrationQueue.belongsTo(Queue, { foreignKey: 'queueId', as: 'Queue' });

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

// User <-> QuickReply
User.hasMany(QuickReply, { foreignKey: 'userId', as: 'QuickReplies' });
QuickReply.belongsTo(User, { foreignKey: 'userId', as: 'User' });

const MessageReaction = messageReactionFactory(sequelize);
const RefreshToken = refreshTokenFactory(sequelize, sequelize.Sequelize.DataTypes);

// RefreshToken associations
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Schedule associations
User.hasMany(Schedule, { foreignKey: 'userId' });
Schedule.belongsTo(User, { foreignKey: 'userId' });
Session.hasMany(Schedule, { foreignKey: 'sessionId' });
Schedule.belongsTo(Session, { foreignKey: 'sessionId' });
Contact.hasMany(Schedule, { foreignKey: 'contactId' });
Schedule.belongsTo(Contact, { foreignKey: 'contactId' });
Queue.hasMany(Schedule, { foreignKey: 'queueId' });
Schedule.belongsTo(Queue, { foreignKey: 'queueId' });

// Tag associations
User.hasMany(Tag, { foreignKey: 'createdBy', as: 'createdTags' });
Tag.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Ticket <-> Tag (many-to-many)
Ticket.belongsToMany(Tag, { through: TicketTag, foreignKey: 'ticketId', as: 'tags' });
Tag.belongsToMany(Ticket, { through: TicketTag, foreignKey: 'tagId', as: 'tickets' });

// TicketTag associations
TicketTag.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });
TicketTag.belongsTo(Tag, { foreignKey: 'tagId', as: 'tag' });
TicketTag.belongsTo(User, { foreignKey: 'addedBy', as: 'addedByUser' });

// Campaign associations
User.hasMany(Campaign, { foreignKey: 'createdBy', as: 'campaigns' });
Campaign.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Session.hasMany(Campaign, { foreignKey: 'sessionId', as: 'campaigns' });
Campaign.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });

// Campaign <-> CampaignMessage
Campaign.hasMany(CampaignMessage, { foreignKey: 'campaignId', as: 'messages' });
CampaignMessage.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });
Contact.hasMany(CampaignMessage, { foreignKey: 'contactId', as: 'campaignMessages' });
CampaignMessage.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });

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
  PushSubscription,
  QuickReply,
  MessageReaction,
  RefreshToken,
  Schedule,
  Tag,
  TicketTag,
  Campaign,
  CampaignMessage,
  Setting
};
