import pool from '../db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const userId = 'e242f96d-13c1-4e06-bfc2-ef0640640a1b';

async function testAchievementsQuery() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Тестирование запроса достижений...');
    console.log('👤 User ID:', userId);
    
    // Проверяем существование таблиц
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_achievements', 'achievements')
    `);
    
    console.log('📊 Найденные таблицы:', tablesCheck.rows.map(r => r.table_name));
    
    if (tablesCheck.rows.length < 2) {
      console.error('❌ Не все таблицы существуют!');
      return;
    }
    
    // Проверяем структуру таблицы user_achievements
    const columnsCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_achievements'
    `);
    
    console.log('📋 Колонки user_achievements:', columnsCheck.rows);
    
    // Выполняем тестовый запрос
    const result = await client.query(
      `SELECT 
        a.id,
        a.name,
        a.description,
        a.icon_url,
        ua.unlocked_at
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1::uuid
      ORDER BY ua.unlocked_at DESC`,
      [userId]
    );
    
    console.log('✅ Запрос выполнен успешно!');
    console.log('📊 Найдено достижений:', result.rows.length);
    console.log('📋 Данные:', JSON.stringify(result.rows, null, 2));
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('📋 Детали:', error);
    console.error('🔍 Код ошибки:', error.code);
    console.error('💡 Подсказка:', error.hint);
  } finally {
    client.release();
    await pool.end();
  }
}

testAchievementsQuery();
