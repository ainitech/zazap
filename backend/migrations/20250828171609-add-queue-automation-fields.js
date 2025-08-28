export default {
  up: async (queryInterface, Sequelize) => {
    // Adicionar campos de automação na tabela queues
    await queryInterface.addColumn('queues', 'autoAssignment', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Se deve fazer atribuição automática de usuários'
    });

    await queryInterface.addColumn('queues', 'autoReply', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Se deve enviar resposta automática'
    });

    await queryInterface.addColumn('queues', 'autoClose', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Se deve fechar ticket automaticamente por inatividade'
    });

    await queryInterface.addColumn('queues', 'autoCloseTime', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Tempo em minutos para fechamento automático'
    });

    await queryInterface.addColumn('queues', 'feedbackCollection', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Se deve coletar feedback do cliente'
    });

    await queryInterface.addColumn('queues', 'feedbackMessage', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Mensagem para coleta de feedback'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remover campos de automação da tabela queues
    await queryInterface.removeColumn('queues', 'autoAssignment');
    await queryInterface.removeColumn('queues', 'autoReply');
    await queryInterface.removeColumn('queues', 'autoClose');
    await queryInterface.removeColumn('queues', 'autoCloseTime');
    await queryInterface.removeColumn('queues', 'feedbackCollection');
    await queryInterface.removeColumn('queues', 'feedbackMessage');
  }
};
