'use strict';

// Migration in ESM format with default export, matching the project's pattern
export default {
  up: async (queryInterface, Sequelize) => {
    // Describe current table to make this idempotent and safe
    const def = await queryInterface.describeTable('queues');

    // 1) Add a temporary string column if not exists
    if (!def['rotation_tmp']) {
      await queryInterface.addColumn('queues', 'rotation_tmp', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'round-robin',
        comment: 'Tipo de rotação da fila (round-robin, sequential, random)'
      });
    }

    // 2) Copy and map existing values safely
    // If original column is integer, compare as integers; if string, compare as strings
    const isInteger = def['rotation'] && String(def['rotation'].type || '').toLowerCase().includes('int');
    if (isInteger) {
      await queryInterface.sequelize.query(`
        UPDATE "queues"
        SET "rotation_tmp" = CASE 
          WHEN "rotation" = 0 THEN 'round-robin'
          WHEN "rotation" = 1 THEN 'sequential'
          WHEN "rotation" = 2 THEN 'random'
          ELSE 'round-robin'
        END
      `);
    } else {
      // treat as string; also handle numeric strings via regex
      await queryInterface.sequelize.query(`
        UPDATE "queues"
        SET "rotation_tmp" = CASE 
          WHEN ("rotation" = 'round-robin' OR "rotation" ~ '^(0)$') THEN 'round-robin'
          WHEN ("rotation" = 'sequential' OR "rotation" ~ '^(1)$') THEN 'sequential'
          WHEN ("rotation" = 'random' OR "rotation" ~ '^(2)$') THEN 'random'
          ELSE 'round-robin'
        END
      `);
    }

    // 3) Drop the old rotation column if exists
    if (def['rotation']) {
      // Some dialects require try-catch; if fails, ignore
      try { await queryInterface.removeColumn('queues', 'rotation'); } catch (e) {}
    }

    // 4) Rename tmp column to the original name (if not already renamed)
    const def2 = await queryInterface.describeTable('queues');
    if (def2['rotation_tmp'] && !def2['rotation']) {
      await queryInterface.renameColumn('queues', 'rotation_tmp', 'rotation');
    }

    // 5) Ensure default/comment after rename
    await queryInterface.changeColumn('queues', 'rotation', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'round-robin',
      comment: 'Tipo de rotação da fila (round-robin, sequential, random)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse: create an integer column, map back, drop string, rename
    await queryInterface.addColumn('queues', 'rotation_old', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Configuração de rodízio (0=round-robin, 1=sequential, 2=random)'
    });

    await queryInterface.sequelize.query(`
      UPDATE "queues"
      SET "rotation_old" = CASE 
        WHEN "rotation" = 'round-robin' THEN 0
        WHEN "rotation" = 'sequential' THEN 1
        WHEN "rotation" = 'random' THEN 2
        ELSE 0
      END
    `);

    await queryInterface.removeColumn('queues', 'rotation');
    await queryInterface.renameColumn('queues', 'rotation_old', 'rotation');

    // Ensure integer default after rename
    await queryInterface.changeColumn('queues', 'rotation', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Configuração de rodízio'
    });
  }
};
