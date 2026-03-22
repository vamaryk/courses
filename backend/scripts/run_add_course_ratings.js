/**
 * Запуск миграции add_course_ratings.sql (таблица course_ratings).
 * Использует переменные из backend/.env: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const sqlPath = path.join(__dirname, '..', 'sql_bases', 'add_course_ratings.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Migration add_course_ratings.sql applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
