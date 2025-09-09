export const up = async (queryInterface, Sequelize) => {
  const table = 'sessions';
  const def = await queryInterface.describeTable(table);
  if (!def.importAllChats) {
    await queryInterface.addColumn(table, 'importAllChats', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Importar todos os chats ao conectar (Baileys)'
    });
  }
};

export const down = async (queryInterface) => {
  const table = 'sessions';
  const def = await queryInterface.describeTable(table);
  if (def.importAllChats) {
    await queryInterface.removeColumn(table, 'importAllChats');
  }
};
