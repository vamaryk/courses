import pool from '../db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const userId = 'e242f96d-13c1-4e06-bfc2-ef0640640a1b';

async function grantAchievements() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Проверяем существование пользователя
    const userCheck = await client.query(
      'SELECT id FROM profiles WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      throw new Error(`Пользователь с ID ${userId} не найден`);
    }
    
    console.log(`✅ Пользователь найден: ${userId}`);
    
    // Получаем первые 2 достижения
    const achievementsResult = await client.query(
      `SELECT id, name FROM achievements 
       WHERE name IN ('Первый шаг', 'Неделя обучения')
       ORDER BY name
       LIMIT 2`
    );
    
    if (achievementsResult.rows.length < 2) {
      throw new Error('Не найдено достаточно достижений. Убедитесь, что seed-данные загружены.');
    }
    
    const achievement1 = achievementsResult.rows[0];
    const achievement2 = achievementsResult.rows[1];
    
    console.log(`📜 Найдены достижения:`);
    console.log(`   1. ${achievement1.name} (ID: ${achievement1.id})`);
    console.log(`   2. ${achievement2.name} (ID: ${achievement2.id})`);
    
    // Выдаем достижения
    await client.query(
      `INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES
       ($1, $2, NOW()),
       ($1, $3, NOW())
       ON CONFLICT (user_id, achievement_id) DO NOTHING`,
      [userId, achievement1.id, achievement2.id]
    );
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Достижения успешно выданы пользователю ${userId}`);
    
    // Показываем результат
    const result = await client.query(
      `SELECT 
         a.name AS achievement_name,
         a.description,
         ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC`,
      [userId]
    );
    
    console.log(`\n📊 Все достижения пользователя:`);
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.achievement_name}`);
      console.log(`      Описание: ${row.description}`);
      console.log(`      Получено: ${row.unlocked_at}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

grantAchievements();
