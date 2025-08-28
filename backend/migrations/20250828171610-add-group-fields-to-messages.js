export const up = async (queryInterface, Sequelize) => {
    // Adicionar campos de grupo à tabela ticket_messages se não existirem
    const tableDescription = await queryInterface.describeTable('ticket_messages');
    
    if (!tableDescription.groupName) {
      await queryInterface.addColumn('ticket_messages', 'groupName', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Nome do grupo (se a mensagem veio de um grupo)'
      });
    }
    
    if (!tableDescription.participantName) {
      await queryInterface.addColumn('ticket_messages', 'participantName', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Nome do participante que enviou a mensagem (em grupos)'
      });
    }
    
    if (!tableDescription.participantId) {
      await queryInterface.addColumn('ticket_messages', 'participantId', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID do participante que enviou a mensagem (em grupos)'
      });
    }
    
    if (!tableDescription.isFromGroup) {
      await queryInterface.addColumn('ticket_messages', 'isFromGroup', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica se a mensagem veio de um grupo'
      });
    }

    // Adicionar campo isGroup à tabela contacts se não existir
    const contactsTableDescription = await queryInterface.describeTable('contacts');
    
    if (!contactsTableDescription.isGroup) {
      await queryInterface.addColumn('contacts', 'isGroup', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Se é um grupo'
      });
    }
};

export const down = async (queryInterface, Sequelize) => {
    // Remover campos de grupo da tabela ticket_messages
    const tableDescription = await queryInterface.describeTable('ticket_messages');
    
    if (tableDescription.groupName) {
      await queryInterface.removeColumn('ticket_messages', 'groupName');
    }
    
    if (tableDescription.participantName) {
      await queryInterface.removeColumn('ticket_messages', 'participantName');
    }
    
    if (tableDescription.participantId) {
      await queryInterface.removeColumn('ticket_messages', 'participantId');
    }
    
    if (tableDescription.isFromGroup) {
      await queryInterface.removeColumn('ticket_messages', 'isFromGroup');
    }

    // Remover campo isGroup da tabela contacts
    const contactsTableDescription = await queryInterface.describeTable('contacts');
    
    if (contactsTableDescription.isGroup) {
      await queryInterface.removeColumn('contacts', 'isGroup');
    }
};
