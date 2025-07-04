import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'zazap2',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || '99480231a',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export default sequelize;
