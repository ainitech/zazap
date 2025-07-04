export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tickets', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'open',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('tickets', 'status');
  },
};
