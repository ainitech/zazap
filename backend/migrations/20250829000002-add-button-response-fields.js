export const up = async (queryInterface, Sequelize) => {
  // Adicionar campos de resposta de botão à tabela ticket_messages se não existirem
  const tableDescription = await queryInterface.describeTable('ticket_messages');
  
  if (!tableDescription.buttonId) {
    await queryInterface.addColumn('ticket_messages', 'buttonId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'ID do botão clicado (para respostas de botões interativos)'
    });
  }
  
  if (!tableDescription.listId) {
    await queryInterface.addColumn('ticket_messages', 'listId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'ID do item da lista clicado (para respostas de listas)'
    });
  }
  
  if (!tableDescription.buttonDescription) {
    await queryInterface.addColumn('ticket_messages', 'buttonDescription', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Descrição adicional do botão/item clicado'
    });
  }
};

export const down = async (queryInterface, Sequelize) => {
  // Remover campos de resposta de botão da tabela ticket_messages
  const tableDescription = await queryInterface.describeTable('ticket_messages');
  
  if (tableDescription.buttonId) {
    await queryInterface.removeColumn('ticket_messages', 'buttonId');
  }
  
  if (tableDescription.listId) {
    await queryInterface.removeColumn('ticket_messages', 'listId');
  }
  
  if (tableDescription.buttonDescription) {
    await queryInterface.removeColumn('ticket_messages', 'buttonDescription');
  }
};
