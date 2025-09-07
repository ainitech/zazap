'use strict';

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('refresh_tokens', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    token: {
      type: Sequelize.STRING(500),
      allowNull: false,
      unique: true
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: false
    },
    revoked: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    userAgent: {
      type: Sequelize.STRING(500),
      allowNull: true
    },
    ipAddress: {
      type: Sequelize.STRING(45),
      allowNull: true
    },
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE
    }
  });

  // Adicionar índices para performance
  await queryInterface.addIndex('refresh_tokens', ['userId']);
  await queryInterface.addIndex('refresh_tokens', ['token']);
  await queryInterface.addIndex('refresh_tokens', ['expiresAt']);
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable('refresh_tokens');
};
