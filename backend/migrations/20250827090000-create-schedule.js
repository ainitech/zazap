export default {
  up: async (queryInterface, Sequelize) => {
    const table = 'schedules';
    const exists = await queryInterface.sequelize.query("SELECT to_regclass('public.schedules') as reg");
    const already = exists?.[0]?.[0]?.reg;
    if (already) return;

    await queryInterface.createTable(table, {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      sessionId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'sessions', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      contactId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'contacts', key: 'id' }, onUpdate: 'SET NULL', onDelete: 'SET NULL' },
      queueId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'queues', key: 'id' }, onUpdate: 'SET NULL', onDelete: 'SET NULL' },
      to: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.STRING, allowNull: false, defaultValue: 'text' },
      text: { type: Sequelize.TEXT, allowNull: true },
      filePath: { type: Sequelize.STRING, allowNull: true },
      fileName: { type: Sequelize.STRING, allowNull: true },
      fileType: { type: Sequelize.STRING, allowNull: true },
      sendAt: { type: Sequelize.DATE, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'pending' },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      lastError: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addIndex(table, ['status']);
    await queryInterface.addIndex(table, ['sendAt']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('schedules');
  }
}
