export const up = async (queryInterface, Sequelize) => {
  // Create campaigns table
  await queryInterface.createTable('campaigns', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: Sequelize.STRING(200),
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    mediaUrl: {
      type: Sequelize.STRING,
      allowNull: true
    },
    mediaType: {
      type: Sequelize.ENUM('image', 'video', 'audio', 'document'),
      allowNull: true
    },
    status: {
      type: Sequelize.ENUM('draft', 'scheduled', 'sending', 'completed', 'paused', 'failed'),
      allowNull: false,
      defaultValue: 'draft'
    },
    segmentationType: {
      type: Sequelize.ENUM('all', 'tags', 'manual'),
      allowNull: false,
      defaultValue: 'all'
    },
    tagIds: {
      type: Sequelize.JSON,
      allowNull: true
    },
    contactIds: {
      type: Sequelize.JSON,
      allowNull: true
    },
    scheduledAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    sentAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    completedAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    totalContacts: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    sentCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    deliveredCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    failedCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    readCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    intervalSeconds: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    sessionId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'sessions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    createdBy: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
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

  // Create campaign_messages table
  await queryInterface.createTable('campaign_messages', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    campaignId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'campaigns',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    contactId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'contacts',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    phoneNumber: {
      type: Sequelize.STRING,
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('pending', 'sending', 'sent', 'delivered', 'read', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    messageId: {
      type: Sequelize.STRING,
      allowNull: true
    },
    sentAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    deliveredAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    readAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    failedAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    errorMessage: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    retryCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    scheduledFor: {
      type: Sequelize.DATE,
      allowNull: true
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
  await queryInterface.addIndex('campaigns', ['status'], {
    name: 'campaigns_status_index'
  });
  
  await queryInterface.addIndex('campaigns', ['scheduledAt'], {
    name: 'campaigns_scheduled_at_index'
  });
  
  await queryInterface.addIndex('campaigns', ['sessionId'], {
    name: 'campaigns_session_id_index'
  });
  
  await queryInterface.addIndex('campaigns', ['createdBy'], {
    name: 'campaigns_created_by_index'
  });
  
  await queryInterface.addIndex('campaigns', ['isActive'], {
    name: 'campaigns_is_active_index'
  });

  await queryInterface.addIndex('campaign_messages', ['campaignId'], {
    name: 'campaign_messages_campaign_id_index'
  });
  
  await queryInterface.addIndex('campaign_messages', ['contactId'], {
    name: 'campaign_messages_contact_id_index'
  });
  
  await queryInterface.addIndex('campaign_messages', ['status'], {
    name: 'campaign_messages_status_index'
  });
  
  await queryInterface.addIndex('campaign_messages', ['scheduledFor'], {
    name: 'campaign_messages_scheduled_for_index'
  });
  
  await queryInterface.addIndex('campaign_messages', ['phoneNumber'], {
    name: 'campaign_messages_phone_number_index'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Drop indexes first
  await queryInterface.removeIndex('campaign_messages', 'campaign_messages_phone_number_index');
  await queryInterface.removeIndex('campaign_messages', 'campaign_messages_scheduled_for_index');
  await queryInterface.removeIndex('campaign_messages', 'campaign_messages_status_index');
  await queryInterface.removeIndex('campaign_messages', 'campaign_messages_contact_id_index');
  await queryInterface.removeIndex('campaign_messages', 'campaign_messages_campaign_id_index');
  
  await queryInterface.removeIndex('campaigns', 'campaigns_is_active_index');
  await queryInterface.removeIndex('campaigns', 'campaigns_created_by_index');
  await queryInterface.removeIndex('campaigns', 'campaigns_session_id_index');
  await queryInterface.removeIndex('campaigns', 'campaigns_scheduled_at_index');
  await queryInterface.removeIndex('campaigns', 'campaigns_status_index');

  // Drop tables
  await queryInterface.dropTable('campaign_messages');
  await queryInterface.dropTable('campaigns');
};
