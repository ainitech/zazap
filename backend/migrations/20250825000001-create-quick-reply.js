export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('QuickReplies', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: { type: Sequelize.STRING, allowNull: false },
      shortcut: { type: Sequelize.STRING, allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: true },
      mediaType: {
        type: Sequelize.ENUM('text', 'image', 'audio', 'video', 'document'),
        allowNull: false,
        defaultValue: 'text',
      },
      mediaUrl: { type: Sequelize.STRING, allowNull: true },
      fileName: { type: Sequelize.STRING, allowNull: true },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      usageCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      variables: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('QuickReplies', ['userId']);
    await queryInterface.addIndex('QuickReplies', ['shortcut']);
    await queryInterface.addIndex('QuickReplies', ['userId', 'shortcut'], {
      unique: true,
      name: 'unique_user_shortcut',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('QuickReplies');
    if (queryInterface.sequelize.getDialect && queryInterface.sequelize.getDialect() === 'postgres') {
      const dropEnum = 'DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = \'enum_QuickReplies_mediaType\') THEN DROP TYPE "enum_QuickReplies_mediaType"; END IF; END $$;';
      await queryInterface.sequelize.query(dropEnum);
    }
  },
};
