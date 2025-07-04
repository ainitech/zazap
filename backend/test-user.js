import { User } from './models/index.js';
import bcrypt from 'bcryptjs';

async function testDatabaseUser() {
  try {
    console.log('🔍 Testando conexão com o banco...');
    
    // Verificar se consegue listar usuários
    const users = await User.findAll();
    console.log(`📊 Usuários encontrados: ${users.length}`);
    
    // Verificar se o usuário admin existe
    const admin = await User.findOne({ where: { email: 'admin@test.com' } });
    if (admin) {
      console.log(`👤 Usuário admin encontrado: ${admin.name}`);
      
      // Testar a senha
      const isValidPassword = await bcrypt.compare('123456', admin.password);
      console.log(`🔐 Senha válida: ${isValidPassword}`);
    } else {
      console.log('❌ Usuário admin não encontrado, criando...');
      
      const hashedPassword = await bcrypt.hash('123456', 10);
      const newAdmin = await User.create({
        name: 'Administrador',
        email: 'admin@test.com',
        password: hashedPassword
      });
      console.log(`✅ Usuário admin criado: ${newAdmin.name}`);
    }
    
    console.log('🎉 Teste concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testDatabaseUser();
