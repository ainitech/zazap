export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('integrations', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.ENUM('n8n', 'typebot', 'webhook'), allowNull: false },
      config: { type: Sequelize.JSONB, allowNull: true },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('integrations');
  },
};
