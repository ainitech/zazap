export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sessions', 'name', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('sessions', 'name');
  }
};
