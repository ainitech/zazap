export default {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('tickets');
    
    // Adicionar campo queueId se não existir
    if (!tableInfo.queueId) {
      await queryInterface.addColumn('tickets', 'queueId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'queues',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    // Adicionar campo assignedUserId se não existir
    if (!tableInfo.assignedUserId) {
      await queryInterface.addColumn('tickets', 'assignedUserId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    // Adicionar campo priority se não existir
    if (!tableInfo.priority) {
      await queryInterface.addColumn('tickets', 'priority', {
        type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'normal'
      });
    }

    // Adicionar campo chatStatus se não existir
    if (!tableInfo.chatStatus) {
      await queryInterface.addColumn('tickets', 'chatStatus', {
        type: Sequelize.ENUM('waiting', 'accepted', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'waiting'
      });
    }

    // Adicionar campo isBot se não existir
    if (!tableInfo.isBot) {
      await queryInterface.addColumn('tickets', 'isBot', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    // Adicionar índices se as colunas existirem
    try {
      if (tableInfo.queueId || !tableInfo.queueId) {
        await queryInterface.addIndex('tickets', ['queueId'], { 
          name: 'tickets_queueId_idx',
          unique: false
        });
      }
    } catch (e) {
      console.log('Índice queueId já existe ou erro:', e.message);
    }

    try {
      if (tableInfo.assignedUserId || !tableInfo.assignedUserId) {
        await queryInterface.addIndex('tickets', ['assignedUserId'], {
          name: 'tickets_assignedUserId_idx',
          unique: false
        });
      }
    } catch (e) {
      console.log('Índice assignedUserId já existe ou erro:', e.message);
    }

    try {
      if (tableInfo.priority || !tableInfo.priority) {
        await queryInterface.addIndex('tickets', ['priority'], {
          name: 'tickets_priority_idx',
          unique: false
        });
      }
    } catch (e) {
      console.log('Índice priority já existe ou erro:', e.message);
    }

    try {
      if (tableInfo.chatStatus || !tableInfo.chatStatus) {
        await queryInterface.addIndex('tickets', ['chatStatus'], {
          name: 'tickets_chatStatus_idx',
          unique: false
        });
      }
    } catch (e) {
      console.log('Índice chatStatus já existe ou erro:', e.message);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeIndex('tickets', 'tickets_chatStatus_idx');
    } catch (e) { /* Ignorar erro se não existir */ }
    
    try {
      await queryInterface.removeIndex('tickets', 'tickets_priority_idx');
    } catch (e) { /* Ignorar erro se não existir */ }
    
    try {
      await queryInterface.removeIndex('tickets', 'tickets_assignedUserId_idx');
    } catch (e) { /* Ignorar erro se não existir */ }
    
    try {
      await queryInterface.removeIndex('tickets', 'tickets_queueId_idx');
    } catch (e) { /* Ignorar erro se não existir */ }
    
    await queryInterface.removeColumn('tickets', 'isBot');
    await queryInterface.removeColumn('tickets', 'chatStatus');
    await queryInterface.removeColumn('tickets', 'priority');
    await queryInterface.removeColumn('tickets', 'assignedUserId');
    await queryInterface.removeColumn('tickets', 'queueId');
  }
};
