import sequelize from './services/sequelize.js';
import './models/index.js';

(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
})();
