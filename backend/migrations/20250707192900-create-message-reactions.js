'use strict';

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('MessageReactions', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    messageId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'ticket_messages',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    reaction: {
      type: Sequelize.STRING(10),
      allowNull: false
    },
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE
    }
  });

  // Índice único para evitar reações duplicadas do mesmo usuário na mesma mensagem com a mesma reação
  await queryInterface.addIndex('MessageReactions', ['messageId', 'userId', 'reaction'], {
    unique: true,
    name: 'unique_message_user_reaction'
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('MessageReactions');
}
