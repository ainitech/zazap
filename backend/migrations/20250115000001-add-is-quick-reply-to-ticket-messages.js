export default {
  up: async (queryInterface, Sequelize) => {
    // Se a tabela ainda não existir (migrações futuras), apenas sair sem erro
    try {
      const table = await queryInterface.describeTable('ticket_messages');
      if (!table.isQuickReply) {
        await queryInterface.addColumn('ticket_messages', 'isQuickReply', {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: 'Indica se a mensagem foi enviada via Quick Reply'
        });
      }
    } catch (err) {
      // Tabela não existe ainda; ignorar esta migração por enquanto
      return;
    }
  },
  down: async (queryInterface) => {
    try {
      const table = await queryInterface.describeTable('ticket_messages');
      if (table.isQuickReply) {
        await queryInterface.removeColumn('ticket_messages', 'isQuickReply');
      }
    } catch (err) {
      // Tabela não existe; nada a desfazer
      return;
    }
  }
};
