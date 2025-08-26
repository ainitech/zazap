"use strict";

export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn('tickets', 'sessionId', {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: {
      model: 'sessions',
      key: 'id'
    }
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.changeColumn('tickets', 'sessionId', {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: 'sessions',
      key: 'id'
    }
  });
}
