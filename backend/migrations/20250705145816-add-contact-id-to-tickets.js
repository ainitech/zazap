export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("tickets", "contactId", {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: {
      model: "contacts",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });

  // Add index for better performance
  await queryInterface.addIndex("tickets", ["contactId"]);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeIndex("tickets", ["contactId"]);
  await queryInterface.removeColumn("tickets", "contactId");
}