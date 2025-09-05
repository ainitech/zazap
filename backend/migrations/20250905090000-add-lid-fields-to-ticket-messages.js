'use strict';

export default {
  async up(queryInterface, Sequelize) {
    const table = 'ticket_messages';
    const desc = await queryInterface.describeTable(table);

    if (!desc.senderLid) {
      await queryInterface.addColumn(table, 'senderLid', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'LID do remetente (message.key.senderLid)'
      });
    }

    if (!desc.participantLid) {
      await queryInterface.addColumn(table, 'participantLid', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'LID do participante (message.key.participantLid)'
      });
    }

    if (!desc.senderPn) {
      await queryInterface.addColumn(table, 'senderPn', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Phone number do remetente (message.key.senderPn)'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = 'ticket_messages';
    const desc = await queryInterface.describeTable(table);

    if (desc.senderLid) {
      await queryInterface.removeColumn(table, 'senderLid');
    }
    if (desc.participantLid) {
      await queryInterface.removeColumn(table, 'participantLid');
    }
    if (desc.senderPn) {
      await queryInterface.removeColumn(table, 'senderPn');
    }
  }
};
