export const up = async (queryInterface, Sequelize) => {
  // Adicionar campos para informações de grupo nas mensagens
  await queryInterface.addColumn('ticket_messages', 'groupName', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'Nome do grupo (se a mensagem veio de um grupo)'
  });

  await queryInterface.addColumn('ticket_messages', 'participantName', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'Nome do participante que enviou a mensagem (em grupos)'
  });

  await queryInterface.addColumn('ticket_messages', 'participantId', {
    type: Sequelize.STRING,
    allowNull: true,
    comment: 'ID do participante que enviou a mensagem (em grupos)'
  });

  await queryInterface.addColumn('ticket_messages', 'isFromGroup', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica se a mensagem veio de um grupo'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Remover os campos adicionados
  await queryInterface.removeColumn('ticket_messages', 'groupName');
  await queryInterface.removeColumn('ticket_messages', 'participantName');
  await queryInterface.removeColumn('ticket_messages', 'participantId');
  await queryInterface.removeColumn('ticket_messages', 'isFromGroup');
};
