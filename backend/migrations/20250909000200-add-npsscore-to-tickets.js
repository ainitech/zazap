export const up = async (queryInterface, Sequelize) => {
  const table = 'tickets';
  const def = await queryInterface.describeTable(table);
  if (!def.npsScore) {
    await queryInterface.addColumn(table, 'npsScore', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Pontuação NPS 0-10'
    });
  }
};

export const down = async (queryInterface) => {
  const table = 'tickets';
  const def = await queryInterface.describeTable(table);
  if (def.npsScore) {
    await queryInterface.removeColumn(table, 'npsScore');
  }
};
