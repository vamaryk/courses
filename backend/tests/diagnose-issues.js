import http from 'http';
import pg from 'pg';

// Диагностика проблем с API календаря
async function diagnoseIssues() {
  console.log('🔍 Диагностика проблем с тестированием календаря...\n');

  // Шаг 1: Проверка подключения к серверу
  console.log('1️⃣ Проверка подключения к серверу...');
  try {
    await checkServerConnection();
  } catch (error) {
    console.log('❌ Сервер недоступен:', error.message);
    console.log('💡 Решение: Запустите сервер командой: node server.js');
    return;
  }

  // Шаг 2: Проверка подключения к базе данных
  console.log('\n2️⃣ Проверка подключения к базе данных...');
  try {
    await checkDatabaseConnection();
  } catch (error) {
    console.log('❌ Проблема с базой данных:', error.message);
    console.log('💡 Решения:');
    console.log('   - Убедитесь, что PostgreSQL запущен');
    console.log('   - Проверьте настройки подключения в .env');
    console.log('   - Выполните инициализацию БД: node init_db.js');
    return;
  }

  // Шаг 3: Проверка таблиц в базе данных
  console.log('\n3️⃣ Проверка наличия необходимых таблиц...');
  try {
    await checkDatabaseTables();
  } catch (error) {
    console.log('❌ Проблема с таблицами БД:', error.message);
    console.log('💡 Решение: Выполните SQL скрипты инициализации');
    return;
  }

  console.log('\n✅ Все проверки пройдены! Попробуйте запустить тест снова.');
  console.log('💡 Если проблема persists, проверьте логи сервера');
}

function checkServerConnection() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3002, // Исправленный порт из .env
      path: '/api/protected',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      if (res.statusCode === 401) {
        console.log('✅ Сервер отвечает (401 - авторизация требуется)');
        resolve();
      } else {
        console.log(`⚠️ Сервер отвечает с кодом ${res.statusCode}`);
        resolve();
      }
    });

    req.on('error', (err) => {
      reject(new Error(`Не удается подключиться к серверу на порту 3002: ${err.message}`));
    });

    req.on('timeout', () => {
      reject(new Error('Таймаут подключения к серверу'));
    });

    req.end();
  });
}

async function checkDatabaseConnection() {
  const { Pool } = pg;

  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Подключение к базе данных успешно');
  } catch (error) {
    throw new Error(`Ошибка подключения к БД: ${error.message}`);
  } finally {
    await pool.end();
  }
}

async function checkDatabaseTables() {
  const { Pool } = pg;

  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    const client = await pool.connect();

    // Проверяем необходимые таблицы
    const tables = ['users', 'profiles', 'sessions', 'calendar_events'];
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [table]);

      if (!result.rows[0].exists) {
        throw new Error(`Таблица '${table}' не найдена`);
      }
    }

    console.log('✅ Все необходимые таблицы существуют');
    client.release();
  } catch (error) {
    throw error;
  } finally {
    await pool.end();
  }
}

// Запуск диагностики
diagnoseIssues();
