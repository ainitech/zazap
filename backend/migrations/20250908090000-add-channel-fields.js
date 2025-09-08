/**
 * Adiciona campo channel em sessions, tickets e ticket_messages
 */
export default {
  up: async (queryInterface, Sequelize) => {
    // sessions.channel
    const tableDescSessions = await queryInterface.describeTable('sessions');
    if (!tableDescSessions.channel) {
      await queryInterface.addColumn('sessions', 'channel', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'whatsapp',
        comment: 'Canal / plataforma da sessão (whatsapp, instagram, facebook)'
      });
    }

    // tickets.channel
    const tableDescTickets = await queryInterface.describeTable('tickets');
    if (!tableDescTickets.channel) {
      await queryInterface.addColumn('tickets', 'channel', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'whatsapp',
        comment: 'Canal de origem da conversa (whatsapp, instagram, facebook)'
      });
    }

    // ticket_messages.channel
    const tableDescTicketMessages = await queryInterface.describeTable('ticket_messages');
    if (!tableDescTicketMessages.channel) {
      await queryInterface.addColumn('ticket_messages', 'channel', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'whatsapp',
        comment: 'Canal da mensagem (whatsapp, instagram, facebook)'
      });
    }
  },

  down: async (queryInterface) => {
    // Remover colunas se existirem
    const tableDescSessions = await queryInterface.describeTable('sessions');
    if (tableDescSessions.channel) {
      await queryInterface.removeColumn('sessions', 'channel');
    }
    const tableDescTickets = await queryInterface.describeTable('tickets');
    if (tableDescTickets.channel) {
      await queryInterface.removeColumn('tickets', 'channel');
    }
    const tableDescTicketMessages = await queryInterface.describeTable('ticket_messages');
    if (tableDescTicketMessages.channel) {
      await queryInterface.removeColumn('ticket_messages', 'channel');
    }
  }
};
