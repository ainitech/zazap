export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('settings', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      type: {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'json', 'file'),
        allowNull: false,
        defaultValue: 'string',
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'general',
      },
      isPublic: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Adicionar índices
    await queryInterface.addIndex('settings', ['key']);
    await queryInterface.addIndex('settings', ['category']);

    // Inserir configurações padrão
    await queryInterface.bulkInsert('settings', [
      {
        key: 'system_logo',
        value: '',
        type: 'file',
        description: 'Logo da empresa/sistema',
        category: 'appearance',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'company_name',
        value: 'Zazap',
        type: 'string',
        description: 'Nome da empresa',
        category: 'general',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'system_title',
        value: 'Zazap - Sistema de Atendimento',
        type: 'string',
        description: 'Título do sistema',
        category: 'appearance',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'primary_color',
        value: '#eab308',
        type: 'string',
        description: 'Cor primária do sistema',
        category: 'appearance',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'chat_attendant_intro_template',
        value: 'Olá! Meu nome é {nome} e vou continuar seu atendimento. Como posso ajudar?',
        type: 'string',
        description: 'Template de apresentação do atendente ({nome})',
        category: 'chat',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'chat_protocol_enabled',
        value: 'true',
        type: 'string',
        description: 'Habilita geração de protocolo ao fechar ticket',
        category: 'chat',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'chat_farewell_template',
        value: 'Atendimento encerrado.{protocoloParte}',
        type: 'string',
        description: 'Template de despedida ({protocolo} / {protocoloParte})',
        category: 'chat',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'chat_nps_enabled',
        value: 'true',
        type: 'string',
        description: 'Coletar NPS ao fechar ticket',
        category: 'chat',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'chat_nps_request_template',
        value: 'Sua opinião é muito importante! Responda com uma nota de 0 a 10: quanto você recomendaria nosso atendimento?',
        type: 'string',
        description: 'Template da pergunta de NPS',
        category: 'chat',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('settings');
  },
};
