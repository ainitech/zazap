import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'zazap2',
  password: '99480231a',
  port: 5432,
});

console.log('Tentando conectar ao PostgreSQL...');

try {
  await client.connect();
  console.log('✅ Conexão com PostgreSQL estabelecida com sucesso!');
  
  const result = await client.query('SELECT version()');
  console.log('Versão do PostgreSQL:', result.rows[0].version);
  
  await client.end();
  console.log('Conexão fechada.');
} catch (err) {
  console.error('❌ Erro ao conectar:', err.message);
  console.error('Detalhes:', err);
}
