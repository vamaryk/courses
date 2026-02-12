import pool from './/db.js';

console.log('🧪 Тестирование подключения к базе данных...');

pool.query('SELECT COUNT(*) FROM profiles', (err, res) => {
  if (err) {
    console.error('❌ Ошибка подключения к таблице profiles:', err);
  } else {
    console.log('✅ Таблица profiles доступна, количество записей:', res.rows[0].count);
  }

  pool.query('SELECT COUNT(*) FROM calendar_events', (err2, res2) => {
    if (err2) {
      console.error('❌ Ошибка подключения к таблице calendar_events:', err2);
    } else {
      console.log('✅ Таблица calendar_events доступна, количество записей:', res2.rows[0].count);
    }

    pool.end(() => {
      console.log('🔌 Подключение к БД закрыто');
    });
  });
});
