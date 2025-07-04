export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ticket_messages', 'fileUrl', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('ticket_messages', 'fileName', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('ticket_messages', 'fileType', { type: Sequelize.STRING, allowNull: true });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('ticket_messages', 'fileUrl');
    await queryInterface.removeColumn('ticket_messages', 'fileName');
    await queryInterface.removeColumn('ticket_messages', 'fileType');
  },
};
