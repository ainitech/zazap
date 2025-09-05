'use strict';

export default {
  async up(queryInterface, Sequelize) {
    // Verificar se a coluna já existe
    const tableDescription = await queryInterface.describeTable('tickets');

    if (!tableDescription.uid) {
      try {
        // Adicionar coluna uid permitindo nulos inicialmente (sem constraint unique)
        await queryInterface.addColumn('tickets', 'uid', {
          type: Sequelize.UUID,
          allowNull: true,
          comment: 'UID único para acesso direto ao ticket via link'
        });

        // Gerar UIDs para todos os tickets existentes usando SQL puro
        await queryInterface.sequelize.query(`
          UPDATE tickets
          SET uid = gen_random_uuid()
          WHERE uid IS NULL
        `);

        // Agora alterar a coluna para não permitir nulos
        await queryInterface.changeColumn('tickets', 'uid', {
          type: Sequelize.UUID,
          allowNull: false,
          comment: 'UID único para acesso direto ao ticket via link'
        });

        // Criar índice único para melhor performance nas consultas por UID
        await queryInterface.addIndex('tickets', ['uid'], {
          name: 'tickets_uid_unique_index',
          unique: true
        });

        console.log('Coluna uid adicionada com sucesso à tabela tickets');
      } catch (error) {
        console.error('Erro ao adicionar coluna uid:', error);
        throw error;
      }
    } else {
      console.log('Coluna uid já existe na tabela tickets');
    }
  },

  async down(queryInterface, Sequelize) {
    // Verificar se a coluna existe antes de tentar remover
    const tableDescription = await queryInterface.describeTable('tickets');

    if (tableDescription.uid) {
      try {
        // Remover índice se existir
        await queryInterface.removeIndex('tickets', 'tickets_uid_unique_index');
      } catch (error) {
        console.log('Índice tickets_uid_unique_index não encontrado ou já removido');
      }

      // Remover coluna uid
      await queryInterface.removeColumn('tickets', 'uid');
      console.log('Coluna uid removida da tabela tickets');
    } else {
      console.log('Coluna uid não existe na tabela tickets');
    }
  }
};