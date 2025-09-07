export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sessions', 'realNumber', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('sessions', 'realNumber');
  }
};
