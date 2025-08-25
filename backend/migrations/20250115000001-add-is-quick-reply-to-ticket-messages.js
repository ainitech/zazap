export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ticket_messages', 'isQuickReply', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: 'Indica se a mensagem foi enviada via Quick Reply'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('ticket_messages', 'isQuickReply');
  }
};
