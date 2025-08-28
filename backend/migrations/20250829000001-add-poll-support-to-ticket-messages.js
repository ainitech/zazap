export const up = async (queryInterface, Sequelize) => {
    // Adicionar campos para suporte a enquetes na tabela ticket_messages
    const tableDescription = await queryInterface.describeTable('ticket_messages');

    // Campo para tipo de mensagem (text, poll, poll_response, etc)
    if (!tableDescription.messageType) {
      await queryInterface.addColumn('ticket_messages', 'messageType', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'text',
        comment: 'Tipo da mensagem: text, poll, poll_response, etc'
      });
    }

    // Campo para armazenar dados específicos de enquete (JSON)
    if (!tableDescription.pollData) {
      await queryInterface.addColumn('ticket_messages', 'pollData', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Dados da enquete em formato JSON (pergunta, opções, etc)'
      });
    }

    // Campo para armazenar resposta de enquete (índice da opção selecionada)
    if (!tableDescription.pollResponse) {
      await queryInterface.addColumn('ticket_messages', 'pollResponse', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Índice da opção selecionada na enquete (0-based)'
      });
    }

    // Campo para relacionar resposta com mensagem de enquete original
    if (!tableDescription.pollMessageId) {
      await queryInterface.addColumn('ticket_messages', 'pollMessageId', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID da mensagem de enquete original (para respostas)'
      });
    }
};

export const down = async (queryInterface, Sequelize) => {
    // Remover campos adicionados
    const tableDescription = await queryInterface.describeTable('ticket_messages');

    if (tableDescription.pollMessageId) {
      await queryInterface.removeColumn('ticket_messages', 'pollMessageId');
    }

    if (tableDescription.pollResponse) {
      await queryInterface.removeColumn('ticket_messages', 'pollResponse');
    }

    if (tableDescription.pollData) {
      await queryInterface.removeColumn('ticket_messages', 'pollData');
    }

    if (tableDescription.messageType) {
      await queryInterface.removeColumn('ticket_messages', 'messageType');
    }
};
