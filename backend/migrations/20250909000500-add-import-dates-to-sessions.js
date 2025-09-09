export const up = async (queryInterface, Sequelize) => {
  const table = 'sessions';
  const def = await queryInterface.describeTable(table);
  // Add importFromDate
  if (!def.importFromDate) {
    await queryInterface.addColumn(table, 'importFromDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Data inicial (inclusive) para importação de chats históricos'
    });
  }
  // Add importToDate
  if (!def.importToDate) {
    await queryInterface.addColumn(table, 'importToDate', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Data final (inclusive) para importação de chats históricos'
    });
  }
};

export const down = async (queryInterface) => {
  const table = 'sessions';
  const def = await queryInterface.describeTable(table);
  if (def.importFromDate) {
    await queryInterface.removeColumn(table, 'importFromDate');
  }
  if (def.importToDate) {
    await queryInterface.removeColumn(table, 'importToDate');
  }
};
