import bcrypt from 'bcryptjs';

export default {
  async up(queryInterface, Sequelize) {
    // Verificar se já existe um usuário admin
    const existingAdmin = await queryInterface.sequelize.query(
      'SELECT id, role FROM users WHERE email = :email',
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
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }], {});
    } else {
      // Se o usuário existe mas não tem role definido, atualizar
      const adminUser = existingAdmin[0];
      if (!adminUser.role) {
        await queryInterface.sequelize.query(
          'UPDATE users SET role = :role, isActive = :isActive WHERE id = :id',
          {
            replacements: { 
              role: 'admin', 
              isActive: true, 
              id: adminUser.id 
            },
            type: Sequelize.QueryTypes.UPDATE
          }
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      email: 'admin@zazap.com'
    }, {});
  }
};
