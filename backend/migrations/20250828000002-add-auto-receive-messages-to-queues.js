export default {
  up: async (queryInterface, Sequelize) => {
    // Adicionar campo autoReceiveMessages à tabela queues
    await queryInterface.addColumn('queues', 'autoReceiveMessages', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Se a fila deve receber mensagens automaticamente'
    });
  },

  down: async (queryInterface) => {
    // Remover campo adicionado
    await queryInterface.removeColumn('queues', 'autoReceiveMessages');
  }
};
