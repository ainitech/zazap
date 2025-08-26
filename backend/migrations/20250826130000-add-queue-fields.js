"use strict";

// Make this migration idempotent by checking existing columns
export default {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('queues');

    if (!table.color) {
      await queryInterface.addColumn('queues', 'color', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '#0420BF',
        comment: 'Cor da fila em hexadecimal'
      });
    }

    if (!table.botOrder) {
      await queryInterface.addColumn('queues', 'botOrder', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Ordem da fila no bot'
      });
    }

    if (!table.closeTicket) {
      await queryInterface.addColumn('queues', 'closeTicket', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Se deve fechar ticket automaticamente'
      });
    }

    if (!table.rotation) {
      await queryInterface.addColumn('queues', 'rotation', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'round-robin',
        comment: 'Configuração de rodízio (round-robin, random, fifo)'
      });
    }

    if (!table.integration) {
      await queryInterface.addColumn('queues', 'integration', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Tipo de integração'
      });
    }

    if (!table.fileList) {
      await queryInterface.addColumn('queues', 'fileList', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Lista de arquivos da fila'
      });
    }

    if (!table.greetingMessage) {
      await queryInterface.addColumn('queues', 'greetingMessage', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Mensagem de saudação da fila'
      });
    }

    if (!table.options) {
      await queryInterface.addColumn('queues', 'options', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Opções adicionais da fila'
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('queues');

    // Remove only if exists, in reverse order
    if (table.options) await queryInterface.removeColumn('queues', 'options');
    if (table.greetingMessage) await queryInterface.removeColumn('queues', 'greetingMessage');
    if (table.fileList) await queryInterface.removeColumn('queues', 'fileList');
    if (table.integration) await queryInterface.removeColumn('queues', 'integration');
    if (table.rotation) await queryInterface.removeColumn('queues', 'rotation');
    if (table.closeTicket) await queryInterface.removeColumn('queues', 'closeTicket');
    if (table.botOrder) await queryInterface.removeColumn('queues', 'botOrder');
    if (table.color) await queryInterface.removeColumn('queues', 'color');
  }
};
