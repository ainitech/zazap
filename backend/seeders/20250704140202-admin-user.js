import bcrypt from 'bcryptjs';

export default {
  async up(queryInterface, Sequelize) {
    // Verificar se já existe um usuário admin
    const existingAdmin = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email',
      {
        replacements: { email: 'admin@zazap.com' },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    if (existingAdmin.length === 0) {
      // Hash da senha
      const hashedPassword = await bcrypt.hash('admin123', 10);

      // Criar usuário administrador
      await queryInterface.bulkInsert('users', [{
        name: 'Administrador',
        email: 'admin@zazap.com',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      }], {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      email: 'admin@zazap.com'
    }, {});
  }
};
