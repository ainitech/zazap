'use strict';

export default {
  async up(queryInterface, Sequelize) {
    try {
      // Verificar se a coluna já existe
      const tableDescription = await queryInterface.describeTable('tickets');

      if (!tableDescription.uid) {
        console.log('Adicionando coluna uid à tabela tickets...');
        
        // Adicionar coluna uid (sem constraints inicialmente)
        await queryInterface.addColumn('tickets', 'uid', {
          type: Sequelize.UUID,
          allowNull: true
        });

        // Gerar UIDs para registros existentes
        await queryInterface.sequelize.query(
          "UPDATE tickets SET uid = gen_random_uuid() WHERE uid IS NULL"
        );

        // Alterar coluna para NOT NULL
        await queryInterface.sequelize.query(
          "ALTER TABLE tickets ALTER COLUMN uid SET NOT NULL"
        );

        // Adicionar constraint UNIQUE
        await queryInterface.sequelize.query(
          "ALTER TABLE tickets ADD CONSTRAINT tickets_uid_unique UNIQUE (uid)"
        );

        console.log('Coluna uid adicionada com sucesso');
      } else {
        console.log('Coluna uid já existe');
      }
    } catch (error) {
      console.error('Erro na migration:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      const tableDescription = await queryInterface.describeTable('tickets');

      if (tableDescription.uid) {
        console.log('Removendo coluna uid da tabela tickets...');
        
        // Remover constraint unique
        await queryInterface.sequelize.query(
          "ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_uid_unique"
        );
        
        // Remover coluna
        await queryInterface.removeColumn('tickets', 'uid');
        
        console.log('Coluna uid removida com sucesso');
      }
    } catch (error) {
      console.error('Erro no rollback:', error);
      throw error;
    }
  }
};
