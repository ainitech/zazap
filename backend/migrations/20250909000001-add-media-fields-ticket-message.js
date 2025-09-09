export default {
  up: async (queryInterface, Sequelize) => {
    // Adicionar campos para mídia/áudio
    await queryInterface.addColumn('ticket_messages', 'mimeType', { 
      type: Sequelize.STRING, 
      allowNull: true 
    });
    await queryInterface.addColumn('ticket_messages', 'fileSize', { 
      type: Sequelize.INTEGER, 
      allowNull: true 
    });
    await queryInterface.addColumn('ticket_messages', 'duration', { 
      type: Sequelize.INTEGER, 
      allowNull: true,
      comment: 'Duração em segundos para áudios/vídeos'
    });
    await queryInterface.addColumn('ticket_messages', 'isPtt', { 
      type: Sequelize.BOOLEAN, 
      allowNull: true, 
      defaultValue: false,
      comment: 'Se é uma nota de voz (Push-to-Talk)'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('ticket_messages', 'mimeType');
    await queryInterface.removeColumn('ticket_messages', 'fileSize');
    await queryInterface.removeColumn('ticket_messages', 'duration');
    await queryInterface.removeColumn('ticket_messages', 'isPtt');
  },
};
