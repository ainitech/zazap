export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('integration_queues', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      integrationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'integrations', key: 'id' },
        onDelete: 'CASCADE',
      },
      queueId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'queues', key: 'id' },
        onDelete: 'CASCADE',
      },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('integration_queues');
  },
};
