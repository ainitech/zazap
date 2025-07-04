import dotenv from 'dotenv';
dotenv.config();

console.log('🔧 Verificando variáveis de ambiente:');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS:', process.env.DB_PASS ? '***DEFINIDA***' : 'NÃO DEFINIDA');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);

// Teste de conexão com as configurações carregadas
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: console.log,
  }
);

async function testConnection() {
  try {
    console.log('🔍 Testando conexão Sequelize...');
    await sequelize.authenticate();
    console.log('✅ Conexão Sequelize estabelecida com sucesso!');
    await sequelize.close();
  } catch (error) {
    console.error('💥 Erro na conexão Sequelize:', error.message);
    console.error('Configuração usada:', {
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT
    });
  }
}

testConnection();
