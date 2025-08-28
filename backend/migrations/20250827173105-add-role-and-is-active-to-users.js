export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'role', {
      type: Sequelize.ENUM('admin', 'supervisor', 'attendant'),
      allowNull: false,
      defaultValue: 'attendant',
    });

    await queryInterface.addColumn('users', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'role');
    await queryInterface.removeColumn('users', 'isActive');
  }
};
