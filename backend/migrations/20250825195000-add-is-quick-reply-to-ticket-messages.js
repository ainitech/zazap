export default {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('ticket_messages');
    if (!table.isQuickReply) {
      await queryInterface.addColumn('ticket_messages', 'isQuickReply', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: 'Indica se a mensagem foi enviada via Quick Reply'
      });
    }
  },
  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('ticket_messages');
    if (table.isQuickReply) {
      await queryInterface.removeColumn('ticket_messages', 'isQuickReply');
    }
  }
};
