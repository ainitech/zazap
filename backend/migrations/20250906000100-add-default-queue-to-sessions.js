export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sessions', 'defaultQueueId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'queues', key: 'id' },
      onUpdate: 'SET NULL',
      onDelete: 'SET NULL'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('sessions', 'defaultQueueId');
  }
};
