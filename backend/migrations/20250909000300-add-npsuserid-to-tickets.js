export const up = async (queryInterface, Sequelize) => {
  const table = 'tickets';
  const def = await queryInterface.describeTable(table);
  if (!def.npsUserId) {
    await queryInterface.addColumn(table, 'npsUserId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Usuário responsável no momento da captura do NPS'
    });
  }
};

export const down = async (queryInterface) => {
  const table = 'tickets';
  const def = await queryInterface.describeTable(table);
  if (def.npsUserId) {
    await queryInterface.removeColumn(table, 'npsUserId');
  }
};
