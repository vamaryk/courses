import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

module.exports = {
  databaseUrl: {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  },
  migrationsTable: 'pgmigrations', // Таблица для отслеживания примененных миграций
  dir: 'backend/migrations', // Директория для файлов миграций
  direction: 'up', // Направление по умолчанию
  count: 1, // Количество миграций для применения/отката по умолчанию
  verbose: true,
  create: true,
  ignorePattern: '\\.map$',
};
