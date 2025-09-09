export const up = async (queryInterface, Sequelize) => {
  const table = 'tickets';
  const tableDef = await queryInterface.describeTable(table);
  if (!tableDef.protocol) {
    await queryInterface.addColumn(table, 'protocol', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
      comment: 'Número de protocolo gerado ao fechar o ticket'
    });
  }
};

export const down = async (queryInterface) => {
  const table = 'tickets';
  const tableDef = await queryInterface.describeTable(table);
  if (tableDef.protocol) {
    await queryInterface.removeColumn(table, 'protocol');
  }
};
