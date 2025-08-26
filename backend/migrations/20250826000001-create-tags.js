export const up = async (queryInterface, Sequelize) => {
    // Create tags table
    await queryInterface.createTable('tags', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      color: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'bg-blue-500'
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      usageCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create ticket_tags table (junction table)
    await queryInterface.createTable('ticket_tags', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      ticketId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tickets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tagId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tags',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      addedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      addedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('tags', ['name'], {
      unique: true,
      name: 'tags_name_unique'
    });
    
    await queryInterface.addIndex('tags', ['category'], {
      name: 'tags_category_index'
    });
    
    await queryInterface.addIndex('tags', ['priority'], {
      name: 'tags_priority_index'
    });
    
    await queryInterface.addIndex('tags', ['isActive'], {
      name: 'tags_is_active_index'
    });
    
    await queryInterface.addIndex('tags', ['createdBy'], {
      name: 'tags_created_by_index'
    });

    await queryInterface.addIndex('ticket_tags', ['ticketId', 'tagId'], {
      unique: true,
      name: 'ticket_tags_ticket_tag_unique'
    });
    
    await queryInterface.addIndex('ticket_tags', ['ticketId'], {
      name: 'ticket_tags_ticket_id_index'
    });
    
    await queryInterface.addIndex('ticket_tags', ['tagId'], {
      name: 'ticket_tags_tag_id_index'
    });
    
    await queryInterface.addIndex('ticket_tags', ['addedBy'], {
      name: 'ticket_tags_added_by_index'
    });

    // Insert some default tags
    await queryInterface.bulkInsert('tags', [
      {
        name: 'Cliente Novo',
        description: 'Primeiro contato do cliente',
        color: 'bg-green-500',
        category: 'Status',
        priority: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Suporte Técnico',
        description: 'Questões técnicas e problemas',
        color: 'bg-blue-500',
        category: 'Departamento',
        priority: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Financeiro',
        description: 'Questões relacionadas a pagamentos e cobranças',
        color: 'bg-yellow-500',
        category: 'Departamento',
        priority: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Venda Concluída',
        description: 'Cliente realizou uma compra',
        color: 'bg-purple-500',
        category: 'Status',
        priority: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Urgente',
        description: 'Atendimento prioritário necessário',
        color: 'bg-red-500',
        category: 'Prioridade',
        priority: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'VIP',
        description: 'Cliente VIP com atendimento especial',
        color: 'bg-pink-500',
        category: 'Tipo Cliente',
        priority: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Follow-up',
        description: 'Necessita acompanhamento posterior',
        color: 'bg-orange-500',
        category: 'Ação',
        priority: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Reclamação',
        description: 'Cliente insatisfeito ou com problema',
        color: 'bg-gray-500',
        category: 'Tipo',
        priority: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Dúvida',
        description: 'Esclarecimentos sobre produtos ou serviços',
        color: 'bg-indigo-500',
        category: 'Tipo',
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Interessado',
        description: 'Prospect interessado em produtos/serviços',
        color: 'bg-teal-500',
        category: 'Status',
        priority: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
};

export const down = async (queryInterface, Sequelize) => {
    // Drop indexes first
    await queryInterface.removeIndex('ticket_tags', 'ticket_tags_added_by_index');
    await queryInterface.removeIndex('ticket_tags', 'ticket_tags_tag_id_index');
    await queryInterface.removeIndex('ticket_tags', 'ticket_tags_ticket_id_index');
    await queryInterface.removeIndex('ticket_tags', 'ticket_tags_ticket_tag_unique');
    
    await queryInterface.removeIndex('tags', 'tags_created_by_index');
    await queryInterface.removeIndex('tags', 'tags_is_active_index');
    await queryInterface.removeIndex('tags', 'tags_priority_index');
    await queryInterface.removeIndex('tags', 'tags_category_index');
    await queryInterface.removeIndex('tags', 'tags_name_unique');

    // Drop tables
    await queryInterface.dropTable('ticket_tags');
    await queryInterface.dropTable('tags');
};
