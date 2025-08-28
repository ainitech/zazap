export default {
  up: async (queryInterface, Sequelize) => {
    // Adicionar campo isActive à tabela queues
    await queryInterface.addColumn('queues', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Indica se a fila está ativa'
    });

    // Adicionar campo archivedAt à tabela queues
    await queryInterface.addColumn('queues', 'archivedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Data em que a fila foi arquivada'
    });

    // Adicionar campo outOfHoursMessage à tabela queues
    await queryInterface.addColumn('queues', 'outOfHoursMessage', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Mensagem fora do horário de expediente'
    });

    // Adicionar índices para melhor performance
    await queryInterface.addIndex('queues', ['isActive'], {
      name: 'queues_is_active_index'
    });
  },

  down: async (queryInterface) => {
    // Remover índices
    await queryInterface.removeIndex('queues', 'queues_is_active_index');

    // Remover campos adicionados
    await queryInterface.removeColumn('queues', 'outOfHoursMessage');
    await queryInterface.removeColumn('queues', 'archivedAt');
    await queryInterface.removeColumn('queues', 'isActive');
  }
};
