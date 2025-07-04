export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('integration_tickets', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      integrationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'integrations', key: 'id' },
        onDelete: 'CASCADE',
      },
      ticketId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tickets', key: 'id' },
        onDelete: 'CASCADE',
      },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('integration_tickets');
  },
};
