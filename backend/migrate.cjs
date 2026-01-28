const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные окружения из .env файла в директории backend
dotenv.config({ path: path.resolve(__dirname, './.env') });

// Поддержка как DATABASE_URL, так и отдельных параметров
let databaseUrl;

if (process.env.DATABASE_URL) {
  // Используем строку подключения, если она указана
  databaseUrl = process.env.DATABASE_URL;
} else {
  // Иначе используем отдельные параметры
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST || 'localhost';
  const database = process.env.DB_NAME;
  const port = process.env.DB_PORT || 5432;
  
  if (!user || !database) {
    console.error('❌ Ошибка: DB_USER и DB_NAME должны быть указаны в .env файле');
    console.error('   Или используйте DATABASE_URL в формате: postgresql://user:password@host:port/database');
    process.exit(1);
  }
  
  // Формируем строку подключения
  databaseUrl = `postgresql://${user}${password ? ':' + password : ''}@${host}:${port}/${database}`;
}

module.exports = {
  databaseUrl: databaseUrl,
  migrationsTable: 'pgmigrations', // Таблица для отслеживания примененных миграций
  dir: 'migrations', // Директория для файлов миграций (относительно текущей директории)
  direction: 'up', // Направление по умолчанию
  count: 1, // Количество миграций для применения/отката по умолчанию
  verbose: true,
  create: true,
  ignorePattern: '\\.map$',
};
