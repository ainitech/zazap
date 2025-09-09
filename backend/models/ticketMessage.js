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
  mimeType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isPtt: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  isQuickReply: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  groupName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nome do grupo (se a mensagem veio de um grupo)',
  },
  participantName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Nome do participante que enviou a mensagem (em grupos)',
  },
  participantId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID do participante que enviou a mensagem (em grupos)',
  },
  isFromGroup: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica se a mensagem veio de um grupo',
  },
  messageType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'text',
    comment: 'Tipo da mensagem: text, poll, poll_response, etc',
  },
  channel: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'whatsapp',
    comment: 'Canal da mensagem (whatsapp, instagram, facebook)'
  },
  pollData: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Dados da enquete em formato JSON (pergunta, opções, etc)',
  },
  pollResponse: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Índice da opção selecionada na enquete (0-based)',
  },
  pollMessageId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID da mensagem de enquete original (para respostas)',
  },
  // LID support (Baileys v6.7.19+)
  senderLid: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'LID do remetente (quando disponível na mensagem.key.senderLid)'
  },
  participantLid: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'LID do participante (em grupos) quando disponível na mensagem.key.participantLid'
  },
  senderPn: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Phone number do remetente enviado no key (mensagens LID)'
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
