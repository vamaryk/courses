import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// Скрипт для очистки тестовых данных
async function cleanupTestData() {
  console.log('🧹 Очистка тестовых данных...\n');

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

    // Удаляем тестовых пользователей
    console.log('🗑️ Удаление тестовых пользователей...');
    const deleteUsersResult = await client.query(
      "DELETE FROM users WHERE email LIKE 'calendar_test_%@example.com'"
    );
    console.log(`✅ Удалено пользователей: ${deleteUsersResult.rowCount}`);

    // Удаляем связанные записи в profiles
    console.log('🗑️ Удаление профилей тестовых пользователей...');
    const deleteProfilesResult = await client.query(
      "DELETE FROM profiles WHERE full_name = 'Calendar Test User'"
    );
    console.log(`✅ Удалено профилей: ${deleteProfilesResult.rowCount}`);

    // Удаляем тестовые события календаря
    console.log('🗑️ Удаление тестовых событий календаря...');
    const deleteEventsResult = await client.query(
      "DELETE FROM calendar_events WHERE title LIKE 'Тестовая задача календаря%'"
    );
    console.log(`✅ Удалено событий календаря: ${deleteEventsResult.rowCount}`);

    // Удаляем тестовые сессии
    console.log('🗑️ Удаление тестовых сессий...');
    const deleteSessionsResult = await client.query(
      "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'calendar_test_%@example.com')"
    );
    console.log(`✅ Удалено сессий: ${deleteSessionsResult.rowCount}`);

    client.release();
    console.log('\n🎉 Очистка завершена!');

  } catch (error) {
    console.error('❌ Ошибка при очистке:', error.message);
  } finally {
    await pool.end();
  }
}

// Запуск очистки
cleanupTestData();
