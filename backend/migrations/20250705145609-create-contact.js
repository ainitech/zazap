'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contacts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      whatsappId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'ID do contato no WhatsApp (ex: 5511999999999@c.us)'
      },
      sessionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'sessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID da sessão WhatsApp'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Nome do contato no WhatsApp'
      },
      pushname: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Nome exibido do contato'
      },
      formattedNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Número formatado do contato'
      },
      profilePicUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'URL da foto do perfil'
      },
      isBlocked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Se o contato está bloqueado'
      },
      isGroup: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Se é um grupo'
      },
      isWAContact: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Se é um contato válido do WhatsApp'
      },
      lastSeen: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Última vez que foi visto online'
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

    // Criar índices para melhor performance
    await queryInterface.addIndex('contacts', ['whatsappId']);
    await queryInterface.addIndex('contacts', ['sessionId']);
    await queryInterface.addIndex('contacts', ['whatsappId', 'sessionId'], {
      unique: true,
      name: 'contacts_whatsapp_session_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('contacts');
  }
};
