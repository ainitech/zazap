import { Model, DataTypes } from 'sequelize';

export default (sequelize) => {
  class MessageReaction extends Model {
    static associate(models) {
      // Associação com TicketMessage
      MessageReaction.belongsTo(models.TicketMessage, {
        foreignKey: 'messageId',
        as: 'Message'
      });
      
      // Associação com User
      MessageReaction.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'User'
      });
    }
  }
  
  MessageReaction.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    messageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'TicketMessages',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    reaction: {
      type: DataTypes.STRING(10),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'MessageReaction',
    tableName: 'MessageReactions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['messageId', 'userId', 'reaction'],
        name: 'unique_message_user_reaction'
      }
    ]
  });
  
  return MessageReaction;
};
